/**
 * Reverse Lookup Resolver (TypeScript version)
 * Converted from DynamicErrorMonitor/src/reverse-lookup/resolver.js
 */

import path from 'path';
import type { Database } from 'better-sqlite3'; // 型定義のみ使用
import { getStaticDb } from './db'; // ★追加: 新しく作ったDBハブからインスタンスを取得する

export interface ResolvedError {
  path: string;
  symbol: string | null;
  deps: string[];
  confidence: number;
}

export class ReverseLookupResolver {
  private db: Database;

  // コンストラクタを修正: DBパスではなく、接続済みインスタンスを受け取る
  constructor(dbInstance: Database) {
    // 従来のパスチェックとDB初期化ロジックを削除
    this.db = dbInstance;
  }

  resolve(filePath: string, lineNum: number): ResolvedError | null {
    const normalized = this._normalizePath(filePath);
    
    let result = this._tryFullPath(normalized, lineNum);
    if (result) return result;
    
    result = this._tryBasenameWithDir(normalized, lineNum);
    if (result) return result;
    
    result = this._tryBasenameOnly(normalized, lineNum);
    return result;
  }

  private _normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  }

  private _tryFullPath(filePath: string, lineNum: number): ResolvedError | null {
    try {
      const row = this.db.prepare(
        'SELECT * FROM file_index WHERE path = ? OR path LIKE ?'
      ).get(filePath, `%${filePath}`) as any;
      
      if (!row) return null;
      return this._enrichResult(row, lineNum);
    } catch (err) {
      console.error('[Resolver] Full path lookup error:', err);
      return null;
    }
  }

  private _tryBasenameWithDir(filePath: string, lineNum: number): ResolvedError | null {
    try {
      const basename = path.basename(filePath);
      const parentDir = path.basename(path.dirname(filePath));
      
      const row = this.db.prepare(
        'SELECT * FROM file_index WHERE path LIKE ? AND path LIKE ?'
      ).get(`%${parentDir}%`, `%${basename}`) as any;
      
      if (!row) return null;
      return this._enrichResult(row, lineNum);
    } catch (err) {
      console.error('[Resolver] Basename+dir lookup error:', err);
      return null;
    }
  }

  private _tryBasenameOnly(filePath: string, lineNum: number): ResolvedError | null {
    try {
      const basename = path.basename(filePath);
      const rows = this.db.prepare(
        'SELECT * FROM file_index WHERE path LIKE ?'
      ).all(`%${basename}`) as any[];
      
      if (!rows || rows.length === 0) return null;
      
      rows.sort((a, b) => a.path.length - b.path.length);
      return this._enrichResult(rows[0], lineNum);
    } catch (err) {
      console.error('[Resolver] Basename lookup error:', err);
      return null;
    }
  }

  private _enrichResult(row: any, lineNum: number): ResolvedError {
    const symbols = JSON.parse(row.symbols_json || '[]');
    const matchedSymbol = symbols.find((s: any) => 
      s.line <= lineNum && (!s.endLine || s.endLine >= lineNum)
    );
    
    let deps: string[] = [];
    try {
      const depRows = this.db.prepare(
        'SELECT target_path FROM file_dependencies WHERE source_path = ?'
      ).all(row.path) as any[];
      deps = depRows.map(d => d.target_path);
    } catch (err) {
      console.error('[Resolver] Dependency lookup error:', err);
    }
    
    return {
      path: row.path,
      symbol: matchedSymbol ? matchedSymbol.name : null,
      deps: deps,
      confidence: this._calculateConfidence(row.path, lineNum, matchedSymbol)
    };
  }

  private _calculateConfidence(path: string, lineNum: number, symbol: any): number {
    let score = 0.5;
    if (symbol) score += 0.3;
    if (path.includes('/src/')) score += 0.2;
    return Math.min(score, 1.0);
  }

  // close()メソッドは、接続管理がdb.tsに移行したため、不要になったが、
  // 外部からの呼び出しを防ぐため、空の関数として残す。
  close(): void {
    // 接続はgetStaticDbが管理しているため、ここでは何もしない
  }
}

let resolverInstance: ReverseLookupResolver | null = null;

export function getResolver(): ReverseLookupResolver {
  if (!resolverInstance) {
    // ★修正: db.tsからDBインスタンスを取得し、コンストラクタに注入する
    const db = getStaticDb(); 
    resolverInstance = new ReverseLookupResolver(db);
  }
  return resolverInstance;
}
