#!/usr/bin/env node
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DB_PATH = path.join(PROJECT_ROOT, 'Project_Cognize/database/static_index.db');
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'Project_Cognize/migrations');

function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function openDB(readonly = false) {
  const options = readonly ? { readonly: true } : {};
  try {
    return new Database(DB_PATH, options);
  } catch (err) {
    if (err.code === 'SQLITE_CANTOPEN') {
      console.log('ℹ️  データベースファイルが存在しません。新規作成を試みます。');
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      return new Database(DB_PATH, options);
    }
    throw err;
  }
}

// 最終修正: 001.sqlと完全に一致させる
function ensureMigrationsTable(db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        file_hash VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return true;
  } catch (err) {
    console.error('❌ マイグレーションテーブルの準備に失敗しました:', err.message);
    return false;
  }
}

function getAppliedMigrations(db) {
  try {
    const stmt = db.prepare('SELECT version, file_hash FROM schema_migrations');
    const rows = stmt.all();
    const applied = new Map();
    for (const row of rows) {
      // file_hash が NULL の可能性を考慮し、version のみで判断
      const version = row.version.split('_')[0]; 
      applied.set(version, row.file_hash);
    }
    return applied;
  } catch (err) {
    // schema_migrations テーブルが存在しない場合
    if (err.message.includes('no such table')) {
      return new Map();
    }
    throw err;
  }
}

function run(options = {}) {
  console.log('=== Cognize Migration Manager ===\\n');
  const { dryRun = false } = options;

  if (dryRun) {
    console.log('✓ モード: DRY-RUN（実際の変更は行いません）');
  }

  const db = openDB(dryRun);

  try {
    if (!dryRun && !ensureMigrationsTable(db)) {
      return;
    }

    const appliedMigrations = getAppliedMigrations(db);
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('• マイグレーションファイル: ${migrationFiles.length}個\\n');
    let appliedCount = 0;

    for (const file of migrationFiles) {
      // 厳密な連番形式 (001, 002...) のみを取得
      const version = file.split('_')[0];

      const filePath = path.join(MIGRATIONS_DIR, file);
      const fileHash = getFileHash(filePath);
      const description = file.substring(version.length + 1, file.length - 4).replace(/_/g, ' ');
      
      // 既に適用済み、かつハッシュが一致すればスキップ
      if (appliedMigrations.has(version)) {
        const storedHash = appliedMigrations.get(version);
        if (storedHash !== fileHash) {
          console.warn('⚠️  警告: ${file} は適用済みですが、ハッシュが異なります！');
          console.warn('   - DB記録: ${storedHash}');
          console.warn('   - ファイル: ${fileHash}');
        }
        continue;
      }

      console.log('✓ 適用中: ${file}');
      appliedCount++;

      if (dryRun) {
        console.log('  (DRY-RUNモード: 実際には実行されません)');
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log('--- SQL ---');
        console.log(sql.trim());
        console.log('-----------');
      } else {
        const sql = fs.readFileSync(filePath, 'utf8');
        db.exec(sql);
        // 最終修正: 3つの列に3つの値を正しく挿入
        const stmt = db.prepare('INSERT INTO schema_migrations (version, description, file_hash) VALUES (?, ?, ?)');
        stmt.run(version, description, fileHash);
        console.log('  -> 完了');
      }
    }

    if (appliedCount === 0) {
      console.log('✓ データベースは最新の状態です。適用する新しいマイグレーションはありません。');
    } else {
      console.log('\\n✨ ${appliedCount}個のマイグレーションが正常に適用されました。');
    }

  } catch (err) {
    console.error('\\n❌ マイグレーション中にエラーが発生しました:', err.message);
    if (!dryRun) {
      console.error('データベースが不整合な状態にある可能性があります。確認してください。');
    }
  } finally {
    db.close();
  }
}

const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run') || args.includes('-d'),
};

run(options);