import { Pool } from 'pg';
import type {
  GraphNode, GraphEdge, GraphData, Project, Person, Event,
  RoleEntry, EventSummary, SearchResult,
} from './types';

// Tables are in graph.* schema on shared postgres (kcsi DB)
// Column names are still field_XXXX (Baserow convention, copied via pg_dump)

// ── Graph data ──────────────────────────────────────────────────────────────

export async function fetchGraphData(pool: Pool): Promise<GraphData> {
  const nodesQuery = `
    SELECT id, 'project' as type, field_7556 as name,
           field_7566 as city, field_7565::text as subtype
    FROM graph.projects
    UNION ALL
    SELECT id, 'event' as type, field_7542 as name,
           field_7545 as city, field_7543::text as subtype
    FROM graph.events
    UNION ALL
    SELECT id, 'person' as type, field_7559 as name,
           field_7576 as city, NULL::text as subtype
    FROM graph.people
  `;

  const rolesEdgesQuery = `
    SELECT field_7585 as person_id, field_7584 as project_id
    FROM graph.roles
    WHERE field_7585 IS NOT NULL AND field_7584 IS NOT NULL
  `;

  const eventProjectQuery = `
    SELECT id as event_id, field_7613::text as project_id, field_7546::text as date
    FROM graph.events
    WHERE field_7613 IS NOT NULL AND field_7613::text != '' AND field_7613::text != '0'
  `;

  // Graph edges (table 766) use row IDs that match project/people IDs directly.
  // Build a map of all known IDs to their node type.
  const entityMapQuery = `
    SELECT id::text as eid, 'project' as type FROM graph.projects
    UNION ALL
    SELECT id::text as eid, 'person' as type FROM graph.people
  `;

  const graphEdgesQuery = `
    SELECT field_7468::text as from_id, field_7470::text as to_id,
           field_7472::text as rel_type, field_7473 as weight,
           field_7475::text as date
    FROM graph.edges
  `;

  const [nodesRes, rolesRes, eventProjRes, entityMapRes, graphEdgesRes] = await Promise.all([
    pool.query(nodesQuery),
    pool.query(rolesEdgesQuery),
    pool.query(eventProjectQuery),
    pool.query(entityMapQuery),
    pool.query(graphEdgesQuery),
  ]);

  // Build row_id → node_id map
  const eid2node = new Map<string, string>();
  for (const row of entityMapRes.rows) {
    eid2node.set(String(row.eid), `${row.type}_${row.eid}`);
  }

  const nodeMap = new Map<string, GraphNode>();
  const weightMap = new Map<string, number>();

  for (const row of nodesRes.rows) {
    const type = row.type as 'project' | 'event' | 'person';
    const nodeId = `${type}_${row.id}`;
    nodeMap.set(nodeId, {
      id: nodeId, dbId: row.id, type,
      name: row.name || 'Unknown',
      city: row.city || null,
      subtype: row.subtype || null,
      weight: 0,
    });
    weightMap.set(nodeId, 0);
  }

  const edges: GraphEdge[] = [];
  const RELATION_LABELS: Record<string, string> = {
    '3202': 'co_mention', '3203': 'tagged',
    '3267': 'participates_in', '3268': 'shows_work',
    '3269': 'organizes', '3270': 'located_in', '3271': 'authored_by',
  };

  // Graph edges (table 766) — resolve via entity map
  for (const row of graphEdgesRes.rows) {
    const sourceId = eid2node.get(row.from_id);
    const targetId = eid2node.get(row.to_id);
    if (!sourceId || !targetId || !nodeMap.has(sourceId) || !nodeMap.has(targetId)) continue;
    if (sourceId === targetId) continue;
    const relType = RELATION_LABELS[row.rel_type] || 'related';
    const w = parseFloat(row.weight) || 1;
    edges.push({ source: sourceId, target: targetId, type: relType, weight: w, date: row.date || null });
    weightMap.set(sourceId, (weightMap.get(sourceId) || 0) + w);
    weightMap.set(targetId, (weightMap.get(targetId) || 0) + w);
  }

  // Roles edges (person↔project)
  for (const row of rolesRes.rows) {
    const sourceId = `person_${row.person_id}`;
    const targetId = `project_${row.project_id}`;
    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) continue;
    edges.push({ source: sourceId, target: targetId, type: 'has_role', weight: 1, date: null });
    weightMap.set(sourceId, (weightMap.get(sourceId) || 0) + 1);
    weightMap.set(targetId, (weightMap.get(targetId) || 0) + 1);
  }

  // Event→Project edges
  for (const row of eventProjRes.rows) {
    const sourceId = `event_${row.event_id}`;
    let projId: number;
    try { projId = parseInt(row.project_id); } catch { continue; }
    const targetId = `project_${projId}`;
    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) continue;
    edges.push({ source: sourceId, target: targetId, type: 'hosted_by', weight: 1, date: row.date });
    weightMap.set(sourceId, (weightMap.get(sourceId) || 0) + 1);
    weightMap.set(targetId, (weightMap.get(targetId) || 0) + 1);
  }

  for (const [nodeId, w] of weightMap) {
    const node = nodeMap.get(nodeId);
    if (node) node.weight = w;
  }

  const edgeMap = new Map<string, GraphEdge>();
  for (const e of edges) {
    const key = [e.source, e.target].sort().join('|');
    const existing = edgeMap.get(key);
    if (existing) existing.weight += e.weight;
    else edgeMap.set(key, { ...e });
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

// ── Entity details ──────────────────────────────────────────────────────────

export async function fetchProject(pool: Pool, id: number): Promise<Project | null> {
  const res = await pool.query(`SELECT * FROM graph.projects WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;
  const r = res.rows[0];

  const teamRes = await pool.query(`
    SELECT r.field_7586::text as role_id, r.field_7587 as role_text,
           r.field_7588 as period, r.field_7585 as person_id,
           p.field_7559 as person_name
    FROM graph.roles r
    LEFT JOIN graph.people p ON p.id = r.field_7585
    WHERE r.field_7584 = $1
  `, [id]);

  const eventsRes = await pool.query(`
    SELECT id, field_7542 as name, field_7543::text as type, field_7546::text as date_start
    FROM graph.events
    WHERE field_7613::text = $1::text
    ORDER BY field_7546 DESC NULLS LAST
  `, [String(id)]);

  return {
    id: r.id,
    name: r.field_7556 || 'Unknown',
    nameRu: r.field_7609 || null,
    nameOriginal: r.field_7610 || null,
    type: r.field_7565 ? String(r.field_7565) : null,
    city: r.field_7566 || null,
    address: r.field_7567 || null,
    phone: r.field_7568 || null,
    email: r.field_7569 || null,
    website: r.field_7570 || null,
    instagram: r.field_7571 || null,
    telegram: r.field_7572 || null,
    description: r.field_7573 || null,
    status: r.field_7574 ? String(r.field_7574) : null,
    team: teamRes.rows.map(tr => ({
      role: tr.role_id || tr.role_text || 'other',
      roleText: tr.role_text || null,
      period: tr.period || null,
      personId: tr.person_id || null,
      personName: tr.person_name || null,
      projectId: null, projectName: null,
    })),
    events: eventsRes.rows.map(er => ({
      id: er.id,
      name: er.name || 'Unknown',
      type: er.type ? String(er.type) : null,
      dateStart: er.date_start || null,
    })),
  };
}

export async function fetchPerson(pool: Pool, id: number): Promise<Person | null> {
  const res = await pool.query(`SELECT * FROM graph.people WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;
  const r = res.rows[0];

  const rolesRes = await pool.query(`
    SELECT r.field_7586::text as role_id, r.field_7587 as role_text,
           r.field_7588 as period, r.field_7584 as project_id,
           p.field_7556 as project_name
    FROM graph.roles r
    LEFT JOIN graph.projects p ON p.id = r.field_7584
    WHERE r.field_7585 = $1
  `, [id]);

  // Events linked to this person via graph edges (PARTICIPATES_IN, ORGANIZES)
  const eventsRes = await pool.query(`
    SELECT DISTINCT e.id, e.field_7542 as name, e.field_7543::text as type, e.field_7546::text as date_start
    FROM graph.edges ed
    JOIN graph.events e ON (
      (ed.field_7470 = $1 AND e.id = ed.field_7468) OR
      (ed.field_7468 = $1 AND e.id = ed.field_7470)
    )
    WHERE ed.field_7472::text IN ('3267', '3269')
    ORDER BY e.field_7546 DESC NULLS LAST
  `, [id]);

  // Artworks by this person (author_id = person id)
  const artworksRes = await pool.query(`
    SELECT id, field_7600 as title, field_7603 as medium, field_7604::text as first_seen
    FROM graph.artworks
    WHERE field_7602 = $1
    ORDER BY field_7604 DESC NULLS LAST
  `, [id]);

  return {
    id: r.id,
    name: r.field_7559 || 'Unknown',
    nameRu: r.field_7611 || null,
    nameOriginal: r.field_7612 || null,
    city: r.field_7576 || null,
    phone: r.field_7577 || null,
    email: r.field_7578 || null,
    website: r.field_7579 || null,
    instagram: r.field_7580 || null,
    telegram: r.field_7581 || null,
    bio: r.field_7582 || null,
    roles: rolesRes.rows.map(rr => ({
      role: rr.role_id || rr.role_text || 'other',
      roleText: rr.role_text || null,
      period: rr.period || null,
      personId: null, personName: null,
      projectId: rr.project_id || null,
      projectName: rr.project_name || null,
    })),
    events: eventsRes.rows.map(er => ({
      id: er.id,
      name: er.name || 'Unknown',
      type: er.type ? String(er.type) : null,
      dateStart: er.date_start || null,
    })),
    artworks: (artworksRes?.rows || []).map(ar => ({
      id: ar.id,
      title: ar.title || 'Untitled',
      medium: ar.medium || null,
      firstSeen: ar.first_seen || null,
    })),
  };
}

export async function fetchEvent(pool: Pool, id: number): Promise<Event | null> {
  const res = await pool.query(`SELECT * FROM graph.events WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;
  const r = res.rows[0];

  let project: { id: number; name: string } | null = null;
  const projId = r.field_7613;
  if (projId && String(projId) !== '0' && String(projId) !== '') {
    const projRes = await pool.query(
      `SELECT id, field_7556 as name FROM graph.projects WHERE id = $1`,
      [parseInt(String(projId))]
    );
    if (projRes.rows.length > 0) {
      project = { id: projRes.rows[0].id, name: projRes.rows[0].name };
    }
  }

  return {
    id: r.id,
    name: r.field_7542 || 'Unknown',
    type: r.field_7543 ? String(r.field_7543) : null,
    venue: r.field_7544 || null,
    city: r.field_7545 || null,
    dateStart: r.field_7546 ? String(r.field_7546) : null,
    dateEnd: r.field_7547 ? String(r.field_7547) : null,
    dateText: r.field_7548 || null,
    participants: r.field_7549 || null,
    description: r.field_7550 || null,
    mentionCount: parseInt(r.field_7553) || 0,
    project,
  };
}

export async function searchEntities(pool: Pool, query: string, limit = 20): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const sql = `
    SELECT id, 'project' as type, field_7556 as name,
           field_7566 as city, field_7565::text as subtype
    FROM graph.projects
    WHERE field_7556 ILIKE $1 OR field_7609 ILIKE $1 OR field_7571 ILIKE $1
    UNION ALL
    SELECT id, 'event' as type, field_7542 as name,
           field_7545 as city, field_7543::text as subtype
    FROM graph.events WHERE field_7542 ILIKE $1
    UNION ALL
    SELECT id, 'person' as type, field_7559 as name,
           field_7576 as city, NULL::text as subtype
    FROM graph.people
    WHERE field_7559 ILIKE $1 OR field_7611 ILIKE $1 OR field_7580 ILIKE $1
    LIMIT $2
  `;
  const res = await pool.query(sql, [pattern, limit]);
  return res.rows.map(r => ({
    id: r.id, type: r.type,
    name: r.name || 'Unknown',
    city: r.city || null,
    subtype: r.subtype || null,
  }));
}
