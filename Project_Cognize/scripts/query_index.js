#!/usr/bin/env node
/**
 * Query Index CLI Tool - ESM Complete Edition
 * 
 * @version 2.0
 * @description Command-line tool for querying static_index.db
 * @constitutional_compliance YES - Uses direct DB access for CLI simplicity
 * 
 * Commands:
 *   schema              - Show database schema and migration history
 *   list                - List all indexed files
 *   list --self-made-only - List only self-made files
 *   search <pattern>    - Search files by path pattern
 *   search <pattern> --fuzzy - Fuzzy search
 *   stats               - Show project statistics
 *   stats --by-category - Show stats grouped by category
 *   deps <file>         - Show file dependencies
 *   instances <class>   - Show class instantiation locations
 *   instances <class> --show-builtins - Include built-in classes
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

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function openDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    log(`✗ Database not found: ${DB_PATH}`, 'red');
    log('  Hint: Run "node Project_Cognize/scripts/migrate.js" first', 'yellow');
    process.exit(1);
  }
  return new Database(DB_PATH, { readonly: true });
}

// ========== Command: schema ==========
function cmdSchema(db) {
  log('\n=== Database Schema ===\n', 'cyan');
  
  // Show all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  
  log('📋 Tables:', 'bright');
  tables.forEach(t => {
    const columns = db.prepare(`PRAGMA table_info(${t.name})`).all();
    log(`\n  ${t.name}`, 'green');
    columns.forEach(col => {
      const pk = col.pk ? ' [PK]' : '';
      const nn = col.notnull ? ' NOT NULL' : '';
      log(`    - ${col.name} (${col.type}${pk}${nn})`, 'dim');
    });
  });
  
  // Show migration history
  log('\n📜 Migration History:', 'bright');
  try {
    const migrations = db.prepare('SELECT migration_name, applied_at, description FROM migration_history ORDER BY id').all();
    if (migrations.length > 0) {
      migrations.forEach(m => {
        log(`  ✓ ${m.migration_name}`, 'green');
        log(`    Applied: ${m.applied_at}`, 'dim');
        if (m.description) {
          log(`    ${m.description}`, 'dim');
        }
      });
    } else {
      log('  (No migrations recorded)', 'yellow');
    }
  } catch (err) {
    log('  ⚠ Migration history unavailable', 'yellow');
  }
  
  // Show statistics
  log('\n📊 Statistics:', 'bright');
  const stats = {
    files: db.prepare('SELECT COUNT(*) as count FROM file_index').get().count,
    symbols: db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='symbols'").get().count > 0 
      ? db.prepare('SELECT COUNT(*) as count FROM symbols').get().count 
      : 0,
    dependencies: db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='file_dependencies'").get().count > 0
      ? db.prepare('SELECT COUNT(*) as count FROM file_dependencies').get().count
      : 0,
    instances: db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='class_instances'").get().count > 0
      ? db.prepare('SELECT COUNT(*) as count FROM class_instances').get().count
      : 0
  };
  
  log(`  Files: ${stats.files}`, 'cyan');
  log(`  Symbols: ${stats.symbols}`, 'cyan');
  log(`  Dependencies: ${stats.dependencies}`, 'cyan');
  log(`  Class instances: ${stats.instances}`, 'cyan');
}

// ========== Command: list ==========
function cmdList(db, options) {
  const selfMadeOnly = options.includes('--self-made-only');
  
  let query = 'SELECT path, language, loc, is_self_made, category FROM file_index';
  if (selfMadeOnly) {
    query += ' WHERE is_self_made = 1';
  }
  query += ' ORDER BY path';
  
  const files = db.prepare(query).all();
  
  log(`\n=== File List ${selfMadeOnly ? '(Self-Made Only)' : ''} ===\n`, 'cyan');
  log(`Found ${files.length} files:\n`, 'bright');
  
  files.forEach(f => {
    const selfMade = f.is_self_made ? '✓' : ' ';
    const category = f.category ? `[${f.category}]` : '';
    log(`  ${selfMade} ${f.path}`, 'green');
    log(`     ${f.language} | ${f.loc} LOC ${category}`, 'dim');
  });
}

// ========== Command: search ==========
function cmdSearch(db, pattern, options) {
  const fuzzy = options.includes('--fuzzy');
  
  if (!pattern) {
    log('✗ Error: Search pattern required', 'red');
    log('  Usage: search <pattern> [--fuzzy]', 'yellow');
    process.exit(1);
  }
  
  let query, params;
  if (fuzzy) {
    query = 'SELECT path, language, loc, category FROM file_index WHERE path LIKE ? ORDER BY path';
    params = [`%${pattern}%`];
  } else {
    query = 'SELECT path, language, loc, category FROM file_index WHERE path = ? OR path LIKE ? ORDER BY path';
    params = [pattern, `%${pattern}%`];
  }
  
  const files = db.prepare(query).all(...params);
  
  log(`\n=== Search Results: "${pattern}" ${fuzzy ? '(fuzzy)' : ''} ===\n`, 'cyan');
  
  if (files.length === 0) {
    log('  No files found', 'yellow');
    return;
  }
  
  log(`Found ${files.length} files:\n`, 'bright');
  files.forEach(f => {
    const category = f.category ? `[${f.category}]` : '';
    log(`  ${f.path}`, 'green');
    log(`     ${f.language} | ${f.loc} LOC ${category}`, 'dim');
  });
}

// ========== Command: stats ==========
function cmdStats(db, options) {
  const byCategory = options.includes('--by-category');
  
  log('\n=== Project Statistics ===\n', 'cyan');
  
  // Overall stats
  const overall = db.prepare(`
    SELECT 
      COUNT(*) as total_files,
      SUM(loc) as total_loc,
      SUM(CASE WHEN is_self_made = 1 THEN 1 ELSE 0 END) as self_made_files,
      SUM(CASE WHEN is_critical = 1 THEN 1 ELSE 0 END) as critical_files
    FROM file_index
  `).get();
  
  log('📊 Overall:', 'bright');
  log(`  Total files: ${overall.total_files}`, 'cyan');
  log(`  Total LOC: ${overall.total_loc}`, 'cyan');
  log(`  Self-made files: ${overall.self_made_files} (${(overall.self_made_files/overall.total_files*100).toFixed(1)}%)`, 'green');
  log(`  Critical files: ${overall.critical_files}`, 'yellow');
  
  // Language breakdown
  const languages = db.prepare(`
    SELECT language, COUNT(*) as count, SUM(loc) as total_loc
    FROM file_index
    GROUP BY language
    ORDER BY count DESC
  `).all();
  
  log('\n📝 Languages:', 'bright');
  languages.forEach(l => {
    log(`  ${l.language}: ${l.count} files (${l.total_loc} LOC)`, 'cyan');
  });
  
  // Category breakdown (if requested)
  if (byCategory) {
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(loc) as total_loc
      FROM file_index
      WHERE is_self_made = 1 AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `).all();
    
    if (categories.length > 0) {
      log('\n🏷️  Categories (Self-Made Only):', 'bright');
      categories.forEach(c => {
        log(`  ${c.category}: ${c.count} files (${c.total_loc} LOC)`, 'magenta');
      });
    }
  }
  
  // Symbols stats (if table exists)
  try {
    const symbolStats = db.prepare(`
      SELECT symbol_type, COUNT(*) as count
      FROM symbols
      GROUP BY symbol_type
      ORDER BY count DESC
    `).all();
    
    if (symbolStats.length > 0) {
      log('\n🔤 Symbols:', 'bright');
      const totalSymbols = symbolStats.reduce((sum, s) => sum + s.count, 0);
      log(`  Total: ${totalSymbols}`, 'cyan');
      symbolStats.forEach(s => {
        log(`  ${s.symbol_type}: ${s.count}`, 'cyan');
      });
    }
  } catch (err) {
    // Symbols table doesn't exist
  }
}

// ========== Command: deps ==========
function cmdDeps(db, filePath) {
  if (!filePath) {
    log('✗ Error: File path required', 'red');
    log('  Usage: deps <file-path>', 'yellow');
    process.exit(1);
  }
  
  // Normalize path
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Check if file exists
  const file = db.prepare('SELECT * FROM file_index WHERE path = ?').get(normalizedPath);
  if (!file) {
    log(`✗ File not found: ${normalizedPath}`, 'red');
    process.exit(1);
  }
  
  log(`\n=== Dependencies: ${normalizedPath} ===\n`, 'cyan');
  
  // Imports (what this file depends on)
  const imports = db.prepare(`
    SELECT target_module, import_type
    FROM file_dependencies
    WHERE source_path = ?
    ORDER BY target_module
  `).all(normalizedPath);
  
  if (imports.length > 0) {
    log('📥 Imports (this file depends on):', 'bright');
    imports.forEach(imp => {
      const type = imp.import_type === 'reexport' ? '[reexport]' : '';
      log(`  → ${imp.target_module} ${type}`, 'cyan');
    });
  } else {
    log('📥 Imports: (none)', 'dim');
  }
  
  // Imported by (what depends on this file)
  const importedBy = db.prepare(`
    SELECT source_path, import_type
    FROM file_dependencies
    WHERE target_module = ? OR target_module LIKE ?
    ORDER BY source_path
  `).all(normalizedPath, `./${normalizedPath}%`);
  
  if (importedBy.length > 0) {
    log('\n📤 Imported by (files that depend on this):', 'bright');
    importedBy.forEach(imp => {
      const type = imp.import_type === 'reexport' ? '[reexport]' : '';
      log(`  ← ${imp.source_path} ${type}`, 'green');
    });
  } else {
    log('\n📤 Imported by: (none)', 'dim');
  }
}

// ========== Command: instances ==========
function cmdInstances(db, className, options) {
  if (!className) {
    log('✗ Error: Class name required', 'red');
    log('  Usage: instances <class-name> [--show-builtins]', 'yellow');
    process.exit(1);
  }
  
  const showBuiltins = options.includes('--show-builtins');
  
  // Check if class_instances table exists
  const hasTable = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='class_instances'").get().count > 0;
  
  if (!hasTable) {
    log('✗ class_instances table not found', 'red');
    log('  Hint: Run indexer.js to populate instance data', 'yellow');
    process.exit(1);
  }
  
  const instances = db.prepare(`
    SELECT file_path, line_number, code_snippet
    FROM class_instances
    WHERE class_name = ?
    ORDER BY file_path, line_number
  `).all(className);
  
  log(`\n=== Instances of "${className}" ===\n`, 'cyan');
  
  if (instances.length === 0) {
    log('  No instances found', 'yellow');
    if (!showBuiltins && /^[A-Z]/.test(className)) {
      log('  (Built-in classes are hidden by default. Use --show-builtins to show them)', 'dim');
    }
    return;
  }
  
  log(`Found ${instances.length} instances:\n`, 'bright');
  
  instances.forEach(inst => {
    log(`  ${inst.file_path}:${inst.line_number}`, 'green');
    if (inst.code_snippet) {
      const lines = inst.code_snippet.split('\n');
      lines.forEach(line => {
        log(`    ${line}`, 'dim');
      });
    }
    log('');
  });
}

// ========== Main ==========
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('\n=== Query Index CLI Tool ===\n', 'bright');
    log('Usage: node query_index.js <command> [options]\n', 'cyan');
    log('Commands:', 'bright');
    log('  schema                     - Show database schema', 'cyan');
    log('  list                       - List all files', 'cyan');
    log('  list --self-made-only      - List only self-made files', 'cyan');
    log('  search <pattern>           - Search files by path', 'cyan');
    log('  search <pattern> --fuzzy   - Fuzzy search', 'cyan');
    log('  stats                      - Show project statistics', 'cyan');
    log('  stats --by-category        - Stats grouped by category', 'cyan');
    log('  deps <file>                - Show file dependencies', 'cyan');
    log('  instances <class>          - Show class instances', 'cyan');
    log('  instances <class> --show-builtins - Include built-ins\n', 'cyan');
    process.exit(0);
  }
  
  const command = args[0];
  const options = args.slice(1);
  
  const db = openDatabase();
  
  try {
    switch (command) {
      case 'schema':
        cmdSchema(db);
        break;
      case 'list':
        cmdList(db, options);
        break;
      case 'search':
        cmdSearch(db, args[1], options);
        break;
      case 'stats':
        cmdStats(db, options);
        break;
      case 'deps':
        cmdDeps(db, args[1]);
        break;
      case 'instances':
        cmdInstances(db, args[1], options);
        break;
      default:
        log(`✗ Unknown command: ${command}`, 'red');
        log('  Run without arguments to see usage', 'yellow');
        process.exit(1);
    }
  } finally {
    db.close();
  }
}

main();