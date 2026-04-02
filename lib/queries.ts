import { Pool } from 'pg';
import type {
  GraphNode, GraphEdge, GraphData, Project, Person, Event,
  RoleEntry, EventSummary, SearchResult,
} from './types';

// ── Select ID → label maps ─────────────────────────────────────────────────

const ROLES: Record<string, string> = {
  '3260': 'director', '3261': 'curator', '3262': 'artist',
  '3263': 'participant', '3264': 'founder', '3265': 'manager', '3266': 'other',
  '3272': 'teacher', '3273': 'actor', '3274': 'playwright',
  '3275': 'producer', '3276': 'screenwriter', '3277': 'photographer',
  '3278': 'musician', '3279': 'designer', '3280': 'architect',
  '3281': 'writer', '3282': 'journalist', '3283': 'activist',
  '3284': 'critic', '3285': 'collector', '3286': 'administrator',
  '3287': 'cameraman', '3288': 'sound_engineer', '3289': 'choreographer',
  '3290': 'lecturer',
};
const EVENT_TYPES: Record<string, string> = {
  '3238': 'exhibition', '3239': 'festival', '3240': 'opening',
  '3241': 'talk', '3242': 'workshop', '3243': 'performance',
  '3244': 'fair', '3245': 'residency', '3246': 'other',
};
const PROJECT_TYPES: Record<string, string> = {
  '3247': 'museum', '3248': 'gallery', '3249': 'theater',
  '3250': 'residency', '3251': 'festival', '3252': 'collective',
  '3253': 'foundation', '3254': 'school', '3255': 'platform', '3256': 'other',
};
const PROJECT_STATUSES: Record<string, string> = {
  '3257': 'active', '3258': 'archive', '3259': 'unknown',
};
const RELATION_TYPES: Record<string, string> = {
  '3267': 'participates_in', '3268': 'shows_work',
  '3269': 'organizes', '3271': 'authored_by',
};
// from_table value → EntityType
const TABLE_TO_TYPE: Record<string, string> = {
  'people': 'person', 'projects': 'project', 'events': 'event',
};

function resolve(val: unknown, map: Record<string, string>): string | null {
  if (val == null) return null;
  return map[String(val)] || null;
}

// ── Graph data ──────────────────────────────────────────────────────────────

