import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
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
    try {
      const sanitizedUrl = config.databaseUrl.replace(/:[^:@]+@/, ':****@');
      console.log(`[DB] Connecting to PostgreSQL at: ${sanitizedUrl}`);
      const testPool = new Pool({
        connectionString: config.databaseUrl,
        ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
      });
      const client = await testPool.connect();
      client.release();
      pool = testPool;
      console.log('[DB] PostgreSQL pool connected successfully.');
    } catch (pgErr: any) {
      console.warn(`[DB] PostgreSQL connection failed (${pgErr.message}).`);
      console.warn(`[DB] Using embedded PostgreSQL (PGlite) with persistence at: ${config.pgliteDir}`);
      pool = null;
    }
  }

  if (!pool) {
    if (!fs.existsSync(config.pgliteDir)) {
      fs.mkdirSync(config.pgliteDir, { recursive: true });
    }
    
    // Dynamically load vector extension for PGlite without compile errors
    // @ts-ignore
    const { vector } = require('@electric-sql/pglite/vector');
    
    pgliteInstance = new PGlite(config.pgliteDir, {
      extensions: {
        vector,
      },
    });
    await pgliteInstance.waitReady;
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
    const count = (res as any).affectedRows !== undefined ? (res as any).affectedRows : res.rows.length;
    return { rows: res.rows as T[], rowCount: count };
  } else {
    throw new Error('Database is not initialized.');
  }
}

export async function runInitialMigrations(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, './migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`[DB Migration] Migrations directory not found at: ${migrationsDir}`);
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const migrationSql = fs.readFileSync(filePath, 'utf8');

    try {
      if (pool) {
        await pool.query(migrationSql);
        console.log(`[DB Migration] Executed ${file} on PostgreSQL.`);
      } else if (pgliteInstance) {
        await pgliteInstance.exec(migrationSql);
        console.log(`[DB Migration] Executed ${file} on embedded PostgreSQL.`);
      }
    } catch (err: any) {
      console.error(`[DB Migration Error in ${file}]`, err.message);
      // Non-fatal if schema already contains the definition
    }
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
