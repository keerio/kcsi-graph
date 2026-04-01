'use client';

import { useEffect, useState } from 'react';
import type { EntityType, Project, Person, Event } from '@/lib/types';
import ProjectCard from './cards/ProjectCard';
import PersonCard from './cards/PersonCard';
import EventCard from './cards/EventCard';

interface DetailPanelProps {
  entityType: EntityType | null;
  entityId: number | null;
  onClose: () => void;
  onNavigate: (type: EntityType, id: number) => void;
}

export default function DetailPanel({ entityType, entityId, onClose, onNavigate }: DetailPanelProps) {
  const [data, setData] = useState<Project | Person | Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityType || !entityId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/entities/${entityType}/${entityId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  const isOpen = entityType !== null && entityId !== null;

  // Handle Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-slate-900/95 backdrop-blur-md border-l border-slate-700/50 z-20 transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Content */}
      <div className="h-full overflow-y-auto p-5 pt-10">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg">
            {error}
          </div>
        )}

        {data && entityType === 'project' && (
          <ProjectCard
            project={data as Project}
            onNavigate={(type, id) => onNavigate(type, id)}
          />
        )}

        {data && entityType === 'person' && (
          <PersonCard
            person={data as Person}
            onNavigate={(type, id) => onNavigate(type, id)}
          />
        )}

        {data && entityType === 'event' && (
          <EventCard
            event={data as Event}
            onNavigate={(type, id) => onNavigate(type, id)}
          />
        )}
      </div>
    </div>
  );
}
