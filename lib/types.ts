// ── Graph types (for force-graph rendering) ─────────────────────────────────

export type EntityType = 'person' | 'institution' | 'event' | 'artwork' | 'venue';

export type GeoGroup = 'kg' | 'ca' | 'world' | null;

export interface GraphNode {
  id: string;          // uuid (stable string ID)
  type: EntityType;
  name: string;
  city: string | null;
  country: string | null;
  kgartScore: number;
  igFollowers: number;
  mentionCount: number;
  geoGroup: GeoGroup;  // from located_in → toponym.geo_relevance
  weight: number;      // connectivity weight for sizing/filtering
  // Force-graph positioning
  x?: number;
  y?: number;
  fx?: number | undefined;
  fy?: number | undefined;
}

export interface GraphEdge {
  id: string;          // uuid
  source: string;      // node uuid
  target: string;      // node uuid
  type: string;        // relation type label
  date: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Entity detail types ──────────────────────────────────────────────────────

export interface RelationEntry {
  id: string;
  type: string;        // relation type label
  fromUuid: string;
  fromName: string | null;
  toUuid: string;
  toName: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  confidence: string | null;
}

export interface Entity {
  id: string;          // uuid
  type: EntityType;
  name: string;
  nameRu: string | null;
  nameOriginal: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  instagram: string | null;
  kgartScore: number;
  igFollowers: number;
  mentionCount: number;
  relations: RelationEntry[];
}

export interface SearchResult {
  id: string;          // uuid
  type: EntityType;
  name: string;
  city: string | null;
}
