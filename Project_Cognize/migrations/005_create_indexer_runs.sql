-- 005_create_indexer_runs.sql
CREATE TABLE IF NOT EXISTS indexer_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP,
  success BOOLEAN,
  file_count INTEGER,
  error_message TEXT
);