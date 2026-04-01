'use client';

import type { EntityType } from '@/lib/types';
import { NODE_COLORS } from '@/lib/graph-utils';

interface GraphControlsProps {
  visibleTypes: Set<EntityType>;
  onToggleType: (type: EntityType) => void;
  nodeCount: number;
  edgeCount: number;
}

const TYPE_INFO: { type: EntityType; label: string; labelRu: string }[] = [
  { type: 'project', label: 'Projects', labelRu: 'Проекты' },
  { type: 'person', label: 'People', labelRu: 'Люди' },
  { type: 'event', label: 'Events', labelRu: 'События' },
];

export default function GraphControls({ visibleTypes, onToggleType, nodeCount, edgeCount }: GraphControlsProps) {
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

      {/* Legend */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-slate-500">
        Scroll: zoom / Drag: move / Click: details
      </div>
    </div>
  );
}
