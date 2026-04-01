'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphNode, GraphEdge, GraphData, EntityType } from '@/lib/types';
import { NODE_COLORS, NODE_COLORS_DIM, EDGE_COLORS, nodeRadius, seedPosition } from '@/lib/graph-utils';

interface GraphProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeClick: (nodeId: string, type: EntityType, dbId: number) => void;
  onBackgroundClick: () => void;
  highlightNodes: Set<string>;
  visibleTypes: Set<EntityType>;
  dateRange: [string, string] | null;
}

export default function Graph({
  data, selectedNode, onNodeClick, onBackgroundClick,
  highlightNodes, visibleTypes, dateRange,
}: GraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(undefined);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize handler
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Seed initial positions
  useEffect(() => {
    for (const node of data.nodes) {
      if (node.x === undefined) {
        const pos = seedPosition(node);
        node.x = pos.x;
        node.y = pos.y;
      }
    }
  }, [data]);

  // Cool down simulation after initial render
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-20);
      fgRef.current.d3Force('link')?.distance((link: { weight?: number }) =>
        80 / Math.max(1, link.weight || 1)
      );
      // Stop simulation after 4 seconds
      setTimeout(() => fgRef.current?.cooldownTicks(0), 4000);
    }
  }, [data]);

  // Filter data based on visible types and date range
  const filteredData = useMemo(() => {
    const visibleNodeIds = new Set<string>();

    // Filter edges by date range
    let filteredEdges = data.edges;
    if (dateRange) {
      filteredEdges = data.edges.filter(e => {
        if (!e.date) return true; // edges without dates always visible
        return e.date >= dateRange[0] && e.date <= dateRange[1];
      });
    }

    // Count connections per node (from filtered edges)
    const edgeCount = new Map<string, number>();
    for (const e of filteredEdges) {
      const src = typeof e.source === 'string' ? e.source : (e.source as unknown as GraphNode).id;
      const tgt = typeof e.target === 'string' ? e.target : (e.target as unknown as GraphNode).id;
      edgeCount.set(src, (edgeCount.get(src) || 0) + 1);
      edgeCount.set(tgt, (edgeCount.get(tgt) || 0) + 1);
    }

    // Filter nodes: visible type + has at least one edge (or is selected/highlighted)
    const filteredNodes = data.nodes.filter(n => {
      if (!visibleTypes.has(n.type)) return false;
      if (highlightNodes.size > 0) {
        return highlightNodes.has(n.id) || n.id === selectedNode;
      }
      return (edgeCount.get(n.id) || 0) > 0 || n.weight > 0;
    });

    for (const n of filteredNodes) visibleNodeIds.add(n.id);

    // Only keep edges where both endpoints are visible
    const visibleEdges = filteredEdges.filter(e => {
      const src = typeof e.source === 'string' ? e.source : (e.source as unknown as GraphNode).id;
      const tgt = typeof e.target === 'string' ? e.target : (e.target as unknown as GraphNode).id;
      return visibleNodeIds.has(src) && visibleNodeIds.has(tgt);
    });

    return { nodes: filteredNodes, links: visibleEdges };
  }, [data, visibleTypes, dateRange, highlightNodes, selectedNode]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    // Pin the node
    node.fx = node.x;
    node.fy = node.y;
    onNodeClick(node.id, node.type, node.dbId);
  }, [onNodeClick]);

  const handleBackgroundClick = useCallback(() => {
    // Unpin all nodes
    for (const node of data.nodes) {
      node.fx = undefined;
      node.fy = undefined;
    }
    onBackgroundClick();
  }, [data, onBackgroundClick]);

  const isHighlighting = highlightNodes.size > 0;

  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const r = nodeRadius(node, globalScale);
    const isSelected = node.id === selectedNode;
    const isHighlighted = highlightNodes.has(node.id);
    const dimmed = isHighlighting && !isHighlighted && !isSelected;

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
    ctx.fillStyle = dimmed ? NODE_COLORS_DIM[node.type] : NODE_COLORS[node.type];
    ctx.fill();

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
      // Glow
      ctx.shadowColor = NODE_COLORS[node.type];
      ctx.shadowBlur = 8 / globalScale;
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, r + 2 / globalScale, 0, 2 * Math.PI);
      ctx.strokeStyle = NODE_COLORS[node.type];
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Label (show when zoomed in enough or for highlighted/high-weight nodes)
    const showLabel = globalScale > 1.5 || isSelected || isHighlighted || (globalScale > 0.8 && node.weight >= 3);
    if (showLabel && !dimmed) {
      const fontSize = Math.max(10, 12 / globalScale);
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isSelected || isHighlighted ? '#f8fafc' : '#cbd5e1';
      ctx.fillText(node.name, node.x!, node.y! + r + 2 / globalScale);
    }
  }, [selectedNode, highlightNodes, isHighlighting]);

  const linkCanvasObject = useCallback((link: GraphEdge, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const src = link.source as unknown as GraphNode;
    const tgt = link.target as unknown as GraphNode;
    if (!src.x || !tgt.x) return;

    const isLinkedToSelected = selectedNode &&
      ((typeof link.source === 'string' ? link.source : (link.source as unknown as GraphNode).id) === selectedNode ||
       (typeof link.target === 'string' ? link.target : (link.target as unknown as GraphNode).id) === selectedNode);

    const dimmed = isHighlighting && !isLinkedToSelected;

    // Curved arc
    const dx = tgt.x! - src.x!;
    const dy = tgt.y! - src.y!;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const curvature = 0.2;
    const cx = (src.x! + tgt.x!) / 2 - dy * curvature;
    const cy = (src.y! + tgt.y!) / 2 + dx * curvature;

    ctx.beginPath();
    ctx.moveTo(src.x!, src.y!);
    ctx.quadraticCurveTo(cx, cy, tgt.x!, tgt.y!);

    const baseWidth = Math.max(0.5, Math.min(3, link.weight * 0.5));
    ctx.lineWidth = (dimmed ? baseWidth * 0.3 : baseWidth) / globalScale;
    ctx.strokeStyle = dimmed ? '#33415520' : (EDGE_COLORS[link.type] || '#64748b') + (dimmed ? '40' : '80');
    ctx.stroke();
  }, [selectedNode, isHighlighting]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={filteredData}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node: GraphNode, color, ctx, globalScale) => {
          const r = nodeRadius(node, globalScale) + 2;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        backgroundColor="#0f172a"
        cooldownTicks={200}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        minZoom={0.1}
        maxZoom={10}
      />
    </div>
  );
}
