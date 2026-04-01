'use client';

import { useState } from 'react';
import type { Project, EntityType } from '@/lib/types';
import { PROJECT_TYPE_LABELS, EVENT_TYPE_LABELS } from '@/lib/constants';
import ContactLine from './ContactLine';
import RoleBadge from './RoleBadge';

interface ProjectCardProps {
  project: Project;
  onNavigate: (type: EntityType, id: number) => void;
}

export default function ProjectCard({ project, onNavigate }: ProjectCardProps) {
  const [showParticipants, setShowParticipants] = useState(false);

  const coreTeam = project.team.filter(m => m.role !== 'other' && m.role !== '3266');
  const participants = project.team.filter(m => m.role === 'other' || m.role === '3266');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start gap-2 mb-1">
          {project.type && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
              {PROJECT_TYPE_LABELS[project.type] || project.type}
            </span>
          )}
          {project.status === 'archive' && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
              Архив
            </span>
          )}
        </div>
        <h2 className="text-lg font-semibold text-white leading-tight">{project.name}</h2>
        {project.nameRu && project.nameRu !== project.name && (
          <p className="text-sm text-slate-400">{project.nameRu}</p>
        )}
        {project.city && (
          <p className="text-sm text-slate-500 mt-0.5">{project.city}</p>
        )}
      </div>

      {/* Contacts */}
      <div className="space-y-1">
        {project.instagram && (
          <ContactLine icon="@" value={project.instagram} href={`https://instagram.com/${project.instagram.replace('@', '')}`} />
        )}
        {project.telegram && (
          <ContactLine icon="T" value={project.telegram} href={`https://t.me/${project.telegram.replace('@', '')}`} />
        )}
        {project.website && <ContactLine icon="W" value={project.website} href={project.website.startsWith('http') ? project.website : `https://${project.website}`} />}
        {project.email && <ContactLine icon="E" value={project.email} href={`mailto:${project.email}`} />}
        {project.phone && <ContactLine icon="P" value={project.phone} />}
        {project.address && <ContactLine icon="A" value={project.address} />}
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-4">{project.description}</p>
      )}

      {/* Core Team */}
      {coreTeam.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Команда</h3>
          <div className="space-y-1.5">
            {coreTeam.map((member, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-wrap">
                <RoleBadge role={member.role} />
                {member.personId ? (
                  <button
                    onClick={() => onNavigate('person', member.personId!)}
                    className="text-sm text-slate-300 hover:text-white transition-colors underline underline-offset-2 decoration-slate-600"
                  >
                    {member.personName || `#${member.personId}`}
                  </button>
                ) : (
                  <span className="text-sm text-slate-400">{member.roleText || member.role}</span>
                )}
                {member.period && (
                  <span className="text-xs text-slate-600">({member.period})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {project.events.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            События ({project.events.length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {project.events.map(ev => (
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

      {/* Participants (other roles) — collapsible */}
      {participants.length > 0 && (
        <div>
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showParticipants ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Участники ({participants.length})
          </button>
          {showParticipants && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {participants.map((member, i) => (
                <div key={i} className="flex items-center gap-2">
                  {member.personId ? (
                    <button
                      onClick={() => onNavigate('person', member.personId!)}
                      className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-2 decoration-slate-700"
                    >
                      {member.personName || `#${member.personId}`}
                    </button>
                  ) : (
                    <span className="text-sm text-slate-500">{member.personName || 'Unknown'}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
