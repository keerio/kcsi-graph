'use client';

import type { EntityType, GeoGroup } from '@/lib/types';
import { NODE_COLORS } from '@/lib/graph-utils';

interface GraphControlsProps {
  visibleTypes: Set<EntityType>;
  onToggleType: (type: EntityType) => void;
  nodeCount: number;
  edgeCount: number;
  geoFilter: GeoGroup | 'all';
  onGeoFilter: (g: GeoGroup | 'all') => void;
  minScore: number;
  onMinScore: (v: number) => void;
}

const TYPE_INFO: { type: EntityType; labelRu: string }[] = [
  { type: 'person', labelRu: 'Люди' },
  { type: 'institution', labelRu: 'Институции' },
  { type: 'event', labelRu: 'События' },
  { type: 'venue', labelRu: 'Площадки' },
];

const GEO_BUTTONS: { value: GeoGroup | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'kg', label: 'КГ' },
  { value: 'ca', label: 'ЦА' },
  { value: 'world', label: 'Мир' },
];

export default function GraphControls({
  visibleTypes, onToggleType, nodeCount, edgeCount,
  geoFilter, onGeoFilter, minScore, onMinScore,
}: GraphControlsProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      {/* Stats */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-400">
        {nodeCount} nodes / {edgeCount} edges
      </div>

      {/* Type toggles */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 flex flex-col gap-1.5">
        {TYPE_INFO.map(({ type, labelRu }) => (
          <button
            key={type}
            onClick={() => onToggleType(type)}
            className={`flex items-center gap-2 text-xs transition-opacity ${
              visibleTypes.has(type) ? 'opacity-100' : 'opacity-40'
            }`}
          >
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: NODE_COLORS[type] }}
            />
            <span className="text-slate-300">{labelRu}</span>
          </button>
        ))}
      </div>

      {/* Geo filter */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 flex flex-col gap-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Регион</span>
        <div className="flex gap-1">
          {GEO_BUTTONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onGeoFilter(value)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                geoFilter === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KGart score slider */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 flex flex-col gap-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">
          KGart score ≥ {minScore}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={minScore}
          onChange={e => onMinScore(Number(e.target.value))}
          className="w-full accent-blue-500 h-1"
        />
      </div>

      {/* Legend */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-slate-500">
        Scroll: zoom / Drag: move / Click: details
      </div>
    </div>
  );
}
