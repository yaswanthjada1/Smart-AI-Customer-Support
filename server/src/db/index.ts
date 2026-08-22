import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

let pool: Pool | null = null;
let pgliteInstance: PGlite | null = null;
let isInitialized = false;

export async function getDb() {
  if (isInitialized) {
    return { pool, pglite: pgliteInstance };
  }

  if (config.databaseUrl) {
    console.log('[DB] Connecting to PostgreSQL at DATABASE_URL...');
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    });
    // Test connection
    const client = await pool.connect();
    client.release();
    console.log('[DB] PostgreSQL pool connected successfully.');
  } else {
    console.log(`[DB] No DATABASE_URL provided. Initializing embedded PostgreSQL (PGlite) with persistence at: ${config.pgliteDir}`);
    if (!fs.existsSync(config.pgliteDir)) {
      fs.mkdirSync(config.pgliteDir, { recursive: true });
    }
    pgliteInstance = new PGlite(config.pgliteDir, {
      extensions: {
        vector,
      },
    });
    console.log('[DB] Embedded PostgreSQL (PGlite) with pgvector initialized successfully.');
  }

  isInitialized = true;
  await runInitialMigrations();
  return { pool, pglite: pgliteInstance };
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  await getDb();

  if (pool) {
    const res = await pool.query(sql, params);
    return { rows: res.rows as T[], rowCount: res.rowCount || 0 };
  } else if (pgliteInstance) {
    const res = await pgliteInstance.query(sql, params);
    return { rows: res.rows as T[], rowCount: res.rows.length };
  } else {
    throw new Error('Database is not initialized.');
  }
}

export async function runInitialMigrations(): Promise<void> {
  const migrationPath = path.resolve(__dirname, './migrations/001_initial_schema.sql');
  if (!fs.existsSync(migrationPath)) {
    console.warn(`[DB Migration] Migration file not found at: ${migrationPath}`);
    return;
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  try {
    if (pool) {
      await pool.query(migrationSql);
      console.log('[DB Migration] Migrations executed successfully on PostgreSQL.');
    } else if (pgliteInstance) {
      await pgliteInstance.exec(migrationSql);
      console.log('[DB Migration] Migrations executed successfully on embedded PostgreSQL.');
    }
  } catch (err: any) {
    console.error('[DB Migration Error]', err.message);
    throw err;
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  isInitialized = false;
}
