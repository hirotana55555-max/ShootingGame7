/**
 * Database Helper for Errors DB (TypeScript version)
 * Uses better-sqlite3 for synchronous operations
 */

import Database from 'better-sqlite3';
import path from 'path';

export interface ErrorRecord {
  id?: number;
  received_at: string;
  message: string;
  stack: string | null;
  browser_info: string;
  resolved_path: string | null;
  resolved_symbol: string | null;
  deps_json: string | null;
  metadata_json: string;
  is_stale: number;
}

let dbInstance: Database.Database | null = null;

export function getErrorsDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = process.env.ERRORS_DB_PATH || './DynamicErrorMonitor/database/errors.db';
    const fullPath = path.join(process.cwd(), dbPath);
    
    try {
      dbInstance = new Database(fullPath);
      console.log('[DB] Connected to errors database:', fullPath);
    } catch (err) {
      console.error('[DB] Failed to open errors.db:', err);
      throw err;
    }
  }
  return dbInstance;
}

export function insertError(record: Omit<ErrorRecord, 'id'>): number {
  const db = getErrorsDb();
  
  const stmt = db.prepare(`
    INSERT INTO errors 
    (received_at, message, stack, browser_info, resolved_path, resolved_symbol, deps_json, metadata_json, is_stale)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    record.received_at,
    record.message,
    record.stack,
    record.browser_info,
    record.resolved_path,
    record.resolved_symbol,
    record.deps_json,
    record.metadata_json,
    record.is_stale
  );
  
  return info.lastInsertRowid as number;
}
