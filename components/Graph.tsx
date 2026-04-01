'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphNode, GraphEdge, GraphData, EntityType } from '@/lib/types';
import { NODE_COLORS, NODE_COLORS_DIM, EDGE_COLORS, nodeRadius, seedPosition, isHub, wrapText } from '@/lib/graph-utils';

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

    // Build adjacency list for connected component analysis
    const adj = new Map<string, Set<string>>();
    const getNodeId = (x: string | GraphNode) => typeof x === 'string' ? x : (x as unknown as GraphNode).id;
    for (const e of filteredEdges) {
      const src = getNodeId(e.source);
      const tgt = getNodeId(e.target);
      if (!adj.has(src)) adj.set(src, new Set());
      if (!adj.has(tgt)) adj.set(tgt, new Set());
      adj.get(src)!.add(tgt);
      adj.get(tgt)!.add(src);
    }

    // Find connected components via BFS, keep only components with size > 3
    const visited = new Set<string>();
    const keepNodes = new Set<string>();
    for (const nodeId of adj.keys()) {
      if (visited.has(nodeId)) continue;
      const component: string[] = [];
      const queue = [nodeId];
      while (queue.length > 0) {
        const cur = queue.pop()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        component.push(cur);
        for (const neighbor of adj.get(cur) || []) {
          if (!visited.has(neighbor)) queue.push(neighbor);
        }
      }
      if (component.length > 3) {
        for (const id of component) keepNodes.add(id);
      }
    }

    // Count distinct neighbors per event node
    const eventNeighborCount = new Map<string, number>();
    for (const e of filteredEdges) {
      const src = getNodeId(e.source);
      const tgt = getNodeId(e.target);
      if (src.startsWith('event_')) eventNeighborCount.set(src, (eventNeighborCount.get(src) || 0) + 1);
      if (tgt.startsWith('event_')) eventNeighborCount.set(tgt, (eventNeighborCount.get(tgt) || 0) + 1);
    }

    const filteredNodes = data.nodes.filter(n => {
      if (!visibleTypes.has(n.type)) return false;
      if (!keepNodes.has(n.id)) return false;
      // Events: show if selected/highlighted, OR shared by 2+ people
      if (n.type === 'event') {
        if (highlightNodes.has(n.id) || n.id === selectedNode) return true;
        return (eventNeighborCount.get(n.id) || 0) >= 2;
      }
      return true;
    });

    for (const n of filteredNodes) visibleNodeIds.add(n.id);

    const visibleEdges = filteredEdges.filter(e => {
      const src = getNodeId(e.source);
      const tgt = getNodeId(e.target);
      return visibleNodeIds.has(src) && visibleNodeIds.has(tgt);
    });

    return { nodes: filteredNodes, links: visibleEdges };
  }, [data, visibleTypes, dateRange, highlightNodes, selectedNode]);

  const handleNodeClick = useCallback((node: GraphNode) => {
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

  // Zoom to selected node (also triggered by card navigation)
  useEffect(() => {
    if (!selectedNode || !fgRef.current) return;
    const node = data.nodes.find(n => n.id === selectedNode);
    if (node && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 400);
      fgRef.current.zoom(3, 400);
    }
  }, [selectedNode, data.nodes]);

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

    // Labels: hubs always, others only on select/highlight
    const hub = isHub(node);
    const showLabel = hub || isSelected || isHighlighted;
    if (showLabel && !dimmed) {
      const fontSize = Math.max(10, (hub ? 14 : 11) / globalScale);
      ctx.font = `${hub ? 'bold ' : ''}${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isSelected || isHighlighted ? '#f8fafc' : hub ? '#e2e8f0' : '#94a3b8';
      const lines = wrapText(node.name, 30);
      const lineHeight = fontSize * 1.2;
      let y = node.y! + r + 2 / globalScale;
      for (const line of lines) {
        ctx.fillText(line, node.x!, y);
        y += lineHeight;
      }
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
