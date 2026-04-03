import type { GraphNode } from './types';

// City → approximate coordinates for initial positioning
const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  'almaty': { x: -300, y: 0 },
  'алматы': { x: -300, y: 0 },
  'bishkek': { x: 0, y: -200 },
  'бишкек': { x: 0, y: -200 },
  'tashkent': { x: 300, y: 0 },
  'ташкент': { x: 300, y: 0 },
  'dushanbe': { x: 200, y: 200 },
  'душанбе': { x: 200, y: 200 },
  'ashgabat': { x: -200, y: 200 },
  'ашхабад': { x: -200, y: 200 },
  'samarkand': { x: 350, y: 100 },
  'самарканд': { x: 350, y: 100 },
  'bukhara': { x: 250, y: 150 },
  'бухара': { x: 250, y: 150 },
  'osh': { x: 100, y: -100 },
  'ош': { x: 100, y: -100 },
  'nur-sultan': { x: -400, y: -200 },
  'астана': { x: -400, y: -200 },
  'astana': { x: -400, y: -200 },
};

export function seedPosition(node: GraphNode): { x: number; y: number } {
  const city = node.city?.toLowerCase().trim() || '';
  const base = CITY_POSITIONS[city] || { x: 0, y: 0 };
  const jitter = 80;
  return {
    x: base.x + (Math.random() - 0.5) * jitter,
    y: base.y + (Math.random() - 0.5) * jitter,
  };
}

// Colors per entity type
export const NODE_COLORS: Record<string, string> = {
  person: '#3b82f6',      // blue-500
  institution: '#22c55e', // green-500
  event: '#f59e0b',       // amber-500
  venue: '#a855f7',       // purple-500
  artwork: '#6b7280',     // gray-500
};

export const NODE_COLORS_DIM: Record<string, string> = {
  person: '#3b82f633',
  institution: '#22c55e33',
  event: '#f59e0b33',
  venue: '#a855f733',
  artwork: '#6b728033',
};

// Edge colors by relation type
export const EDGE_COLORS: Record<string, string> = {
  participated_in: '#3b82f6', // blue
  artist_at: '#f97316',       // orange
  exhibited_at: '#ec4899',    // pink
  founder: '#ef4444',         // red
  director: '#ef4444',        // red
  curator: '#6366f1',         // indigo
  organized: '#ef4444',       // red
  member_of: '#10b981',       // emerald
  collaborated: '#8b5cf6',    // violet
  designer_at: '#f97316',     // orange
  musician_at: '#f59e0b',     // amber
  part_of: '#64748b',         // slate
};

export function nodeRadius(node: GraphNode, zoom: number): number {
  // Size hierarchy: institution > person > event > venue > artwork
  let base: number;
  if (node.type === 'institution') {
    base = Math.max(11, Math.min(25, 11 + Math.pow(node.weight, 0.5) * 2.1));
  } else if (node.type === 'event') {
    base = Math.max(4, Math.min(10, 4 + Math.pow(node.weight, 0.5) * 1.2));
  } else if (node.type === 'venue') {
    base = Math.max(6, Math.min(14, 6 + Math.pow(node.weight, 0.5) * 1.5));
  } else if (node.type === 'artwork') {
    base = Math.max(3, Math.min(6, 3 + Math.pow(node.weight, 0.5) * 0.5));
  } else {
    // person
    base = Math.max(3, Math.min(8, 3 + Math.pow(node.weight, 0.5) * 0.7));
  }
  return base / Math.sqrt(zoom);
}

export function isHub(node: GraphNode): boolean {
  return node.type === 'institution' && node.weight >= 3;
}

export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && (current.length + 1 + word.length) > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
