-- =====================================================
-- 004_extend_file_dependencies.sql
-- =====================================================
ALTER TABLE file_dependencies ADD COLUMN resolved_target_path TEXT DEFAULT NULL;
ALTER TABLE file_dependencies ADD COLUMN dependency_detail TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_resolved_target ON file_dependencies(resolved_target_path);

INSERT INTO schema_migrations (version, description)
VALUES ('2.0-file-deps', 'file_dependencies: resolved_target_path, dependency_detail 追加');
