'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { GraphData, EntityType } from '@/lib/types';
import GraphControls from '@/components/GraphControls';
import DetailPanel from '@/components/DetailPanel';
import TimelineSlider from '@/components/TimelineSlider';
import SearchBar from '@/components/SearchBar';

// Dynamic import for force-graph (requires window/canvas)
const Graph = dynamic(() => import('@/components/Graph'), { ssr: false });

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EntityType | null>(null);
  const [selectedDbId, setSelectedDbId] = useState<number | null>(null);

  // Filters
  const [visibleTypes, setVisibleTypes] = useState<Set<EntityType>>(
    new Set(['project', 'person', 'event'])
  );
  const [timelineRange, setTimelineRange] = useState<[number, number]>([2020, 2026]);

  // Fetch graph data
  useEffect(() => {
    setLoading(true);
    fetch('/api/graph')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: GraphData) => {
        setGraphData(data);
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Compute highlighted nodes (selected + its neighbors)
  const highlightNodes = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNodeId || !graphData) return set;

    set.add(selectedNodeId);
    for (const edge of graphData.edges) {
      const src = typeof edge.source === 'string' ? edge.source : (edge.source as unknown as { id: string }).id;
      const tgt = typeof edge.target === 'string' ? edge.target : (edge.target as unknown as { id: string }).id;
      if (src === selectedNodeId) set.add(tgt);
      if (tgt === selectedNodeId) set.add(src);
    }
    return set;
  }, [selectedNodeId, graphData]);

  // Date range for edge filtering
  const dateRange = useMemo<[string, string]>(() => {
    return [`${timelineRange[0]}-01-01`, `${timelineRange[1]}-12-31`];
  }, [timelineRange]);

  const handleNodeClick = useCallback((nodeId: string, type: EntityType, dbId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedType(type);
    setSelectedDbId(dbId);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedType(null);
    setSelectedDbId(null);
  }, []);

  const handleNavigate = useCallback((type: EntityType, id: number) => {
    // Find node UUID by dbId and type
    const node = graphData?.nodes.find(n => n.type === type && n.dbId === id);
    setSelectedNodeId(node?.id || null);
    setSelectedType(type);
    setSelectedDbId(id);
  }, [graphData]);

  const handleToggleType = useCallback((type: EntityType) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleSearchSelect = useCallback((type: EntityType, id: number) => {
    handleNavigate(type, id);
  }, [handleNavigate]);

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading graph data...</p>
        </div>
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">Failed to load graph</p>
          <p className="text-slate-600 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 overflow-hidden relative">
      {/* Graph canvas */}
      <Graph
        data={graphData}
        selectedNode={selectedNodeId}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleClose}
        highlightNodes={highlightNodes}
        visibleTypes={visibleTypes}
        dateRange={dateRange}
      />

      {/* Controls overlay */}
      <GraphControls
        visibleTypes={visibleTypes}
        onToggleType={handleToggleType}
        nodeCount={graphData.nodes.length}
        edgeCount={graphData.edges.length}
      />

      {/* Top bar: search + timeline */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[600px] max-w-[80vw] space-y-2">
        <SearchBar onSelect={handleSearchSelect} />
        <TimelineSlider
          min={2020}
          max={2026}
          value={timelineRange}
          onChange={setTimelineRange}
        />
      </div>

      {/* Detail panel */}
      <DetailPanel
        entityType={selectedType}
        entityId={selectedDbId}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
