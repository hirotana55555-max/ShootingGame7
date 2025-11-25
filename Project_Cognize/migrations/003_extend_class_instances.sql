-- =====================================================
-- 003_extend_class_instances.sql
-- =====================================================
ALTER TABLE class_instances ADD COLUMN is_builtin BOOLEAN DEFAULT 0;
ALTER TABLE class_instances ADD COLUMN inferred_module TEXT DEFAULT NULL;
ALTER TABLE class_instances ADD COLUMN resolution_score REAL DEFAULT 0.0;

CREATE INDEX IF NOT EXISTS idx_builtin ON class_instances(is_builtin);
CREATE INDEX IF NOT EXISTS idx_inferred_module ON class_instances(inferred_module);

INSERT INTO schema_migrations (version, description)
VALUES ('2.0-class-instances', 'class_instances: is_builtin, inferred_module, resolution_score 追加');
