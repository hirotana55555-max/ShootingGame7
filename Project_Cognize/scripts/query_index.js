#!/usr/bin/env node
/**
 * Cognize Query Tool
 * SQLiteインデックスを検索
 * 
 * 使い方:
 *   node Project_Cognize/scripts/query_index.js list
 *   node Project_Cognize/scripts/query_index.js search <pattern>
 *   node Project_Cognize/scripts/query_index.js stats
 *   node Project_Cognize/scripts/query_index.js deps <file>
 */

const Database = require('better-sqlite3');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DB_PATH = path.join(PROJECT_ROOT, 'Project_Cognize/database/static_index.db');

function openDB() {
  return new Database(DB_PATH, { readonly: true });
}

function listAll() {
  const db = openDB();
  const rows = db.prepare(`
    SELECT path, language, loc, updated_at
    FROM file_index
    ORDER BY path
  `).all();

  console.log(`\n=== 全ファイル一覧 (${rows.length}件) ===\n`);
  rows.forEach(row => {
    console.log(`${row.path}`);
    console.log(`  言語: ${row.language} | LOC: ${row.loc} | 更新: ${row.updated_at}`);
  });
  db.close();
}

function search(pattern) {
  const db = openDB();
  const rows = db.prepare(`
    SELECT path, language, symbols_json, loc
    FROM file_index
    WHERE path LIKE ?
    ORDER BY path
  `).all(`%${pattern}%`);

  console.log(`\n=== 検索結果: "${pattern}" (${rows.length}件) ===\n`);
  rows.forEach(row => {
    const symbols = JSON.parse(row.symbols_json || '[]');
    console.log(`${row.path}`);
    console.log(`  ${row.language} | ${row.loc}行`);
    console.log(`  シンボル: ${symbols.map(s => s.name).join(', ')}`);
    console.log('');
  });
  db.close();
}

function stats() {
  const db = openDB();

  const total = db.prepare('SELECT COUNT(*) as count, SUM(loc) as total_loc FROM file_index').get();
  const byLang = db.prepare(`
    SELECT language, COUNT(*) as count, SUM(loc) as total_loc
    FROM file_index
    GROUP BY language
  `).all();

  const topFiles = db.prepare(`
    SELECT path, loc
    FROM file_index
    ORDER BY loc DESC
    LIMIT 10
  `).all();

  console.log('\n=== 統計情報 ===\n');
  console.log(`総ファイル数: ${total.count}`);
  console.log(`総行数: ${total.total_loc.toLocaleString()}`);
  
  console.log('\n言語別内訳:');
  byLang.forEach(row => {
    console.log(`  ${row.language}: ${row.count}ファイル (${row.total_loc.toLocaleString()}行)`);
  });

  console.log('\n行数TOP10:');
  topFiles.forEach((row, idx) => {
    console.log(`  ${idx + 1}. ${row.path} (${row.loc}行)`);
  });

  db.close();
}

function showDependencies(file) {
  const db = openDB();

  // このファイルが依存しているモジュール
  const dependencies = db.prepare(`
    SELECT DISTINCT target_module, import_type
    FROM file_dependencies
    WHERE source_path = ?
    ORDER BY target_module
  `).all(file);

  // このファイルに依存しているファイル
  const dependents = db.prepare(`
    SELECT DISTINCT source_path
    FROM file_dependencies
    WHERE target_module LIKE ?
    ORDER BY source_path
  `).all(`%${path.basename(file, path.extname(file))}%`);

  console.log(`\n=== 依存関係: ${file} ===\n`);
  
  console.log(`📥 このファイルが使用しているモジュール (${dependencies.length}個):`);
  dependencies.forEach(dep => {
    console.log(`  - ${dep.target_module} [${dep.import_type}]`);
  });

  console.log(`\n📤 このファイルを使用しているファイル (${dependents.length}個):`);
  dependents.forEach(dep => {
    console.log(`  - ${dep.source_path}`);
  });

  db.close();
}

// CLI処理
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'list':
    listAll();
    break;
  case 'search':
    if (!arg) {
      console.error('エラー: 検索パターンを指定してください');
      process.exit(1);
    }
    search(arg);
    break;
  case 'stats':
    stats();
    break;
  case 'deps':
    if (!arg) {
      console.error('エラー: ファイルパスを指定してください');
      process.exit(1);
    }
    showDependencies(arg);
    break;
  default:
    console.log(`
使用方法:
  node Project_Cognize/scripts/query_index.js list              # 全ファイル一覧
  node Project_Cognize/scripts/query_index.js search <pattern>  # パターン検索
  node Project_Cognize/scripts/query_index.js stats             # 統計情報
  node Project_Cognize/scripts/query_index.js deps <file>       # 依存関係
    `);
}
