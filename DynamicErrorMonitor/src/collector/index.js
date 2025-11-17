require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const Sentry = require('@sentry/node');
const cors = require('cors');
const { parseStack } = require('./parser');
const ReverseLookupResolver = require('../reverse-lookup/resolver');
const SyncManager = require('./sync');
const llmApi = require('../llm-api');  // LLM APIをインポート

const app = express();
app.use(cors());
app.use(express.json({ limit: '500kb' }));

const STATIC_DB_PATH = process.env.STATIC_INDEX_DB_PATH;
const ERRORS_DB_PATH = process.env.ERRORS_DB_PATH || './database/errors.db';
const GLITCHTIP_DSN = process.env.GLITCHTIP_DSN;

if (!STATIC_DB_PATH) {
  console.error('FATAL: STATIC_INDEX_DB_PATH not set in .env');
  process.exit(1);
}

const errorsDb = new sqlite3.Database(ERRORS_DB_PATH);
const staticDb = new sqlite3.Database(STATIC_DB_PATH, sqlite3.OPEN_READONLY);
const resolver = new ReverseLookupResolver(STATIC_DB_PATH);
const syncManager = new SyncManager(staticDb, errorsDb, resolver);

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

// LLM APIルートをマウント
app.use('/api/llm', llmApi);

app.post('/api/collect', async (req, res) => {
  console.log('[Collector] Received error data:', JSON.stringify(req.body).substring(0, 200));
  
  const message = req.body.message || 'Unknown error (no message provided)';
  const stack = req.body.stack || 'No stack trace available';
  const browser = req.body.browser || {};
  const timestamp = req.body.timestamp || new Date().toISOString();
  
  const receivedAt = new Date().toISOString();
  
  try {
    const frames = parseStack(stack);
    const firstFrame = frames[0];
    
    let resolved = null;
    let isStale = false;
    
    if (firstFrame) {
      if (syncManager.isStale(timestamp || receivedAt)) {
        isStale = true;
        console.log('[Collector] Stale error detected');
      } else {
        resolved = await resolver.resolve(firstFrame.file, firstFrame.line);
      }
    }
    
    const sql = `INSERT INTO errors 
      (received_at, message, stack, browser_info, resolved_path, resolved_symbol, deps_json, metadata_json, is_stale)
      VALUES (?,?,?,?,?,?,?,?,?)`;
    
    errorsDb.run(sql, [
      receivedAt,
      message,
      stack,
      JSON.stringify(browser),
      resolved ? resolved.path : null,
      resolved ? resolved.symbol : null,
      resolved ? JSON.stringify(resolved.deps) : null,
      JSON.stringify({ frames, confidence: resolved?.confidence }),
      isStale ? 1 : 0
    ], function(err) {
      if (err) {
        console.error('[Collector] DB insert failed:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      const errorId = this.lastID;
      console.log(`[Collector] Error saved with ID: ${errorId}, Message: "${message.substring(0, 50)}"`);
      
      if (GLITCHTIP_DSN) {
        const errorObj = new Error(message);
        errorObj.stack = stack;
        Sentry.captureException(errorObj);
      }
      
      res.status(201).json({ 
        id: errorId,
        resolved: !!resolved,
        stale: isStale
      });
    });
    
  } catch (error) {
    console.error('[Collector] Processing error:', error);
    res.status(500).json({ error: 'Internal error: ' + error.message });
  }
});

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    lastIndexTime: syncManager.lastIndexTime,
    glitchtip: !!GLITCHTIP_DSN
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Collector] Running on port ${PORT}`);
  console.log(`[Collector] CORS enabled for all origins`);
  console.log(`[Collector] LLM API mounted at /api/llm`);
});

process.on('SIGTERM', () => {
  console.log('[Collector] Shutting down...');
  errorsDb.close();
  staticDb.close();
  resolver.close();
  process.exit(0);
});