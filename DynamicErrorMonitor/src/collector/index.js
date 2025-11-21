/**
 * DynamicErrorMonitor Collector
 * ChatGPT全指摘対応版
 */

require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const Sentry = require('@sentry/node');
const { parseStack } = require('./parser');
const ReverseLookupResolver = require('../reverse-lookup/resolver');
const SyncManager = require('./sync');

const app = express();
app.use(express.json({ limit: '500kb' }));

// Validate environment
const STATIC_DB_PATH = process.env.STATIC_INDEX_DB_PATH;
const ERRORS_DB_PATH = process.env.ERRORS_DB_PATH || './database/errors.db';
const GLITCHTIP_DSN = process.env.GLITCHTIP_DSN;

if (!STATIC_DB_PATH) {
  console.error('FATAL: STATIC_INDEX_DB_PATH not set in .env');
  process.exit(1);
}

// Initialize databases
const errorsDb = new sqlite3.Database(ERRORS_DB_PATH);
const staticDb = new sqlite3.Database(STATIC_DB_PATH, sqlite3.OPEN_READONLY);

// Initialize components
const resolver = new ReverseLookupResolver(STATIC_DB_PATH);
const syncManager = new SyncManager(staticDb, errorsDb, resolver);

// Sentry/Glitchtip init
if (GLITCHTIP_DSN) {
  Sentry.init({
    dsn: GLITCHTIP_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0
  });
  console.log('[Collector] Glitchtip initialized');
} else {
  console.warn('[Collector] GLITCHTIP_DSN not set, skipping Sentry integration');
}

// POST /api/collect - Main ingestion endpoint
app.post('/api/collect', async (req, res) => {
  const { message, stack, browser, timestamp } = req.body;
  const receivedAt = new Date().toISOString();
  
  try {
    const frames = parseStack(stack);
    const firstFrame = frames[0];
    
    let resolved = null;
    let isStale = false;
    
    if (firstFrame) {
      // Check if error occurred before last index update
      if (syncManager.isStale(timestamp || receivedAt)) {
        isStale = true;
        console.log('[Collector] Stale error detected, will re-resolve later');
      } else {
        resolved = await resolver.resolve(firstFrame.file, firstFrame.line);
      }
    }
    
    // Insert into errors.db
    const sql = `INSERT INTO errors 
      (received_at, message, stack, browser_info, resolved_path, resolved_symbol, deps_json, metadata_json, is_stale)
      VALUES (?,?,?,?,?,?,?,?,?)`;
    
    errorsDb.run(sql, [
      receivedAt,
      message,
      stack,
      JSON.stringify(browser || {}),
      resolved ? resolved.path : null,
      resolved ? resolved.symbol : null,
      resolved ? JSON.stringify(resolved.deps) : null,
      JSON.stringify({ frames, confidence: resolved?.confidence }),
      isStale ? 1 : 0
    ], function(err) {
      if (err) {
        console.error('[Collector] DB insert failed:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      const errorId = this.lastID;
      
      // Forward to Glitchtip (ChatGPT fix: preserve stack)
      if (GLITCHTIP_DSN) {
        const errorObj = new Error(message);
        errorObj.stack = stack; // Critical fix
        
        Sentry.captureException(errorObj, {
          extra: {
            browser,
            resolved,
            frames,
            errorId
          },
          tags: {
            resolved_file: resolved?.path,
            confidence: resolved?.confidence
          }
        });
      }
      
      res.status(201).json({ 
        id: errorId,
        resolved: !!resolved,
        stale: isStale
      });
    });
    
  } catch (error) {
    console.error('[Collector] Processing error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/errors/recent - Poll endpoint
app.get('/api/errors/recent', (req, res) => {
  const since = req.query.since || new Date(Date.now() - 86400000).toISOString();
  
  errorsDb.all(
    "SELECT * FROM errors WHERE received_at > ? ORDER BY received_at DESC LIMIT 100",
    [since],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ errors: rows, count: rows.length });
    }
  );
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    lastIndexTime: syncManager.lastIndexTime,
    glitchtip: !!GLITCHTIP_DSN
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Collector] Running on port ${PORT}`);
  console.log(`[Collector] Errors DB: ${ERRORS_DB_PATH}`);
  console.log(`[Collector] Static DB: ${STATIC_DB_PATH}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Collector] Shutting down...');
  errorsDb.close();
  staticDb.close();
  resolver.close();
  process.exit(0);
});

module.exports = app;
