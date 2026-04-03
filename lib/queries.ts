import { Pool } from 'pg';
import type { GraphNode, GraphEdge, GraphData, Entity, RelationEntry, SearchResult, EntityType, GeoGroup } from './types';

// ── Select ID → label maps ─────────────────────────────────────────────────

const ENTITY_TYPES: Record<string, string> = {
  '3296': 'person',
  '3297': 'institution',
  '3298': 'event',
  '3299': 'artwork',
  '3300': 'venue',
};

const RELATION_TYPES: Record<string, string> = {
  '3314': 'participated_in',
  '3317': 'located_in',
  '3312': 'artist_at',
  '3313': 'exhibited_at',
  '3309': 'founder',
  '3310': 'director',
  '3311': 'curator',
  '3315': 'organized',
  '3308': 'member_of',
  '3321': 'collaborated',
  '3327': 'designer_at',
  '3325': 'musician_at',
  '3318': 'part_of',
};

const CONFIDENCE: Record<string, string> = {
  '3329': 'auto',
  '3330': 'verified',
  '3331': 'disputed',
};

function resolve(val: unknown, map: Record<string, string>): string | null {
  if (val == null) return null;
  return map[String(val)] || null;
}

// ── Graph data ──────────────────────────────────────────────────────────────

export async function fetchGraphData(pool: Pool): Promise<GraphData> {
  // Exclude artworks (3299) and located_in (3317) by default
  const nodesQuery = `
    SELECT
      field_7676::text AS uuid,
      field_7653 AS name,
      field_7656::text AS entity_type_id,
      field_7657 AS city,
      field_7658 AS country,
      COALESCE(field_7670::numeric, 0)::int AS kgart_score,
      COALESCE(field_7671::numeric, 0)::int AS ig_followers,
      COALESCE(field_7672::numeric, 0)::int AS mention_count
    FROM graph.entities
    WHERE NOT trashed
      AND field_7676 IS NOT NULL
      AND field_7656::text != '3299'
  `;

  const relationsQuery = `
    SELECT
      field_7690::text AS uuid,
      field_7678::text AS from_uuid,
      field_7680::text AS to_uuid,
      field_7682::text AS relation_type_id
    FROM graph.relations
    WHERE NOT trashed
      AND field_7678 IS NOT NULL
      AND field_7680 IS NOT NULL
      AND field_7682::text != '3317'
  `;

  // Geo group: primary = field_7669 on entity, fallback = located_in → toponym.geo_relevance
  const geoDirectQuery = `
    SELECT field_7676::text AS uuid, field_7669::text AS geo_id
    FROM graph.entities
    WHERE NOT trashed AND field_7676 IS NOT NULL AND field_7669 IS NOT NULL
  `;

  // Fallback via toponym join; priority KG > CA > USSR > world
  const geoTopoQuery = `
    SELECT DISTINCT ON (entity_uuid) entity_uuid, geo_rel
    FROM (
      SELECT r.field_7678::text AS entity_uuid, t.field_7721::text AS geo_rel
      FROM graph.relations r
      JOIN graph.toponyms t ON t.field_7724::text = r.field_7680::text
      WHERE r.field_7682::text = '3317' AND NOT r.trashed AND NOT t.trashed
    ) sub
    ORDER BY entity_uuid,
      CASE geo_rel WHEN '3366' THEN 0 WHEN '3367' THEN 1 WHEN '3368' THEN 2 WHEN '3369' THEN 3 ELSE 4 END
  `;

  const GEO_DIRECT: Record<string, GeoGroup> = { '3304': 'kg', '3305': 'ca', '3306': 'ussr', '3307': 'world' };
  const GEO_TOPO: Record<string, GeoGroup> = { '3366': 'kg', '3367': 'ca', '3368': 'ussr', '3369': 'world' };

  const [nodesRes, relationsRes, geoDirectRes, geoTopoRes] = await Promise.all([
    pool.query(nodesQuery),
    pool.query(relationsQuery),
    pool.query(geoDirectQuery),
    pool.query(geoTopoQuery),
  ]);

  // Build geo map: toponym first, then override with direct entity field (higher priority)
  const geoMap = new Map<string, GeoGroup>();
  for (const row of geoTopoRes.rows) {
    const g = GEO_TOPO[row.geo_rel];
    if (g) geoMap.set(row.entity_uuid, g);
  }
  for (const row of geoDirectRes.rows) {
    const g = GEO_DIRECT[row.geo_id];
    if (g) geoMap.set(row.uuid, g);
  }

  const nodeMap = new Map<string, GraphNode>();
  const weightMap = new Map<string, number>();

  for (const row of nodesRes.rows) {
    const entityType = (resolve(row.entity_type_id, ENTITY_TYPES) || 'person') as EntityType;
    nodeMap.set(row.uuid, {
      id: row.uuid,
      type: entityType,
      name: row.name || 'Unknown',
      city: row.city || null,
      country: row.country || null,
      kgartScore: row.kgart_score || 0,
      igFollowers: row.ig_followers || 0,
      mentionCount: row.mention_count || 0,
      geoGroup: geoMap.get(row.uuid) || null,
      weight: 0,
    });
    weightMap.set(row.uuid, 0);
  }

  const edges: GraphEdge[] = [];

  for (const row of relationsRes.rows) {
    const srcId = row.from_uuid;
    const tgtId = row.to_uuid;
    if (!nodeMap.has(srcId) || !nodeMap.has(tgtId)) continue;
    if (srcId === tgtId) continue;

    const relType = resolve(row.relation_type_id, RELATION_TYPES) || 'related';
    edges.push({
      id: row.uuid,
      source: srcId,
      target: tgtId,
      type: relType,
      date: null,
    });
    weightMap.set(srcId, (weightMap.get(srcId) || 0) + 1);
    weightMap.set(tgtId, (weightMap.get(tgtId) || 0) + 1);
  }

  for (const [nodeId, w] of weightMap) {
    const node = nodeMap.get(nodeId);
    if (node) node.weight = w;
  }

  // Deduplicate edges (same pair → keep first)
  const edgeMap = new Map<string, GraphEdge>();
  for (const e of edges) {
    const key = [e.source, e.target].sort().join('|');
    if (!edgeMap.has(key)) edgeMap.set(key, e);
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

// ── Entity details ──────────────────────────────────────────────────────────

export async function fetchEntity(pool: Pool, uuid: string): Promise<Entity | null> {
  const entityRes = await pool.query(`
    SELECT
      field_7676::text AS uuid,
      field_7653 AS name,
      field_7654 AS name_ru,
      field_7655 AS name_original,
      field_7656::text AS entity_type_id,
      field_7657 AS city,
      field_7658 AS country,
      field_7659 AS description,
      field_7660 AS instagram,
      COALESCE(field_7670::numeric, 0)::int AS kgart_score,
      COALESCE(field_7671::numeric, 0)::int AS ig_followers,
      COALESCE(field_7672::numeric, 0)::int AS mention_count
    FROM graph.entities
    WHERE field_7676::text = $1 AND NOT trashed
  `, [uuid]);

  if (entityRes.rows.length === 0) return null;
  const e = entityRes.rows[0];

  const relationsRes = await pool.query(`
    SELECT
      field_7690::text AS uuid,
      field_7678::text AS from_uuid,
      field_7679 AS from_name,
      field_7680::text AS to_uuid,
      field_7681 AS to_name,
      field_7682::text AS relation_type_id,
      field_7683::text AS date_start,
      field_7684::text AS date_end,
      field_7686::text AS confidence_id
    FROM graph.relations
    WHERE NOT trashed
      AND (field_7678::text = $1 OR field_7680::text = $1)
    ORDER BY field_7683 DESC NULLS LAST
  `, [uuid]);

  const relations: RelationEntry[] = relationsRes.rows.map(r => ({
    id: r.uuid,
    type: resolve(r.relation_type_id, RELATION_TYPES) || r.relation_type_id || 'related',
    fromUuid: r.from_uuid,
    fromName: r.from_name || null,
    toUuid: r.to_uuid,
    toName: r.to_name || null,
    dateStart: r.date_start || null,
    dateEnd: r.date_end || null,
    confidence: resolve(r.confidence_id, CONFIDENCE),
  }));

  const entityType = (resolve(e.entity_type_id, ENTITY_TYPES) || 'person') as EntityType;

  return {
    id: e.uuid,
    type: entityType,
    name: e.name || 'Unknown',
    nameRu: e.name_ru || null,
    nameOriginal: e.name_original || null,
    city: e.city || null,
    country: e.country || null,
    description: e.description || null,
    instagram: e.instagram || null,
    kgartScore: e.kgart_score || 0,
    igFollowers: e.ig_followers || 0,
    mentionCount: e.mention_count || 0,
    relations,
  };
}

// ── Search ──────────────────────────────────────────────────────────────────

export async function searchEntities(pool: Pool, query: string, limit = 20): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const sql = `
    SELECT
      field_7676::text AS uuid,
      field_7653 AS name,
      field_7656::text AS entity_type_id,
      field_7657 AS city
    FROM graph.entities
    WHERE NOT trashed
      AND field_7656::text != '3299'
      AND (
        field_7653 ILIKE $1
        OR field_7654 ILIKE $1
        OR field_7660 ILIKE $1
      )
    ORDER BY
      CASE WHEN field_7653 ILIKE $1 THEN 0 ELSE 1 END,
      field_7653
    LIMIT $2
  `;
  const res = await pool.query(sql, [pattern, limit]);
  return res.rows.map(r => ({
    id: r.uuid,
    type: (resolve(r.entity_type_id, ENTITY_TYPES) || 'person') as EntityType,
    name: r.name || 'Unknown',
    city: r.city || null,
  }));
}
