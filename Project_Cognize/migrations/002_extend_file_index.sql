-- 002_extend_file_index.sql
ALTER TABLE file_index ADD COLUMN is_self_made BOOLEAN DEFAULT 0;
ALTER TABLE file_index ADD COLUMN confidence REAL DEFAULT 0.0;
ALTER TABLE file_index ADD COLUMN classification_reason TEXT;
ALTER TABLE file_index ADD COLUMN category TEXT;
CREATE INDEX IF NOT EXISTS idx_self_made ON file_index(is_self_made);
CREATE INDEX IF NOT EXISTS idx_category ON file_index(category);