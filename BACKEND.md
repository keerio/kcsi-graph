# КЦСИ Graph — Backend Data Architecture

## Overview

Graph visualization frontend for the KCSI (Central Asian art scene) knowledge graph. Data lives in PostgreSQL (Baserow embedded DB) on arcane-local server.

## Database Connection

```
host: baserow (Docker network) / 10.0.0.159 (LAN) / pg.metamem.org (public)
port: 5432
database: baserow
user: baserow
password: baserow
```

From kcsi-graph container on same Docker network: `host=baserow`.

## Entity Tables (Nodes)

All entity tables have a Baserow-managed **UUID field** — use it as the stable node identifier.

### People (table `database_table_777`)

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| person_name | field_7559 | text | Display name |
| **uuid** | **field_7626** | **uuid** | **Stable ID** |
| city | field_7576 | text | City |
| instagram | field_7580 | text | IG handle |
| telegram | field_7581 | text | TG handle |
| bio | field_7582 | text | Short bio/role |
| name_ru | field_7611 | text | Name in Cyrillic |
| name_original | field_7612 | text | Name in Latin |

### Projects / Institutions (table `database_table_776`)

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| project_name | field_7556 | text | Display name |
| **uuid** | **field_7627** | **uuid** | **Stable ID** |
| project_type | field_7565 | int (select) | Type (see below) |
| city | field_7566 | text | City |
| status | field_7574 | int (select) | Active/Archive/Unknown |
| instagram | field_7571 | text | IG handle |
| name_ru | field_7609 | text | |
| name_original | field_7610 | text | |

**project_type select values:**
- 3247 = Museum, 3248 = Gallery, 3249 = Theater, 3250 = Residency
- 3251 = Festival, 3252 = Collective, 3253 = Foundation
- 3254 = School, 3255 = Platform, 3256 = Other

### Events (table `database_table_775`)

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| event_name | field_7542 | text | Display name |
| **uuid** | **field_7628** | **uuid** | **Stable ID** |
| event_type | field_7543 | int (select) | Type (see below) |
| venue | field_7544 | text | Venue name |
| city | field_7545 | text | City |
| date_start | field_7546 | date | Start date |
| date_end | field_7547 | date | End date |
| participants | field_7549 | text | Newline-separated names |
| description | field_7550 | text | Summary |
| project_id | field_7613 | numeric | FK to Projects row ID |

**event_type select values:**
- 3238 = Exhibition, 3239 = Festival, 3240 = Opening, 3241 = Talk
- 3242 = Workshop, 3243 = Performance, 3244 = Fair
- 3245 = Residency, 3246 = Other

### Artworks (table `database_table_779`)

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| title | field_7600 | text | Display name |
| **uuid** | **field_7614** | **uuid** | **Stable ID** |
| author_name | field_7601 | text | Author display name |
| medium | field_7603 | text | Medium/technique |
| first_seen_date | field_7604 | date | |
| mention_count | field_7605 | numeric | Times mentioned |

## Graph Edges (table `database_table_766`)

Each row is a directed edge between two entities identified by UUID.

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| from_id | field_7468 | **text (UUID)** | Source entity UUID |
| from_name | field_7469 | text | Source display name |
| to_id | field_7470 | **text (UUID)** | Target entity UUID |
| to_name | field_7471 | text | Target display name |
| from_table | field_7614 | text | Source type: `people` / `projects` / `events` / `artworks` |
| to_table | field_7615 | text | Target type |
| relation_type | field_7472 | int (select) | Relation (see below) |
| weight | field_7473 | numeric | Edge weight |

**relation_type select values:**
- 3267 = participates_in (person → event/project)
- 3268 = shows_work (artist → project)
- 3269 = organizes (curator/director → project/event)
- 3271 = authored_by (person → artwork)

## ProjectRoles — Junction Table (table `database_table_778`)

Direct person↔project link with role. Use this for detailed role info; the graph (766) has the same edges but without role detail.

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| **uuid** | **field_7625** | **uuid** | **Stable ID** |
| role_label | field_7562 | text | "Person @ Project" |
| project_id | field_7584 | numeric | FK to Projects row ID |
| person_id | field_7585 | numeric | FK to People row ID |
| role | field_7586 | int (select) | Role type (see below) |
| role_text | field_7587 | text | Raw role text |

**role select values:**
- 3260 = Director, 3261 = Curator, 3262 = Artist, 3263 = Participant
- 3264 = Founder, 3265 = Manager, 3266 = Other
- 3272 = Teacher, 3273 = Actor, 3274 = Playwright, 3275 = Producer
- 3277 = Photographer, 3278 = Musician, 3279 = Designer, 3280 = Architect

## Key Queries

### Full graph for visualization

```sql
SELECT field_7468 AS from_id, field_7469 AS from_name,
       field_7470 AS to_id, field_7471 AS to_name,
       field_7614 AS from_table, field_7615 AS to_table,
       field_7472 AS relation_type, field_7473 AS weight
FROM database_table_766
WHERE NOT trashed
```

### All nodes (union query)

```sql
SELECT field_7626::text AS uuid, field_7559 AS name, 'people' AS type, field_7576 AS city
FROM database_table_777 WHERE NOT trashed
UNION ALL
SELECT field_7627::text, field_7556, 'projects', field_7566
FROM database_table_776 WHERE NOT trashed
UNION ALL
SELECT field_7628::text, field_7542, 'events', field_7545
FROM database_table_775 WHERE NOT trashed
UNION ALL
SELECT field_7614::text, field_7600, 'artworks', NULL
FROM database_table_779 WHERE NOT trashed AND field_7614 IS NOT NULL
```

### Person card — all connections

```sql
SELECT to_name, field_7615 AS entity_type, field_7472 AS relation
FROM database_table_766
WHERE field_7468 = :person_uuid AND NOT trashed
```

### Project card — who works there

```sql
SELECT p.field_7559 AS person_name, r.field_7587 AS role_text, r.field_7586 AS role_id
FROM database_table_778 r
JOIN database_table_777 p ON r.field_7585 = p.id
WHERE r.field_7584 = :project_row_id AND NOT r.trashed AND NOT p.trashed
```

## Current Stats (2026-04-01)

- People: 1,657
- Projects: 2,972
- Events: 2,660
- Artworks: 2,882
- Graph edges: 2,517
- ProjectRoles: 240

## Graph Rebuild

Graph is rebuilt by `build_graph_pg.py` (Prefect flow `build-graph`). Pattern: DELETE all → INSERT from 775-779. Takes ~2 seconds. Sources:

| Source | Edge type | Count |
|--------|-----------|-------|
| ProjectRoles (778) | person → project | 240 |
| Event participants (775) | person → event | 1,827 |
| Artwork authors (779) | person → artwork | 456 |
| Event project_id (775) | project → event | 0 (not yet populated) |

## Node Visual Mapping (suggested)

| Type | Color | Shape | Icon |
|------|-------|-------|------|
| people | blue | circle | person |
| projects | green | square | building |
| events | orange | diamond | calendar |
| artworks | purple | triangle | palette |

| Relation | Line style | Label |
|----------|-----------|-------|
| participates_in (3267) | solid thin | участвует |
| shows_work (3268) | solid medium | выставляет |
| organizes (3269) | dashed | организует |
| authored_by (3271) | dotted | автор |
