-- =====================================================
-- 002_extend_file_index.sql
-- =====================================================
ALTER TABLE file_index ADD COLUMN is_self_made BOOLEAN DEFAULT 0;
ALTER TABLE file_index ADD COLUMN confidence REAL DEFAULT 0.0;
ALTER TABLE file_index ADD COLUMN classification_reason TEXT DEFAULT '';
ALTER TABLE file_index ADD COLUMN category TEXT DEFAULT 'unknown';
ALTER TABLE file_index ADD COLUMN schema_version TEXT DEFAULT '1.5';

CREATE INDEX IF NOT EXISTS idx_self_made ON file_index(is_self_made);
CREATE INDEX IF NOT EXISTS idx_category ON file_index(category);
CREATE INDEX IF NOT EXISTS idx_confidence ON file_index(confidence);

INSERT INTO schema_migrations (version, description)
VALUES ('2.0-file-index', 'file_index: is_self_made, confidence, classification_reason, category 追加');
