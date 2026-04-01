'use client';

import type { Person, EntityType } from '@/lib/types';
import { ROLE_LABELS, EVENT_TYPE_LABELS } from '@/lib/constants';
import ContactLine from './ContactLine';
import RoleBadge from './RoleBadge';

interface PersonCardProps {
  person: Person;
  onNavigate: (type: EntityType, id: number) => void;
}

export default function PersonCard({ person, onNavigate }: PersonCardProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white leading-tight">{person.name}</h2>
        {person.nameRu && person.nameRu !== person.name && (
          <p className="text-sm text-slate-400">{person.nameRu}</p>
        )}
        {person.city && (
          <p className="text-sm text-slate-500 mt-0.5">{person.city}</p>
        )}
      </div>

      {/* Contacts */}
      <div className="space-y-1">
        {person.instagram && (
          <ContactLine icon="@" value={person.instagram} href={`https://instagram.com/${person.instagram.replace('@', '')}`} />
        )}
        {person.telegram && (
          <ContactLine icon="T" value={person.telegram} href={`https://t.me/${person.telegram.replace('@', '')}`} />
        )}
        {person.website && <ContactLine icon="W" value={person.website} href={person.website.startsWith('http') ? person.website : `https://${person.website}`} />}
        {person.email && <ContactLine icon="E" value={person.email} href={`mailto:${person.email}`} />}
        {person.phone && <ContactLine icon="P" value={person.phone} />}
      </div>

      {/* Bio */}
      {person.bio && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Био</h3>
          <p className="text-sm text-slate-400 leading-relaxed line-clamp-6">{person.bio}</p>
        </div>
      )}

      {/* Roles — role + project on same line */}
      {person.roles.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Роли</h3>
          <div className="space-y-1.5">
            {person.roles.map((role, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-wrap">
                <RoleBadge role={role.role} />
                {role.projectId ? (
                  <>
                    <span className="text-xs text-slate-600">@</span>
                    <button
                      onClick={() => onNavigate('project', role.projectId!)}
                      className="text-sm text-slate-300 hover:text-white transition-colors underline underline-offset-2 decoration-slate-600"
                    >
                      {role.projectName || `#${role.projectId}`}
                    </button>
                  </>
                ) : (
                  role.roleText && <span className="text-sm text-slate-400">{role.roleText}</span>
                )}
                {role.period && (
                  <span className="text-xs text-slate-600">({role.period})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {person.events && person.events.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            События ({person.events.length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {person.events.map(ev => (
              <button
                key={ev.id}
                onClick={() => onNavigate('event', ev.id)}
                className="w-full text-left flex items-center gap-2 group"
              >
                {ev.type && (
                  <span className="shrink-0 text-[10px] text-amber-400/60">
                    {EVENT_TYPE_LABELS[ev.type] || ev.type}
                  </span>
                )}
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">
                  {ev.name}
                </span>
                {ev.dateStart && (
                  <span className="shrink-0 text-xs text-slate-600 ml-auto">
                    {ev.dateStart.slice(0, 10)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Artworks */}
      {person.artworks && person.artworks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Работы ({person.artworks.length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {person.artworks.map(aw => (
              <div key={aw.id} className="flex items-center gap-2">
                <span className="text-sm text-slate-300">{aw.title}</span>
                {aw.medium && (
                  <span className="shrink-0 text-[10px] text-slate-500">{aw.medium}</span>
                )}
                {aw.firstSeen && (
                  <span className="shrink-0 text-xs text-slate-600 ml-auto">
                    {aw.firstSeen.slice(0, 10)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
