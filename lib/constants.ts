// Ported from config.py — Baserow field mappings and select option IDs

// ── Tables ──────────────────────────────────────────────────────────────────

export const TBL_ENTITIES = 'database_table_764';
export const TBL_POSTS = 'database_table_765';
export const TBL_EDGES = 'database_table_766';
export const TBL_EVENTS = 'database_table_775';
export const TBL_PROJECTS = 'database_table_776';
export const TBL_PEOPLE = 'database_table_777';
export const TBL_ROLES = 'database_table_778';
export const TBL_ARTWORKS = 'database_table_779';

// ── Field maps ──────────────────────────────────────────────────────────────

export const F775 = {
  event_name: 'field_7542', event_type: 'field_7543',
  venue: 'field_7544', city: 'field_7545',
  date_start: 'field_7546', date_end: 'field_7547', date_text: 'field_7548',
  participants: 'field_7549', description: 'field_7550',
  source_posts: 'field_7551', source_urls: 'field_7552',
  mention_count: 'field_7553', project_id: 'field_7613',
} as const;

export const F776 = {
  project_name: 'field_7556', project_type: 'field_7565',
  city: 'field_7566', address: 'field_7567',
  phone: 'field_7568', email: 'field_7569',
  website: 'field_7570', instagram: 'field_7571', telegram: 'field_7572',
  description: 'field_7573', status: 'field_7574',
  source_entity_id: 'field_7575',
  name_ru: 'field_7609', name_original: 'field_7610',
} as const;

export const F777 = {
  person_name: 'field_7559', city: 'field_7576',
  phone: 'field_7577', email: 'field_7578',
  website: 'field_7579', instagram: 'field_7580', telegram: 'field_7581',
  bio: 'field_7582', source_entity_id: 'field_7583',
  name_ru: 'field_7611', name_original: 'field_7612',
} as const;

export const F778 = {
  role_label: 'field_7562', project_id: 'field_7584', person_id: 'field_7585',
  role: 'field_7586', role_text: 'field_7587', period: 'field_7588',
} as const;

export const F766 = {
  from_id: 'field_7468', from_name: 'field_7469',
  to_id: 'field_7470', to_name: 'field_7471',
  relation_type: 'field_7472', weight: 'field_7473',
  source_post_id: 'field_7474', date: 'field_7475', notes: 'field_7476',
} as const;

// ── Select option IDs → labels ──────────────────────────────────────────────

export const EVENT_TYPES: Record<number, string> = {
  3238: 'exhibition', 3239: 'festival', 3240: 'opening',
  3241: 'talk', 3242: 'workshop', 3243: 'performance',
  3244: 'fair', 3245: 'residency', 3246: 'other',
};

export const PROJECT_TYPES: Record<number, string> = {
  3247: 'museum', 3248: 'gallery', 3249: 'theater',
  3250: 'residency', 3251: 'festival', 3252: 'collective',
  3253: 'foundation', 3254: 'school', 3255: 'platform', 3256: 'other',
};

export const ROLES: Record<number, string> = {
  3260: 'director', 3261: 'curator', 3262: 'artist',
  3263: 'participant', 3264: 'founder', 3265: 'manager', 3266: 'other',
  3272: 'teacher', 3273: 'actor', 3274: 'playwright',
  3275: 'producer', 3276: 'screenwriter', 3277: 'photographer',
  3278: 'musician', 3279: 'designer', 3280: 'architect',
  3281: 'writer', 3282: 'journalist', 3283: 'activist',
  3284: 'critic', 3285: 'collector', 3286: 'administrator',
  3287: 'cameraman', 3288: 'sound_engineer', 3289: 'choreographer',
  3290: 'lecturer',
};

export const RELATION_TYPES: Record<number, string> = {
  3202: 'co_mention', 3203: 'tagged',
  3267: 'participates_in', 3268: 'shows_work',
  3269: 'organizes', 3270: 'located_in', 3271: 'authored_by',
};

export const PROJECT_STATUSES: Record<number, string> = {
  3257: 'active', 3258: 'archive', 3259: 'unknown',
};

// ── Display labels (Russian) ────────────────────────────────────────────────

export const EVENT_TYPE_LABELS: Record<string, string> = {
  exhibition: 'Выставка', festival: 'Фестиваль', opening: 'Открытие',
  talk: 'Лекция', workshop: 'Воркшоп', performance: 'Перформанс',
  fair: 'Ярмарка', residency: 'Резиденция', other: 'Другое',
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  museum: 'Музей', gallery: 'Галерея', theater: 'Театр',
  residency: 'Резиденция', festival: 'Фестиваль', collective: 'Коллектив',
  foundation: 'Фонд', school: 'Школа', platform: 'Платформа', other: 'Другое',
};

export const ROLE_LABELS: Record<string, string> = {
  director: 'Директор', curator: 'Куратор', artist: 'Художник',
  participant: 'Участник', founder: 'Основатель', manager: 'Менеджер',
  other: 'Другое', teacher: 'Преподаватель', actor: 'Актёр',
  playwright: 'Драматург', producer: 'Продюсер', screenwriter: 'Сценарист',
  photographer: 'Фотограф', musician: 'Музыкант', designer: 'Дизайнер',
  architect: 'Архитектор', writer: 'Писатель', journalist: 'Журналист',
  activist: 'Активист', critic: 'Критик', collector: 'Коллекционер',
  administrator: 'Администратор', cameraman: 'Оператор',
  sound_engineer: 'Звукорежиссёр', choreographer: 'Хореограф', lecturer: 'Лектор',
};
