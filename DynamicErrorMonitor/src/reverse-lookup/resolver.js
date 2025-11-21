/**
 * Reverse Lookup Resolver
 * ChatGPT指摘対応：フルパス優先、basename+dir二段階マッチ
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class ReverseLookupResolver {
  constructor(staticDbPath) {
    if (!staticDbPath) {
      throw new Error('STATIC_INDEX_DB_PATH not configured');
    }
    this.db = new sqlite3.Database(staticDbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error('Failed to open static_index.db:', err);
        throw err;
      }
    });
  }

  async resolve(filePath, lineNum) {
    return new Promise((resolve, reject) => {
      const normalized = this._normalizePath(filePath);
      
      // Strategy 1: Full path match
      this._tryFullPath(normalized, lineNum, (result) => {
        if (result) return resolve(result);
        
        // Strategy 2: Basename + parent directory
        this._tryBasenameWithDir(normalized, lineNum, (result) => {
          if (result) return resolve(result);
          
          // Strategy 3: Basename only (fallback)
          this._tryBasenameOnly(normalized, lineNum, (result) => {
            resolve(result); // null if not found
          });
        });
      });
    });
  }

  _normalizePath(filePath) {
    return filePath.replace(/\\\\/g, '/').replace(/^\\/+/, '');
  }

  _tryFullPath(filePath, lineNum, callback) {
    const query = "SELECT * FROM file_index WHERE path = ? OR path LIKE ?";
    this.db.get(query, [filePath, `%${filePath}`], (err, row) => {
      if (err || !row) return callback(null);
      this._enrichResult(row, lineNum, callback);
    });
  }

  _tryBasenameWithDir(filePath, lineNum, callback) {
    const basename = path.basename(filePath);
    const parentDir = path.basename(path.dirname(filePath));
    
    const query = "SELECT * FROM file_index WHERE path LIKE ? AND path LIKE ?";
    this.db.get(query, [`%${parentDir}%`, `%${basename}`], (err, row) => {
      if (err || !row) return callback(null);
      this._enrichResult(row, lineNum, callback);
    });
  }

  _tryBasenameOnly(filePath, lineNum, callback) {
    const basename = path.basename(filePath);
    const query = "SELECT * FROM file_index WHERE path LIKE ?";
    
    // Get all matches and prefer shortest path (most specific)
    this.db.all(query, [`%${basename}`], (err, rows) => {
      if (err || !rows || rows.length === 0) return callback(null);
      
      // Sort by path length, prefer shorter (more specific)
      rows.sort((a, b) => a.path.length - b.path.length);
      this._enrichResult(rows[0], lineNum, callback);
    });
  }

  _enrichResult(row, lineNum, callback) {
    const symbols = JSON.parse(row.symbols_json || '[]');
    const matchedSymbol = symbols.find(s => 
      s.line <= lineNum && (!s.endLine || s.endLine >= lineNum)
    );
    
    // Get dependencies
    this.db.all(
      "SELECT target_path FROM file_dependencies WHERE source_path = ?",
      [row.path],
      (err, deps) => {
        callback({
          path: row.path,
          symbol: matchedSymbol ? matchedSymbol.name : null,
          deps: deps ? deps.map(d => d.target_path) : [],
          confidence: this._calculateConfidence(row.path, lineNum, matchedSymbol)
        });
      }
    );
  }

  _calculateConfidence(path, lineNum, symbol) {
    let score = 0.5; // base
    if (symbol) score += 0.3;
    if (path.includes('/src/')) score += 0.2;
    return Math.min(score, 1.0);
  }

  close() {
    this.db.close();
  }
}

module.exports = ReverseLookupResolver;
