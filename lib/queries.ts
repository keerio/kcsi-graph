import { Pool } from 'pg';
import {
  TBL_PROJECTS, TBL_EVENTS, TBL_PEOPLE, TBL_ROLES, TBL_EDGES,
  F775, F776, F777, F778, F766,
  EVENT_TYPES, PROJECT_TYPES, ROLES, RELATION_TYPES, PROJECT_STATUSES,
} from './constants';
import type {
  GraphNode, GraphEdge, GraphData, Project, Person, Event,
  RoleEntry, EventSummary, SearchResult,
} from './types';

// ── Helper: resolve Baserow select field (stored as integer ID) ─────────────

function resolveSelect(value: unknown, map: Record<number, string>): string | null {
  if (value == null) return null;
  const id = typeof value === 'number' ? value : parseInt(String(value));
  return map[id] || null;
}

// ── Graph data ──────────────────────────────────────────────────────────────

export async function fetchGraphData(pool: Pool, dateFrom?: string, dateTo?: string): Promise<GraphData> {
  // 1. Fetch all nodes
  const nodesQuery = `
    SELECT id, 'project' as type, "${F776.project_name}" as name,
           "${F776.city}" as city, "${F776.project_type}" as subtype
    FROM ${TBL_PROJECTS} WHERE trashed = false
    UNION ALL
    SELECT id, 'event' as type, "${F775.event_name}" as name,
           "${F775.city}" as city, "${F775.event_type}" as subtype
    FROM ${TBL_EVENTS} WHERE trashed = false
    UNION ALL
    SELECT id, 'person' as type, "${F777.person_name}" as name,
           "${F777.city}" as city, NULL::text as subtype
    FROM ${TBL_PEOPLE} WHERE trashed = false
  `;

  // 2. Fetch edges from ProjectRoles (person↔project)
  const rolesEdgesQuery = `
    SELECT "${F778.person_id}" as source_id, 'person' as source_type,
           "${F778.project_id}" as target_id, 'project' as target_type,
           'has_role' as rel_type, 1 as weight, NULL::text as date
    FROM ${TBL_ROLES} WHERE trashed = false
      AND "${F778.person_id}" IS NOT NULL
      AND "${F778.project_id}" IS NOT NULL
  `;

  // 3. Fetch edges from Events→Projects (event hosted by project)
  const eventProjectQuery = `
    SELECT id as source_id, 'event' as source_type,
           "${F775.project_id}"::int as target_id, 'project' as target_type,
           'hosted_by' as rel_type, 1 as weight,
           "${F775.date_start}"::text as date
    FROM ${TBL_EVENTS} WHERE trashed = false
      AND "${F775.project_id}" IS NOT NULL
      AND "${F775.project_id}"::text != ''
      AND "${F775.project_id}"::text != '0'
  `;

  const [nodesRes, rolesRes, eventProjRes] = await Promise.all([
    pool.query(nodesQuery),
    pool.query(rolesEdgesQuery),
    pool.query(eventProjectQuery),
  ]);

  // Build node map
  const nodeMap = new Map<string, GraphNode>();
  const weightMap = new Map<string, number>();

  for (const row of nodesRes.rows) {
    const type = row.type as 'project' | 'event' | 'person';
    const nodeId = `${type}_${row.id}`;
    const subtypeMap = type === 'project' ? PROJECT_TYPES : type === 'event' ? EVENT_TYPES : {};
    nodeMap.set(nodeId, {
      id: nodeId,
      dbId: row.id,
      type,
      name: row.name || 'Unknown',
      city: row.city || null,
      subtype: resolveSelect(row.subtype, subtypeMap),
      weight: 0,
    });
    weightMap.set(nodeId, 0);
  }

  // Build edges
  const edges: GraphEdge[] = [];

  // Roles edges (person↔project)
  for (const row of rolesRes.rows) {
    const sourceId = `person_${row.source_id}`;
    const targetId = `project_${row.target_id}`;
    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) continue;

    if (dateFrom || dateTo) {
      // Roles don't have dates — always include
    }

    edges.push({
      source: sourceId,
      target: targetId,
      type: 'has_role',
      weight: 1,
      date: null,
    });
    weightMap.set(sourceId, (weightMap.get(sourceId) || 0) + 1);
    weightMap.set(targetId, (weightMap.get(targetId) || 0) + 1);
  }

  // Event→Project edges
  for (const row of eventProjRes.rows) {
    const sourceId = `event_${row.source_id}`;
    const targetId = `project_${row.target_id}`;
    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) continue;

    if (dateFrom && row.date && row.date < dateFrom) continue;
    if (dateTo && row.date && row.date > dateTo) continue;

    edges.push({
      source: sourceId,
      target: targetId,
      type: 'hosted_by',
      weight: 1,
      date: row.date,
    });
    weightMap.set(sourceId, (weightMap.get(sourceId) || 0) + 1);
    weightMap.set(targetId, (weightMap.get(targetId) || 0) + 1);
  }

  // Apply weights
  for (const [nodeId, w] of weightMap) {
    const node = nodeMap.get(nodeId);
    if (node) node.weight = w;
  }

  // Deduplicate edges (same source+target pair → merge)
  const edgeKey = (e: GraphEdge) => `${e.source}|${e.target}`;
  const edgeMap = new Map<string, GraphEdge>();
  for (const e of edges) {
    const key = edgeKey(e);
    const existing = edgeMap.get(key);
    if (existing) {
      existing.weight += e.weight;
    } else {
      edgeMap.set(key, { ...e });
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

// ── Entity details ──────────────────────────────────────────────────────────

export async function fetchProject(pool: Pool, id: number): Promise<Project | null> {
  const res = await pool.query(
    `SELECT * FROM ${TBL_PROJECTS} WHERE id = $1 AND trashed = false`, [id]
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];

  // Fetch team (roles)
  const teamRes = await pool.query(`
    SELECT r."${F778.role}" as role_id, r."${F778.role_text}" as role_text,
           r."${F778.period}" as period, r."${F778.person_id}" as person_id,
           p."${F777.person_name}" as person_name
    FROM ${TBL_ROLES} r
    LEFT JOIN ${TBL_PEOPLE} p ON p.id = r."${F778.person_id}" AND p.trashed = false
    WHERE r."${F778.project_id}" = $1 AND r.trashed = false
  `, [id]);

  // Fetch events
  const eventsRes = await pool.query(`
    SELECT id, "${F775.event_name}" as name, "${F775.event_type}" as type,
           "${F775.date_start}" as date_start
    FROM ${TBL_EVENTS}
    WHERE "${F775.project_id}"::text = $1::text AND trashed = false
    ORDER BY "${F775.date_start}" DESC NULLS LAST
  `, [String(id)]);

  return {
    id: r.id,
    name: r[F776.project_name] || 'Unknown',
    nameRu: r[F776.name_ru] || null,
    nameOriginal: r[F776.name_original] || null,
    type: resolveSelect(r[F776.project_type], PROJECT_TYPES),
    city: r[F776.city] || null,
    address: r[F776.address] || null,
    phone: r[F776.phone] || null,
    email: r[F776.email] || null,
    website: r[F776.website] || null,
    instagram: r[F776.instagram] || null,
    telegram: r[F776.telegram] || null,
    description: r[F776.description] || null,
    status: resolveSelect(r[F776.status], PROJECT_STATUSES),
    team: teamRes.rows.map(tr => ({
      role: resolveSelect(tr.role_id, ROLES) || tr.role_text || 'other',
      roleText: tr.role_text || null,
      period: tr.period || null,
      personId: tr.person_id || null,
      personName: tr.person_name || null,
      projectId: null,
      projectName: null,
    })),
    events: eventsRes.rows.map(er => ({
      id: er.id,
      name: er.name || 'Unknown',
      type: resolveSelect(er.type, EVENT_TYPES),
      dateStart: er.date_start || null,
    })),
  };
}

export async function fetchPerson(pool: Pool, id: number): Promise<Person | null> {
  const res = await pool.query(
    `SELECT * FROM ${TBL_PEOPLE} WHERE id = $1 AND trashed = false`, [id]
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];

  const rolesRes = await pool.query(`
    SELECT r."${F778.role}" as role_id, r."${F778.role_text}" as role_text,
           r."${F778.period}" as period, r."${F778.project_id}" as project_id,
           p."${F776.project_name}" as project_name
    FROM ${TBL_ROLES} r
    LEFT JOIN ${TBL_PROJECTS} p ON p.id = r."${F778.project_id}" AND p.trashed = false
    WHERE r."${F778.person_id}" = $1 AND r.trashed = false
  `, [id]);

  return {
    id: r.id,
    name: r[F777.person_name] || 'Unknown',
    nameRu: r[F777.name_ru] || null,
    nameOriginal: r[F777.name_original] || null,
    city: r[F777.city] || null,
    phone: r[F777.phone] || null,
    email: r[F777.email] || null,
    website: r[F777.website] || null,
    instagram: r[F777.instagram] || null,
    telegram: r[F777.telegram] || null,
    bio: r[F777.bio] || null,
    roles: rolesRes.rows.map(rr => ({
      role: resolveSelect(rr.role_id, ROLES) || rr.role_text || 'other',
      roleText: rr.role_text || null,
      period: rr.period || null,
      personId: null,
      personName: null,
      projectId: rr.project_id || null,
      projectName: rr.project_name || null,
    })),
  };
}

export async function fetchEvent(pool: Pool, id: number): Promise<Event | null> {
  const res = await pool.query(
    `SELECT * FROM ${TBL_EVENTS} WHERE id = $1 AND trashed = false`, [id]
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];

  let project: { id: number; name: string } | null = null;
  const projId = r[F775.project_id];
  if (projId && String(projId) !== '0' && String(projId) !== '') {
    const projRes = await pool.query(
      `SELECT id, "${F776.project_name}" as name FROM ${TBL_PROJECTS} WHERE id = $1 AND trashed = false`,
      [parseInt(String(projId))]
    );
    if (projRes.rows.length > 0) {
      project = { id: projRes.rows[0].id, name: projRes.rows[0].name };
    }
  }

  return {
    id: r.id,
    name: r[F775.event_name] || 'Unknown',
    type: resolveSelect(r[F775.event_type], EVENT_TYPES),
    venue: r[F775.venue] || null,
    city: r[F775.city] || null,
    dateStart: r[F775.date_start] || null,
    dateEnd: r[F775.date_end] || null,
    dateText: r[F775.date_text] || null,
    participants: r[F775.participants] || null,
    description: r[F775.description] || null,
    mentionCount: parseInt(r[F775.mention_count]) || 0,
    project,
  };
}

export async function searchEntities(pool: Pool, query: string, limit = 20): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const sql = `
    SELECT id, 'project' as type, "${F776.project_name}" as name,
           "${F776.city}" as city, "${F776.project_type}" as subtype
    FROM ${TBL_PROJECTS} WHERE trashed = false
      AND ("${F776.project_name}" ILIKE $1 OR "${F776.name_ru}" ILIKE $1 OR "${F776.instagram}" ILIKE $1)
    UNION ALL
    SELECT id, 'event' as type, "${F775.event_name}" as name,
           "${F775.city}" as city, "${F775.event_type}" as subtype
    FROM ${TBL_EVENTS} WHERE trashed = false
      AND "${F775.event_name}" ILIKE $1
    UNION ALL
    SELECT id, 'person' as type, "${F777.person_name}" as name,
           "${F777.city}" as city, NULL::text as subtype
    FROM ${TBL_PEOPLE} WHERE trashed = false
      AND ("${F777.person_name}" ILIKE $1 OR "${F777.name_ru}" ILIKE $1 OR "${F777.instagram}" ILIKE $1)
    LIMIT $2
  `;
  const res = await pool.query(sql, [pattern, limit]);
  return res.rows.map(r => ({
    id: r.id,
    type: r.type,
    name: r.name || 'Unknown',
    city: r.city || null,
    subtype: r.subtype ? resolveSelect(r.subtype,
      r.type === 'project' ? PROJECT_TYPES : EVENT_TYPES
    ) : null,
  }));
}
