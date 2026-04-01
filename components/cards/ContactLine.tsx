'use client';

interface ContactLineProps {
  icon: string;
  value: string;
  href?: string;
}

export default function ContactLine({ icon, value, href }: ContactLineProps) {
  if (!value) return null;

  const content = (
    <span className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
      <span className="text-slate-500 w-4 text-center">{icon}</span>
      <span className="truncate">{value}</span>
    </span>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }
  return <div>{content}</div>;
}
