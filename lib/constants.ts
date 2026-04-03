// TKG schema — Baserow field mappings for graph.* tables

// ── Tables ──────────────────────────────────────────────────────────────────

export const TBL_ENTITIES = 'graph.entities';
export const TBL_RELATIONS = 'graph.relations';
export const TBL_TOPONYMS = 'graph.toponyms';

// ── Field maps ──────────────────────────────────────────────────────────────

// database_table_785 → graph.entities
export const F785 = {
  uuid: 'field_7676',
  name: 'field_7653',
  name_ru: 'field_7654',
  name_original: 'field_7655',
  entity_type_id: 'field_7656',
  city: 'field_7657',
  country: 'field_7658',
  description: 'field_7659',
  instagram: 'field_7660',
  kgart_score: 'field_7670',
  ig_followers: 'field_7671',
  mention_count: 'field_7672',
} as const;

// database_table_786 → graph.relations
export const F786 = {
  uuid: 'field_7690',
  from_uuid: 'field_7678',
  to_uuid: 'field_7680',
  relation_type_id: 'field_7682',
  from_name: 'field_7679',
  to_name: 'field_7681',
  label: 'field_7677',
  date_start: 'field_7683',
  date_end: 'field_7684',
  confidence_id: 'field_7686',
} as const;

// database_table_790 → graph.toponyms
export const F790 = {
  uuid: 'field_7724',
  name: 'field_7717',
  toponym_type_id: 'field_7718',
  country_code: 'field_7720',
  lat: 'field_7722',
  lon: 'field_7723',
} as const;

// ── Select ID mappings ───────────────────────────────────────────────────────

export const ENTITY_TYPES: Record<string, string> = {
  '3296': 'person',
  '3297': 'institution',
  '3298': 'event',
  '3299': 'artwork',
  '3300': 'venue',
};

export const RELATION_TYPES: Record<string, string> = {
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

export const CONFIDENCE: Record<string, string> = {
  '3329': 'auto',
  '3330': 'verified',
  '3331': 'disputed',
};

export const TOPONYM_TYPES: Record<string, string> = {
  '3362': 'city',
  '3363': 'region',
  '3364': 'country',
};

// ── Display labels (Russian) ─────────────────────────────────────────────────

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  person: 'Человек',
  institution: 'Институция',
  event: 'Событие',
  artwork: 'Работа',
  venue: 'Площадка',
};

export const RELATION_TYPE_LABELS: Record<string, string> = {
  participated_in: 'Участвовал',
  located_in: 'Находится в',
  artist_at: 'Художник',
  exhibited_at: 'Выставлялся',
  founder: 'Основатель',
  director: 'Директор',
  curator: 'Куратор',
  organized: 'Организовал',
  member_of: 'Участник',
  collaborated: 'Коллаборация',
  designer_at: 'Дизайнер',
  musician_at: 'Музыкант',
  part_of: 'Часть',
};

// ── Node colors ──────────────────────────────────────────────────────────────

export const NODE_COLORS: Record<string, string> = {
  person: '#3b82f6',      // blue-500
  institution: '#22c55e', // green-500
  event: '#f59e0b',       // amber-500
  venue: '#a855f7',       // purple-500
  artwork: '#6b7280',     // gray-500
};
