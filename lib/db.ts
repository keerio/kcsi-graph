import { Pool } from 'pg';

const baserowPool = new Pool({
  host: process.env.BASEROW_DB_HOST || '10.0.0.159',
  port: parseInt(process.env.BASEROW_DB_PORT || '5432'),
  database: process.env.BASEROW_DB_NAME || 'baserow',
  user: process.env.BASEROW_DB_USER || 'baserow',
  password: process.env.BASEROW_DB_PASS || 'baserow',
  max: 10,
  idleTimeoutMillis: 30000,
});

export function getPool(): Pool {
  return baserowPool;
}
