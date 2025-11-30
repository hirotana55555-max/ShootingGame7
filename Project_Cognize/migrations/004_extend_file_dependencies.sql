-- 004_extend_file_dependencies.sql
CREATE INDEX IF NOT EXISTS idx_source_path ON file_dependencies(source_path);