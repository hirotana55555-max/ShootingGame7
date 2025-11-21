-- Unit2 DynamicErrorMonitor Schema v1.0
-- ChatGPT指摘反映版（timestamp同期対応）

CREATE TABLE IF NOT EXISTS errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL,           -- ISO8601 timestamp
  message TEXT NOT NULL,               -- Error message
  stack TEXT,                          -- Full stack trace
  browser_info TEXT,                   -- JSON: {ua, url}
  resolved_path TEXT,                  -- From static_index.db
  resolved_symbol TEXT,                -- Function/class name
  deps_json TEXT,                      -- Dependencies array
  metadata_json TEXT DEFAULT '{}',     -- Extensible JSON
  is_stale INTEGER DEFAULT 0           -- For timestamp sync
);

CREATE INDEX IF NOT EXISTS idx_received ON errors(received_at);
CREATE INDEX IF NOT EXISTS idx_resolved ON errors(resolved_path);
CREATE INDEX IF NOT EXISTS idx_message ON errors(message);
CREATE INDEX IF NOT EXISTS idx_stale ON errors(is_stale);

-- Sync state tracking
CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO sync_state 
VALUES ('last_index_time', '1970-01-01T00:00:00Z', datetime('now'));

-- Initial setup complete marker
CREATE TABLE IF NOT EXISTS setup_info (
  version TEXT PRIMARY KEY,
  initialized_at TEXT NOT NULL
);

INSERT OR IGNORE INTO setup_info 
VALUES ('1.0', datetime('now'));
