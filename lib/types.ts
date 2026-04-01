// ── Graph types (for force-graph rendering) ─────────────────────────────────

export type EntityType = 'project' | 'event' | 'person';

export interface GraphNode {
  id: string;          // "project_123" | "event_456" | "person_789"
  dbId: number;        // raw database row ID
  type: EntityType;
  name: string;
  city: string | null;
  subtype: string | null;  // project_type or event_type label
  weight: number;      // connectivity weight for sizing/filtering
  // Force-graph positioning
  x?: number;
  y?: number;
  fx?: number | undefined;  // pinned position
  fy?: number | undefined;
}

export interface GraphEdge {
  source: string;      // node id
  target: string;      // node id
  type: string;        // relation type label
  weight: number;
  date: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Entity detail types (for cards) ─────────────────────────────────────────

export interface Project {
  id: number;
  name: string;
  nameRu: string | null;
  nameOriginal: string | null;
  type: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  telegram: string | null;
  description: string | null;
  status: string | null;
  team: RoleEntry[];
  events: EventSummary[];
}

export interface Person {
  id: number;
  name: string;
  nameRu: string | null;
  nameOriginal: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  telegram: string | null;
  bio: string | null;
  roles: RoleEntry[];
  events: EventSummary[];
  artworks: ArtworkSummary[];
}

export interface ArtworkSummary {
  id: number;
  title: string;
  medium: string | null;
  firstSeen: string | null;
}

export interface Event {
  id: number;
  name: string;
  type: string | null;
  venue: string | null;
  city: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  dateText: string | null;
  participants: string | null;
  description: string | null;
  mentionCount: number;
  project: { id: number; name: string } | null;
}

export interface RoleEntry {
  role: string;
  roleText: string | null;
  period: string | null;
  personId: number | null;
  personName: string | null;
  projectId: number | null;
  projectName: string | null;
}

export interface EventSummary {
  id: number;
  name: string;
  type: string | null;
  dateStart: string | null;
}

export interface SearchResult {
  id: number;
  type: EntityType;
  name: string;
  city: string | null;
  subtype: string | null;
}
