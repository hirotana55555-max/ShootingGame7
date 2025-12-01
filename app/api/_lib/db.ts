// db.ts: クリーンアップ後の最終コード
/**
 * Database Helper for Errors DB and Static Index DB (TypeScript version)
 * Uses better-sqlite3 for synchronous operations
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3'); // ★ グローバル定義として統一

// NOTE: better-sqlite3 の静的インポートは削除し、getStaticDb内でrequireを使用
import path from 'path';
// ★★★ 正しい最終パス: 3階層遡り ★★★
import { DB_PATHS } from '../../../Project_Cognize/config/shared_patterns.js';
import { readFileSync } from 'fs'; 
import * as fs from 'fs'; // fs.existsSync を使用するため

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

// Database 型の参照が削除されたため、any型をDatabase.Database型の代わりに使用
let dbInstance: any | null = null;
let staticDbInstance: any | null = null; // ★追加: 静的DBインスタンスのシングルトン変数

export function getErrorsDb(): any {
  // グローバルな Database を使用
  
  if (!dbInstance) {
    const dbPath = process.env.ERRORS_DB_PATH || DB_PATHS.ERRORS_DB;
    const fullPath = path.join(process.cwd(), dbPath);
    
    try {
      dbInstance = new Database(fullPath);
      console.log('[DB] Connected to errors database:', fullPath);
    } catch (err) {
      // エラー処理を安全にするため、標準エラーとして再スロー
      console.error('[DB] Failed to open errors.db:', err);
      throw err;
    }
  }
  return dbInstance;
}

// ★★★ 静的DBへの接続を提供する機能 (読み取り専用) ★★★
export function getStaticDb(): any {
  if (!staticDbInstance) {
    // Dynamic require を使用せず、グローバルな Database を使用
    
    // 憲法(DB_PATHS)に従いパスを取得
    const dbPath = process.env.STATIC_INDEX_DB_PATH || DB_PATHS.STATIC_INDEX_DB;
    // 相対パスの場合は絶対パスへ変換
    const fullPath = path.resolve(process.cwd(), dbPath); // ★ 欠落していたパス定義を再挿入
    
    // DBファイル存在チェック
    if (!fs.existsSync(fullPath)) {
      // 抽象エラー回避のため、具体的なエラーを投げる
      console.error("[DB ERROR] Static index DB file not found at:", fullPath);
      throw new Error(`Static index DB file must exist for read operations: ${fullPath}`);
    }
    
    try {
      // 読み取り専用、ファイル必須で開く
      staticDbInstance = new Database(fullPath, { readonly: true, fileMustExist: true });
      console.log('[DB] Connected to static index database (Readonly):', fullPath);
    } catch (err) {
      // エラー処理を安全にするため、標準エラーとして再スロー
      console.error('[DB] Failed to open static_index.db:', err);
      throw err;
    }
  }
  return staticDbInstance;
}

export function insertError(record: Omit<ErrorRecord, 'id'>): number {
  const db: any = getErrorsDb();
  
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