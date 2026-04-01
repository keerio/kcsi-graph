'use client';

import { ROLE_LABELS } from '@/lib/constants';

interface RoleBadgeProps {
  role: string;
}

const ROLE_COLORS: Record<string, string> = {
  director: 'bg-red-500/20 text-red-300',
  curator: 'bg-purple-500/20 text-purple-300',
  artist: 'bg-blue-500/20 text-blue-300',
  founder: 'bg-amber-500/20 text-amber-300',
  manager: 'bg-green-500/20 text-green-300',
  photographer: 'bg-cyan-500/20 text-cyan-300',
  musician: 'bg-pink-500/20 text-pink-300',
  designer: 'bg-indigo-500/20 text-indigo-300',
};

export default function RoleBadge({ role }: RoleBadgeProps) {
  const label = ROLE_LABELS[role] || role;
  const colorClass = ROLE_COLORS[role] || 'bg-slate-500/20 text-slate-300';

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