export async function fetchGraphData(pool: Pool): Promise<GraphData> {
  // Nodes: UUID as stable ID, row id for card navigation
  const nodesQuery = `
    SELECT field_7627::text as uuid, id, 'project' as type,
           field_7556 as name, field_7566 as city, field_7565::text as subtype
    FROM graph.projects WHERE field_7627 IS NOT NULL
    UNION ALL
    SELECT field_7628::text, id, 'event',
           field_7542, field_7545, field_7543::text
    FROM graph.events WHERE field_7628 IS NOT NULL
    UNION ALL
    SELECT field_7626::text, id, 'person',
           field_7559, field_7576, NULL::text
    FROM graph.people WHERE field_7626 IS NOT NULL
  `;

  // Graph edges with from_table/to_table — exclude artworks
  const edgesQuery = `
    SELECT field_7468::text as from_uuid, field_7470::text as to_uuid,
           field_7614 as from_table, field_7615 as to_table,
           field_7472::text as rel_type, field_7473 as weight
    FROM graph.edges
    WHERE field_7614 != 'artworks' AND field_7615 != 'artworks'
  `;

  const [nodesRes, edgesRes] = await Promise.all([
    pool.query(nodesQuery),
    pool.query(edgesQuery),
  ]);

  // UUID → node
  const nodeMap = new Map<string, GraphNode>();
  const weightMap = new Map<string, number>();

  for (const row of nodesRes.rows) {
    const type = row.type as 'project' | 'event' | 'person';
    const nodeId = row.uuid;
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

  for (const row of edgesRes.rows) {
    const srcId = row.from_uuid;
    const tgtId = row.to_uuid;
    if (!nodeMap.has(srcId) || !nodeMap.has(tgtId)) continue;
    if (srcId === tgtId) continue;
    const relType = resolve(row.rel_type, RELATION_TYPES) || 'related';
    const w = parseFloat(row.weight) || 1;
    edges.push({ source: srcId, target: tgtId, type: relType, weight: w, date: null });
    weightMap.set(srcId, (weightMap.get(srcId) || 0) + w);
    weightMap.set(tgtId, (weightMap.get(tgtId) || 0) + w);
  }

  for (const [nodeId, w] of weightMap) {
    const node = nodeMap.get(nodeId);
    if (node) node.weight = w;
  }

  // Deduplicate edges (same pair → merge weight)
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

  // Events linked via graph edges (project UUID → event)
  const projUuid = r.field_7627;
  let eventsRes = { rows: [] as { id: number; name: string; type: string; date_start: string }[] };
  if (projUuid) {
    try {
      eventsRes = await pool.query(`
        SELECT DISTINCT e.id, e.field_7542 as name, e.field_7543::text as type, e.field_7546::text as date_start
        FROM graph.edges ed
        JOIN graph.events e ON e.field_7628 = CASE
          WHEN ed.field_7468 = $1 THEN ed.field_7470
          ELSE ed.field_7468
        END
        WHERE (ed.field_7468 = $1 OR ed.field_7470 = $1)
          AND ((ed.field_7614 = 'events' AND ed.field_7615 = 'projects')
            OR (ed.field_7614 = 'projects' AND ed.field_7615 = 'events'))
        ORDER BY e.field_7546 DESC NULLS LAST
      `, [projUuid]);
    } catch { /* ok */ }
  }

  // Also try event.project_id FK
  try {
    const eventsFK = await pool.query(`
      SELECT id, field_7542 as name, field_7543::text as type, field_7546::text as date_start
      FROM graph.events
      WHERE field_7613::text = $1::text
      ORDER BY field_7546 DESC NULLS LAST
    `, [String(id)]);
    // Merge, avoid duplicates
    const seen = new Set(eventsRes.rows.map(e => e.id));
    for (const er of eventsFK.rows) {
      if (!seen.has(er.id)) eventsRes.rows.push(er);
    }
  } catch { /* ok */ }

  return {
    id: r.id,
    name: r.field_7556 || 'Unknown',
    nameRu: r.field_7609 || null,
    nameOriginal: r.field_7610 || null,
    type: resolve(r.field_7565, PROJECT_TYPES),
    city: r.field_7566 || null,
    address: r.field_7567 || null,
    phone: r.field_7568 || null,
    email: r.field_7569 || null,
    website: r.field_7570 || null,
    instagram: r.field_7571 || null,
    telegram: r.field_7572 || null,
    description: r.field_7573 || null,
    status: resolve(r.field_7574, PROJECT_STATUSES),
    team: teamRes.rows.map(tr => ({
      role: resolve(tr.role_id, ROLES) || tr.role_text || 'other',
      roleText: tr.role_text || null,
      period: tr.period || null,
      personId: tr.person_id || null,
      personName: tr.person_name || null,
      projectId: null, projectName: null,
    })),
    events: eventsRes.rows.map(er => ({
      id: er.id,
      name: er.name || 'Unknown',
      type: resolve(er.type, EVENT_TYPES),
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

  // Events via graph edges (person UUID)
  const personUuid = r.field_7626;
  let eventsRes = { rows: [] as { id: number; name: string; type: string; date_start: string }[] };
  if (personUuid) {
    try {
      eventsRes = await pool.query(`
        SELECT DISTINCT e.id, e.field_7542 as name, e.field_7543::text as type, e.field_7546::text as date_start
        FROM graph.edges ed
        JOIN graph.events e ON e.field_7628 = CASE
          WHEN ed.field_7468 = $1 THEN ed.field_7470
          ELSE ed.field_7468
        END
        WHERE (ed.field_7468 = $1 OR ed.field_7470 = $1)
          AND (ed.field_7614 = 'events' OR ed.field_7615 = 'events')
          AND ed.field_7472::text IN ('3267', '3269')
        ORDER BY e.field_7546 DESC NULLS LAST
      `, [personUuid]);
    } catch { /* ok */ }
  }

  // Artworks via graph edges (person UUID → artwork)
  let artworksRes = { rows: [] as { id: number; title: string; medium: string; first_seen: string }[] };
  if (personUuid) {
    try {
      artworksRes = await pool.query(`
        SELECT DISTINCT a.id, a.field_7600 as title, a.field_7603 as medium, a.field_7604::text as first_seen
        FROM graph.edges ed
        JOIN graph.artworks a ON a.field_7614 = CASE
          WHEN ed.field_7468 = $1 THEN ed.field_7470
          ELSE ed.field_7468
        END
        WHERE (ed.field_7468 = $1 OR ed.field_7470 = $1)
          AND (ed.field_7614 = 'artworks' OR ed.field_7615 = 'artworks')
        ORDER BY a.field_7604 DESC NULLS LAST
      `, [personUuid]);
    } catch { /* ok */ }
  }

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
      role: resolve(rr.role_id, ROLES) || rr.role_text || 'other',
      roleText: rr.role_text || null,
      period: rr.period || null,
      personId: null, personName: null,
      projectId: rr.project_id || null,
      projectName: rr.project_name || null,
    })),
    events: eventsRes.rows.map(er => ({
      id: er.id,
      name: er.name || 'Unknown',
      type: resolve(er.type, EVENT_TYPES),
      dateStart: er.date_start || null,
    })),
    artworks: artworksRes.rows.map(ar => ({
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
    try {
      const projRes = await pool.query(
        `SELECT id, field_7556 as name FROM graph.projects WHERE id = $1`,
        [parseInt(String(projId))]
      );
      if (projRes.rows.length > 0) {
        project = { id: projRes.rows[0].id, name: projRes.rows[0].name };
      }
    } catch { /* ok */ }
  }

  return {
    id: r.id,
    name: r.field_7542 || 'Unknown',
    type: resolve(r.field_7543, EVENT_TYPES),
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
