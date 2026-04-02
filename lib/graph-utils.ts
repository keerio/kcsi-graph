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
  // Add jitter so nodes don't stack
  const jitter = 80;
  return {
    x: base.x + (Math.random() - 0.5) * jitter,
    y: base.y + (Math.random() - 0.5) * jitter,
  };
}

// Node colors by type
export const NODE_COLORS: Record<string, string> = {
  project: '#3b82f6',  // blue-500
  person: '#a855f7',   // purple-500
  event: '#f59e0b',    // amber-500
};

export const NODE_COLORS_DIM: Record<string, string> = {
  project: '#3b82f633',
  person: '#a855f733',
  event: '#f59e0b33',
};

// Edge colors by type
export const EDGE_COLORS: Record<string, string> = {
  has_role: '#6366f1',      // indigo
  hosted_by: '#10b981',     // emerald
  co_mention: '#94a3b8',    // slate
  tagged: '#3b82f6',        // blue
  participates_in: '#22c55e', // green
  shows_work: '#f97316',    // orange
  organizes: '#ef4444',     // red
  located_in: '#8b5cf6',    // violet
  authored_by: '#ec4899',   // pink
};

export function nodeRadius(node: GraphNode, zoom: number): number {
  // Hubs (weight >= 5) are significantly larger
  const base = Math.max(3, Math.min(20, 3 + Math.pow(node.weight, 0.6) * 2));
  return base / Math.sqrt(zoom);
}

export function isHub(node: GraphNode): boolean {
  return node.type === 'project' && node.weight >= 3;
}

// Word-wrap text at maxChars per line
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
