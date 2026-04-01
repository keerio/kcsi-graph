'use client';

import type { Person } from '@/lib/types';
import ContactLine from './ContactLine';
import RoleBadge from './RoleBadge';

interface PersonCardProps {
  person: Person;
  onNavigate: (type: 'project', id: number) => void;
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
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-4">{person.bio}</p>
      )}

      {/* Roles */}
      {person.roles.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Роли</h3>
          <div className="space-y-2">
            {person.roles.map((role, i) => (
              <div key={i} className="flex items-start gap-2">
                <RoleBadge role={role.role} />
                <div className="min-w-0">
                  {role.projectId ? (
                    <button
                      onClick={() => onNavigate('project', role.projectId!)}
                      className="text-sm text-slate-300 hover:text-white transition-colors underline underline-offset-2 decoration-slate-600 text-left"
                    >
                      {role.projectName || `Project #${role.projectId}`}
                    </button>
                  ) : (
                    role.roleText && <span className="text-sm text-slate-400">{role.roleText}</span>
                  )}
                  {role.period && (
                    <span className="block text-xs text-slate-600">{role.period}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
