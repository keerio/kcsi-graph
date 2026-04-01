'use client';

import type { Event } from '@/lib/types';
import { EVENT_TYPE_LABELS } from '@/lib/constants';

interface EventCardProps {
  event: Event;
  onNavigate: (type: 'project', id: number) => void;
}

function formatDate(d: string | null): string {
  if (!d) return '';
  return d.slice(0, 10);
}

export default function EventCard({ event, onNavigate }: EventCardProps) {
  const dateDisplay = event.dateText || (
    event.dateStart
      ? event.dateEnd && event.dateEnd !== event.dateStart
        ? `${formatDate(event.dateStart)} — ${formatDate(event.dateEnd)}`
        : formatDate(event.dateStart)
      : null
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start gap-2 mb-1">
          {event.type && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300">
              {EVENT_TYPE_LABELS[event.type] || event.type}
            </span>
          )}
        </div>
        <h2 className="text-lg font-semibold text-white leading-tight">{event.name}</h2>
        {event.city && (
          <p className="text-sm text-slate-500 mt-0.5">{event.city}</p>
        )}
      </div>

      {/* Date & Venue */}
      <div className="space-y-1">
        {dateDisplay && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-4 text-center">D</span>
            <span className="text-slate-300">{dateDisplay}</span>
          </div>
        )}
        {event.venue && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-4 text-center">V</span>
            <span className="text-slate-300">{event.venue}</span>
          </div>
        )}
        {event.mentionCount > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-4 text-center">#</span>
            <span className="text-slate-400">{event.mentionCount} упоминаний</span>
          </div>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-4">{event.description}</p>
      )}

      {/* Participants */}
      {event.participants && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Участники</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{event.participants}</p>
        </div>
      )}

      {/* Parent Project */}
      {event.project && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Проект</h3>
          <button
            onClick={() => onNavigate('project', event.project!.id)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2 decoration-blue-600"
          >
            {event.project.name}
          </button>
        </div>
      )}
    </div>
  );
}
