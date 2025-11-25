-- =====================================================
-- 005_create_indexer_runs.sql
-- =====================================================
CREATE TABLE IF NOT EXISTS indexer_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL UNIQUE,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  mode TEXT NOT NULL,
  commit_sha TEXT,
  files_processed INTEGER DEFAULT 0,
  files_succeeded INTEGER DEFAULT 0,
  files_failed INTEGER DEFAULT 0,
  error_log TEXT,
  indexer_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_run_started ON indexer_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_mode ON indexer_runs(mode);

INSERT INTO schema_migrations (version, description)
VALUES ('2.0-audit', 'indexer_runs テーブル作成（監査ログ）');
