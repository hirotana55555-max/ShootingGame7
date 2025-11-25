-- =====================================================
-- 001_create_schema_migrations.sql
-- =====================================================
-- テーブル作成のみに修正。データ挿入は migrate.js が責任を持つ。
-- migrate.js の INSERT 文とカラム名を完全に一致させる。
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  file_hash VARCHAR(64) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
