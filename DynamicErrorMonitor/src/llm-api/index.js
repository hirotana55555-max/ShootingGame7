/**
 * LLM Query API
 * Token最適化TOON出力
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const router = express.Router();
const errorsDb = new sqlite3.Database(process.env.ERRORS_DB_PATH || './database/errors.db');

// GET /api/llm/summary
router.get('/summary', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  
  errorsDb.all(
    "SELECT message, resolved_path, resolved_symbol FROM errors WHERE received_at > ? AND is_stale = 0",
    [since],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const byType = {};
      const byFile = {};
      const bySymbol = {};
      
      rows.forEach(r => {
        const type = (r.message.split(':')[0] || 'Unknown').trim();
        byType[type] = (byType[type] || 0) + 1;
        
        if (r.resolved_path) {
          byFile[r.resolved_path] = (byFile[r.resolved_path] || 0) + 1;
        }
        
        if (r.resolved_symbol) {
          bySymbol[r.resolved_symbol] = (bySymbol[r.resolved_symbol] || 0) + 1;
        }
      });
      
      // TOON format
      res.json({
        period: `last_${hours}h`,
        total: rows.length,
        by_type: Object.entries(byType)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {}),
        top_files: Object.entries(byFile)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([path, count]) => ({ path, count })),
        top_symbols: Object.entries(bySymbol)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([symbol, count]) => ({ symbol, count }))
      });
    }
  );
});

// GET /api/llm/context/:id
router.get('/context/:id', (req, res) => {
  const id = req.params.id;
  
  errorsDb.get("SELECT * FROM errors WHERE id = ?", [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Not found' });
    
    const deps = row.deps_json ? JSON.parse(row.deps_json) : [];
    const metadata = JSON.parse(row.metadata_json || '{}');
    
    // Find similar recent
    errorsDb.all(
      `SELECT id, message, received_at 
       FROM errors 
       WHERE resolved_path = ? AND id != ? AND is_stale = 0
       ORDER BY received_at DESC 
       LIMIT 5`,
      [row.resolved_path, id],
      (err2, similar) => {
        res.json({
          error: {
            id: row.id,
            msg: row.message,
            at: row.received_at
          },
          resolved: {
            file: row.resolved_path,
            symbol: row.resolved_symbol,
            confidence: metadata.confidence
          },
          deps: {
            direct: deps.slice(0, 10)
          },
          similar_recent: similar || [],
          fix_hints: generateHints(row),
          frames: metadata.frames?.slice(0, 3) || []
        });
      }
    );
  });
});

function generateHints(error) {
  const hints = [];
  const msg = error.message.toLowerCase();
  
  if (msg.includes('undefined') || msg.includes('null')) {
    hints.push("Check for null/undefined before access");
  }
  if (msg.includes('is not a function')) {
    hints.push("Verify method exists on object");
  }
  if (msg.includes('cannot read property')) {
    hints.push("Object may be null/undefined");
  }
  if (error.resolved_symbol) {
    hints.push(`Review ${error.resolved_symbol} implementation`);
  }
  if (error.resolved_path) {
    hints.push(`Check ${error.resolved_path} recent changes`);
  }
  
  return hints;
}

// POST /api/llm/query
router.post('/query', (req, res) => {
  const { query } = req.body;
  
  // Simple NL→SQL (production would use LLM)
  let sql = "SELECT id, message, received_at, resolved_path, resolved_symbol FROM errors WHERE is_stale = 0";
  const params = [];
  
  const lowerQuery = query.toLowerCase();
  
  // Extract file names
  const fileMatch = query.match(/([A-Z][a-zA-Z0-9_]*\.js)/g);
  if (fileMatch) {
    sql += " AND resolved_path LIKE ?";
    params.push(`%${fileMatch[0]}%`);
  }
  
  // Time range
  if (lowerQuery.includes('week') || lowerQuery.includes('週間')) {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    sql += " AND received_at > ?";
    params.push(weekAgo);
  } else if (lowerQuery.includes('today') || lowerQuery.includes('今日')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sql += " AND received_at > ?";
    params.push(today.toISOString());
  }
  
  // Error type
  if (lowerQuery.includes('typeerror')) {
    sql += " AND message LIKE '%TypeError%'";
  } else if (lowerQuery.includes('network')) {
    sql += " AND message LIKE '%network%'";
  }
  
  sql += " ORDER BY received_at DESC LIMIT 50";
  
  errorsDb.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Aggregate summary
    const summary = rows.length > 0
      ? `Found ${rows.length} errors. Most common: ${rows[0].resolved_path || 'unknown file'}`
      : 'No matching errors found';
    
    res.json({
      interpretation: sql,
      results: rows.map(r => ({
        id: r.id,
        msg: r.message,
        at: r.received_at,
        file: r.resolved_path,
        symbol: r.resolved_symbol
      })),
      summary
    });
  });
});

module.exports = router;
