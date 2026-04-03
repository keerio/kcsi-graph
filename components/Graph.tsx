'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphNode, GraphEdge, GraphData, EntityType, GeoGroup } from '@/lib/types';
import { NODE_COLORS, NODE_COLORS_DIM, EDGE_COLORS, nodeRadius, seedPosition, isHub, wrapText } from '@/lib/graph-utils';

interface GraphProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeClick: (nodeId: string, type: EntityType) => void;
  onBackgroundClick: () => void;
  highlightNodes: Set<string>;
  visibleTypes: Set<EntityType>;
  dateRange: [string, string] | null;
  geoFilter: GeoGroup | 'all';
  minScore: number;
}

export default function Graph({
  data, selectedNode, onNodeClick, onBackgroundClick,
  highlightNodes, visibleTypes, dateRange, geoFilter, minScore,
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

  // Configure simulation
  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.d3Force('charge')?.strength(-20);
    fgRef.current.d3Force('link')?.distance(80);

    // Proper d3 force with initialize — institutions repel each other
    let simNodes: GraphNode[] = [];
    const institutionCollide = (alpha: number) => {
      const institutions = simNodes.filter(n => n.type === 'institution');
      for (let i = 0; i < institutions.length; i++) {
        for (let j = i + 1; j < institutions.length; j++) {
          const a = institutions[i];
          const b = institutions[j];
          if (a.x == null || a.y == null || b.x == null || b.y == null) continue;
          const dx = (b.x - a.x) || 0.01;
          const dy = (b.y - a.y) || 0.01;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const rA = nodeRadius(a, 1);
          const rB = nodeRadius(b, 1);
          const minDist = Math.max(rA, rB) * 2 + rA + rB;
          if (dist < minDist && dist > 0) {
            const strength = (minDist - dist) / dist * alpha * 0.6;
            const fx = dx * strength;
            const fy = dy * strength;
            if (a.fx == null) { a.vx = (a.vx || 0) - fx; }
            if (b.fx == null) { b.vx = (b.vx || 0) + fx; }
            if (a.fy == null) { a.vy = (a.vy || 0) - fy; }
            if (b.fy == null) { b.vy = (b.vy || 0) + fy; }
          }
        }
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (institutionCollide as any).initialize = (nodes: GraphNode[]) => { simNodes = nodes; };

    fgRef.current.d3Force('institutionCollide', institutionCollide);
    setTimeout(() => fgRef.current?.cooldownTicks(0), 4000);
  }, [data]);

  // Filter data based on visible types and date range
  const filteredData = useMemo(() => {
    const visibleNodeIds = new Set<string>();

    // Filter edges by date range
    let filteredEdges = data.edges;
    if (dateRange) {
      filteredEdges = data.edges.filter(e => {
        if (!e.date) return true;
        return e.date >= dateRange[0] && e.date <= dateRange[1];
      });
    }

    // Build adjacency for connected component analysis
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

    // Keep only connected components with > 3 nodes
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

    // Count edges per node
    const nodeEdgeCount = new Map<string, number>();
    for (const e of filteredEdges) {
      const src = getNodeId(e.source);
      const tgt = getNodeId(e.target);
      nodeEdgeCount.set(src, (nodeEdgeCount.get(src) || 0) + 1);
      nodeEdgeCount.set(tgt, (nodeEdgeCount.get(tgt) || 0) + 1);
    }

    const filteredNodes = data.nodes.filter(n => {
      if (!visibleTypes.has(n.type)) return false;
      if (!keepNodes.has(n.id)) return false;
      // Geo filter
      if (geoFilter !== 'all' && n.geoGroup !== geoFilter) {
        if (n.id !== selectedNode && !highlightNodes.has(n.id)) return false;
      }
      // Score filter
      if (minScore > 0 && n.kgartScore < minScore) {
        if (n.id !== selectedNode && !highlightNodes.has(n.id)) return false;
      }
      // Institutions always visible (within geo/score)
      if (n.type === 'institution') return true;
      // Selected/highlighted always visible
      if (highlightNodes.has(n.id) || n.id === selectedNode) return true;
      // Others: only show if 2+ edges
      return (nodeEdgeCount.get(n.id) || 0) >= 2;
    });

    for (const n of filteredNodes) visibleNodeIds.add(n.id);

    const visibleEdges = filteredEdges.filter(e => {
      const src = getNodeId(e.source);
      const tgt = getNodeId(e.target);
      return visibleNodeIds.has(src) && visibleNodeIds.has(tgt);
    });

    return { nodes: filteredNodes, links: visibleEdges };
  }, [data, visibleTypes, dateRange, highlightNodes, selectedNode, geoFilter, minScore]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    node.fx = node.x;
    node.fy = node.y;
    onNodeClick(node.id, node.type);
  }, [onNodeClick]);

  const handleBackgroundClick = useCallback(() => {
    for (const node of data.nodes) {
      node.fx = undefined;
      node.fy = undefined;
    }
    onBackgroundClick();
  }, [data, onBackgroundClick]);

  // Zoom to selected node
  useEffect(() => {
    if (!selectedNode || !fgRef.current) return;
    const node = data.nodes.find(n => n.id === selectedNode);
    if (node && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 400);
      fgRef.current.zoom(3, 400);
    }
  }, [selectedNode, data.nodes]);

  const isHighlighting = highlightNodes.size > 0;

  // Per-frame label deconfliction: reset every ~16ms
  const labelFrameRef = useRef<{ t: number; pts: Array<{ x: number; y: number }> }>({ t: 0, pts: [] });

  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const r = nodeRadius(node, globalScale);
    const isSelected = node.id === selectedNode;
    const isHighlighted = highlightNodes.has(node.id);
    const dimmed = isHighlighting && !isHighlighted && !isSelected;
    const color = dimmed ? NODE_COLORS_DIM[node.type] : NODE_COLORS[node.type];

    // Shape by type
    if (node.type === 'institution') {
      // Large circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      // Outer ring — cap offset to avoid huge arc at low zoom
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 / globalScale;
      const ringR = r + Math.min(6, 4 / globalScale);
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, ringR, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    } else if (node.type === 'event') {
      // Diamond
      ctx.beginPath();
      ctx.moveTo(node.x!, node.y! - r);
      ctx.lineTo(node.x! + r * 0.8, node.y!);
      ctx.lineTo(node.x!, node.y! + r);
      ctx.lineTo(node.x! - r * 0.8, node.y!);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    } else if (node.type === 'venue') {
      // Pentagon-ish (square rotated 45°)
      ctx.beginPath();
      ctx.moveTo(node.x!, node.y! - r);
      ctx.lineTo(node.x! + r, node.y!);
      ctx.lineTo(node.x!, node.y! + r);
      ctx.lineTo(node.x! - r, node.y!);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      // Circle (person, artwork)
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    // Labels
    const isInstitution = node.type === 'institution';
    const showLabel = isInstitution || isSelected || isHighlighted;
    if (showLabel && !dimmed) {
      // Per-frame deconfliction reset
      const now = Date.now();
      if (now - labelFrameRef.current.t > 14) {
        labelFrameRef.current = { t: now, pts: [] };
      }

      const fontSize = isSelected
        ? Math.max(9, 11 / globalScale)
        : Math.max(6, (isInstitution ? 9 : 8) / globalScale);
      const lineHeight = fontSize * 1.35;
      const lines = wrapText(node.name, 28);
      const labelH = lines.length * lineHeight;

      // Collision check: skip non-selected labels that overlap previous ones
      if (!isSelected) {
        const minSep = (labelH + fontSize * 1.5) / globalScale;
        const conflicts = labelFrameRef.current.pts.some(p => {
          const dx = p.x - node.x!;
          const dy = p.y - node.y!;
          return Math.sqrt(dx * dx + dy * dy) < minSep;
        });
        if (conflicts) {
          // Still register position to block others, but skip drawing for non-institution
          if (!isInstitution) return;
          // Institutions always draw, just register
        }
      }

      ctx.font = `${isSelected ? '400' : '200'} ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isSelected ? '#ffffff' : isHighlighted ? '#e2e8f0' : '#64748b';
      let ly = node.y! + r + 2 / globalScale;
      for (const line of lines) {
        ctx.fillText(line, node.x!, ly);
        ly += lineHeight;
      }

      labelFrameRef.current.pts.push({ x: node.x!, y: node.y! });
    }
  }, [selectedNode, highlightNodes, isHighlighting, labelFrameRef]);

  const linkCanvasObject = useCallback((link: GraphEdge, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const src = link.source as unknown as GraphNode;
    const tgt = link.target as unknown as GraphNode;
    if (!src.x || !tgt.x) return;

    const isLinkedToSelected = selectedNode &&
      ((typeof link.source === 'string' ? link.source : (link.source as unknown as GraphNode).id) === selectedNode ||
       (typeof link.target === 'string' ? link.target : (link.target as unknown as GraphNode).id) === selectedNode);

    const dimmed = isHighlighting && !isLinkedToSelected;

    const dx = tgt.x! - src.x!;
    const dy = tgt.y! - src.y!;
    const curvature = 0.15;
    const cx = (src.x! + tgt.x!) / 2 - dy * curvature;
    const cy = (src.y! + tgt.y!) / 2 + dx * curvature;

    const widthByType: Record<string, number> = {
      participated_in: 0.5, artist_at: 1, exhibited_at: 1, founder: 1.2,
      director: 1.2, curator: 1, organized: 1.2, member_of: 0.5,
    };
    const baseWidth = widthByType[link.type] || 0.5;
    ctx.lineWidth = (dimmed ? baseWidth * 0.3 : baseWidth) / globalScale;
    ctx.strokeStyle = dimmed ? '#33415520' : (EDGE_COLORS[link.type] || '#64748b') + (dimmed ? '40' : '60');

    if (link.type === 'organized') {
      ctx.setLineDash([4 / globalScale, 3 / globalScale]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(src.x!, src.y!);
    ctx.quadraticCurveTo(cx, cy, tgt.x!, tgt.y!);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [selectedNode, isHighlighting]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={filteredData}
        nodeId="id"
        nodeLabel={(node) => {
          const n = node as GraphNode;
          return n.description ? `${n.name}\n${n.description}` : n.name;
        }}
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
