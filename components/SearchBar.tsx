'use client';

import { useState, useEffect, useRef } from 'react';
import type { SearchResult } from '@/lib/types';
import { NODE_COLORS } from '@/lib/graph-utils';

interface SearchBarProps {
  onSelect: (uuid: string) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Поиск..."
        className="w-full bg-slate-800/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 border border-slate-700/50 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
      />

      {loading && (
        <div className="absolute right-3 top-2.5">
          <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-slate-800/95 backdrop-blur-md rounded-lg border border-slate-700/50 shadow-xl max-h-64 overflow-y-auto z-30">
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => {
                onSelect(r.id);
                setQuery('');
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: NODE_COLORS[r.type] }}
              />
              <span className="text-sm text-slate-200 truncate">{r.name}</span>
              {r.city && <span className="text-xs text-slate-500 shrink-0 ml-auto">{r.city}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
