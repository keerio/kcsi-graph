'use client';

import { useState } from 'react';
import type { Entity, RelationEntry } from '@/lib/types';
import { ENTITY_TYPE_LABELS, RELATION_TYPE_LABELS } from '@/lib/constants';
import ContactLine from './ContactLine';

interface EntityCardProps {
  entity: Entity;
  onNavigate: (uuid: string) => void;
}

function groupRelations(relations: RelationEntry[]): Map<string, RelationEntry[]> {
  const groups = new Map<string, RelationEntry[]>();
  for (const r of relations) {
    const label = RELATION_TYPE_LABELS[r.type] || r.type;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(r);
  }
  return groups;
}

export default function EntityCard({ entity, onNavigate }: EntityCardProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const relationGroups = groupRelations(entity.relations);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start gap-2 mb-1">
          <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
            {ENTITY_TYPE_LABELS[entity.type] || entity.type}
          </span>
        </div>
        <h2 className="text-lg font-semibold text-white leading-tight">{entity.name}</h2>
        {entity.nameRu && entity.nameRu !== entity.name && (
          <p className="text-sm text-slate-400">{entity.nameRu}</p>
        )}
        {entity.nameOriginal && entity.nameOriginal !== entity.name && entity.nameOriginal !== entity.nameRu && (
          <p className="text-xs text-slate-500 italic">{entity.nameOriginal}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {entity.city && (
            <span className="text-sm text-slate-500">{entity.city}</span>
          )}
          {entity.country && entity.country !== entity.city && (
            <span className="text-sm text-slate-600">{entity.country}</span>
          )}
        </div>
      </div>

      {/* Metrics */}
      {(entity.kgartScore > 0 || entity.igFollowers > 0 || entity.mentionCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {entity.kgartScore > 0 && (
            <div className="text-center">
              <div className="text-sm font-semibold text-emerald-400">{entity.kgartScore}</div>
              <div className="text-[10px] text-slate-600">kgart</div>
            </div>
          )}
          {entity.igFollowers > 0 && (
            <div className="text-center">
              <div className="text-sm font-semibold text-blue-400">
                {entity.igFollowers >= 1000
                  ? `${(entity.igFollowers / 1000).toFixed(1)}k`
                  : entity.igFollowers}
              </div>
              <div className="text-[10px] text-slate-600">подписчиков</div>
            </div>
          )}
          {entity.mentionCount > 0 && (
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-400">{entity.mentionCount}</div>
              <div className="text-[10px] text-slate-600">упоминаний</div>
            </div>
          )}
        </div>
      )}

      {/* Contacts */}
      <div className="space-y-1">
        {entity.instagram && (
          <ContactLine
            icon="@"
            value={entity.instagram}
            href={`https://instagram.com/${entity.instagram.replace('@', '')}`}
          />
        )}
      </div>

      {/* Description */}
      {entity.description && (
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-4">{entity.description}</p>
      )}

      {/* Relations grouped by type */}
      {relationGroups.size > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Связи ({entity.relations.length})
          </h3>
          {Array.from(relationGroups.entries()).map(([label, rels]) => {
            const isExpanded = expandedGroups.has(label);
            const preview = rels.slice(0, 3);
            const shown = isExpanded ? rels : preview;

            return (
              <div key={label} className="space-y-1">
                <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  {label}
                </div>
                <div className="space-y-1">
                  {shown.map(r => {
                    const isFrom = r.fromUuid === entity.id;
                    const otherUuid = isFrom ? r.toUuid : r.fromUuid;
                    const otherName = isFrom ? r.toName : r.fromName;

                    return (
                      <div key={r.id} className="flex items-center gap-2 group">
                        {otherUuid ? (
                          <button
                            onClick={() => onNavigate(otherUuid)}
                            className="text-sm text-slate-300 hover:text-white transition-colors underline underline-offset-2 decoration-slate-600 text-left"
                          >
                            {otherName || otherUuid.slice(0, 8) + '…'}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">
                            {otherName || 'Unknown'}
                          </span>
                        )}
                        {r.dateStart && (
                          <span className="shrink-0 text-xs text-slate-600 ml-auto">
                            {r.dateStart.slice(0, 10)}
                          </span>
                        )}
                        {r.confidence === 'disputed' && (
                          <span className="shrink-0 text-[10px] text-amber-600">?</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {rels.length > 3 && (
                  <button
                    onClick={() => toggleGroup(label)}
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    {isExpanded ? 'Скрыть' : `Ещё ${rels.length - 3}...`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
