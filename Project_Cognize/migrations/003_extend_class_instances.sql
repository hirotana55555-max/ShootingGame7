-- 003_extend_class_instances.sql
CREATE INDEX IF NOT EXISTS idx_class_name ON class_instances(class_name);