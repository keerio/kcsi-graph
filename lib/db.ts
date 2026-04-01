import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || '10.0.0.159',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kcsi',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'TCppNjNQ9TOXwUEpZWsbZxnt',
  max: 10,
  idleTimeoutMillis: 30000,
});

export function getPool(): Pool {
  return pool;
}
