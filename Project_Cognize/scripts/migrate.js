#!/usr/bin/env node
/**
 * Database Schema Migration Tool v2.0
 * 
 * @description Manages database schema evolution for static_index.db
 * @constitutional_compliance Uses Central Hub (db.js)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

// ESM環境で__dirnameを再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DB_PATH = path.join(PROJECT_ROOT, 'Project_Cognize/database/static_index.db');

console.log('=== Cognize Database Migration Tool v2.0 ===');
console.log(`Database: ${DB_PATH}`);

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`✓ Created database directory: ${dbDir}`);
}

// Open database connection
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('✓ Database connection established');

// === Migration History Table ===
db.exec(`
  CREATE TABLE IF NOT EXISTS migration_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
  )
`);

/**
 * Execute a migration if not already applied
 */
function runMigration(name, description, migrationFn) {
  const existing = db.prepare('SELECT id FROM migration_history WHERE migration_name = ?').get(name);
  
  if (existing) {
    console.log(`⊘ [SKIP] ${name} - Already applied`);
    return;
  }

  console.log(`→ [APPLYING] ${name}`);
  try {
    migrationFn(db);
    db.prepare('INSERT INTO migration_history (migration_name, description) VALUES (?, ?)').run(name, description);
    console.log(`✓ [SUCCESS] ${name}`);
  } catch (err) {
    console.error(`✗ [FAILED] ${name}: ${err.message}`);
    throw err;
  }
}

// === Migrations ===

runMigration('001_create_file_index', 'Initial file_index table', (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL UNIQUE,
      file_hash TEXT,
      language TEXT,
      symbols_json TEXT,
      imports_json TEXT,
      exports_json TEXT,
      loc INTEGER DEFAULT 0,
      updated_at TEXT,
      commit_sha TEXT,
      json_meta TEXT,
      is_critical INTEGER DEFAULT 0,
      last_accessed REAL
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_path ON file_index(path)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_language ON file_index(language)');
});

runMigration('002_add_classification_columns', 'Add self-made classification columns', (db) => {
  // Check which columns already exist
  const columns = db.prepare('PRAGMA table_info(file_index)').all();
  const columnNames = columns.map(c => c.name);
  
  if (!columnNames.includes('is_self_made')) {
    db.exec('ALTER TABLE file_index ADD COLUMN is_self_made INTEGER DEFAULT 1');
  }
  if (!columnNames.includes('confidence')) {
    db.exec('ALTER TABLE file_index ADD COLUMN confidence REAL DEFAULT 0.5');
  }
  if (!columnNames.includes('classification_reason')) {
    db.exec('ALTER TABLE file_index ADD COLUMN classification_reason TEXT');
  }
  if (!columnNames.includes('category')) {
    db.exec('ALTER TABLE file_index ADD COLUMN category TEXT DEFAULT \'unknown\'');
  }
});

runMigration('003_create_file_dependencies', 'Track file dependencies (imports)', (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_path TEXT NOT NULL,
      target_module TEXT NOT NULL,
      import_type TEXT DEFAULT 'import',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source_path, target_module, import_type)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_source_path ON file_dependencies(source_path)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_target_module ON file_dependencies(target_module)');
});

runMigration('004_create_class_instances', 'Track class instantiation locations', (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS class_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      line_number INTEGER,
      code_snippet TEXT,
      arguments_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      commit_sha TEXT
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_class_name ON class_instances(class_name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_file_path_instances ON class_instances(file_path)');
});

runMigration('005_create_symbols_table', 'Normalized symbol storage for TOON integration', (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS symbols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      symbol_name TEXT NOT NULL,
      symbol_type TEXT NOT NULL CHECK(symbol_type IN ('function', 'class', 'variable', 'const', 'interface', 'type', 'enum')),
      line_number INTEGER,
      is_exported INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(file_path, symbol_name, symbol_type, line_number)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_file_path_symbols ON symbols(file_path)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_symbol_name ON symbols(symbol_name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_symbol_type ON symbols(symbol_type)');
});

runMigration('006_populate_symbols_from_json', 'Migrate existing symbol data to normalized table', (db) => {
  const files = db.prepare('SELECT path, symbols_json FROM file_index WHERE symbols_json IS NOT NULL').all();
  
  let totalSymbols = 0;
  const insertSymbol = db.prepare(`
    INSERT OR IGNORE INTO symbols (file_path, symbol_name, symbol_type, line_number)
    VALUES (?, ?, ?, ?)
  `);

  files.forEach(file => {
    try {
      const symbols = JSON.parse(file.symbols_json);
      if (Array.isArray(symbols)) {
        symbols.forEach(sym => {
          if (sym.name && sym.type) {
            insertSymbol.run(file.path, sym.name, sym.type, sym.line || null);
            totalSymbols++;
          }
        });
      }
    } catch (err) {
      // Skip files with invalid JSON
    }
  });

  console.log(`   → Migrated ${totalSymbols} symbols from ${files.length} files`);
});

// === Schema Validation ===
console.log('\n📋 Current Schema:');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(table => {
  const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
  console.log(`\n  Table: ${table.name}`);
  columns.forEach(col => {
    console.log(`    - ${col.name} (${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''})`);
  });
});

// === Statistics ===
console.log('\n📊 Database Statistics:');

const stats = {
  files: db.prepare('SELECT COUNT(*) as count FROM file_index').get().count,
  symbols: db.prepare('SELECT COUNT(*) as count FROM symbols').get().count,
  dependencies: db.prepare('SELECT COUNT(*) as count FROM file_dependencies').get().count,
  instances: db.prepare('SELECT COUNT(*) as count FROM class_instances').get().count,
  migrations: db.prepare('SELECT COUNT(*) as count FROM migration_history').get().count
};

console.log(`  Files indexed: ${stats.files}`);
console.log(`  Symbols: ${stats.symbols}`);
console.log(`  Dependencies: ${stats.dependencies}`);
console.log(`  Class instances: ${stats.instances}`);
console.log(`  Migrations applied: ${stats.migrations}`);

// === Migration History ===
console.log('\n📜 Migration History:');
const history = db.prepare('SELECT migration_name, applied_at, description FROM migration_history ORDER BY id').all();
history.forEach(h => {
  console.log(`  ${h.applied_at} - ${h.migration_name}`);
  if (h.description) {
    console.log(`    ${h.description}`);
  }
});

db.close();
console.log('\n✓ Migration completed successfully');
console.log('✓ Database ready for use');