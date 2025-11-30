-- 001_create_core_tables.sql
CREATE TABLE file_index (
  path TEXT PRIMARY KEY,
  file_hash TEXT NOT NULL,
  language TEXT NOT NULL,
  symbols_json TEXT,
  imports_json TEXT,
  exports_json TEXT,
  loc INTEGER,
  updated_at TEXT NOT NULL,
  commit_sha TEXT,
  json_meta TEXT,
  is_critical BOOLEAN DEFAULT 0,
  last_accessed REAL DEFAULT 0
);

CREATE TABLE file_dependencies (
  source_path TEXT NOT NULL,
  target_module TEXT NOT NULL,
  import_type TEXT,
  FOREIGN KEY (source_path) REFERENCES file_index(path)
);

CREATE TABLE class_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  code_snippet TEXT NOT NULL,
  arguments_json TEXT,
  created_at TEXT NOT NULL,
  commit_sha TEXT
);