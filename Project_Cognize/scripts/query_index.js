#!/usr/bin/env node
/**
 * Cognize Query Tool v1.3
 * 
 * 使い方:
 *   node Project_Cognize/scripts/query_index.js list
 *   node Project_Cognize/scripts/query_index.js search <pattern>
 *   node Project_Cognize/scripts/query_index.js stats
 *   node Project_Cognize/scripts/query_index.js deps <file>
 *   node Project_Cognize/scripts/query_index.js instances <className>  ★新規
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

  // ★ 新規: インスタンス統計
  const instanceStats = db.prepare(`
    SELECT COUNT(*) as total_instances FROM class_instances
  `).get();

  const topClasses = db.prepare(`
    SELECT class_name, COUNT(*) as count
    FROM class_instances
    GROUP BY class_name
    ORDER BY count DESC
    LIMIT 10
  `).all();

  console.log('\n=== 統計情報 ===\n');
  console.log(`総ファイル数: ${total.count}`);
  console.log(`総行数: ${total.total_loc.toLocaleString()}`);
  console.log(`総インスタンス化: ${instanceStats.total_instances} 箇所`);
  
  console.log('\n言語別内訳:');
  byLang.forEach(row => {
    console.log(`  ${row.language}: ${row.count}ファイル (${row.total_loc.toLocaleString()}行)`);
  });

  console.log('\n行数TOP10:');
  topFiles.forEach((row, idx) => {
    console.log(`  ${idx + 1}. ${row.path} (${row.loc}行)`);
  });

  console.log('\n頻繁にインスタンス化されるクラスTOP10:');
  topClasses.forEach((row, idx) => {
    console.log(`  ${idx + 1}. ${row.class_name} (${row.count}箇所)`);
  });

  db.close();
}

function showDependencies(file) {
  const db = openDB();

  const dependencies = db.prepare(`
    SELECT DISTINCT target_module, import_type
    FROM file_dependencies
    WHERE source_path = ?
    ORDER BY target_module
  `).all(file);

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

// ===== ★ 新規: インスタンス検索機能 =====
function showInstances(className) {
  const db = openDB();

  // クラス名の完全一致または部分一致
  const instances = db.prepare(`
    SELECT 
      class_name,
      file_path,
      line_number,
      code_snippet,
      arguments_json,
      created_at
    FROM class_instances
    WHERE class_name LIKE ?
    ORDER BY file_path, line_number
  `).all(`%${className}%`);

  if (instances.length === 0) {
    console.log(`\n⚠️  クラス "${className}" のインスタンスは見つかりませんでした。\n`);
    console.log('ヒント: 以下のコマンドで頻繁に使用されるクラスを確認できます:');
    console.log('  node Project_Cognize/scripts/query_index.js stats\n');
    db.close();
    return;
  }

  console.log(`\n=== "${className}" のインスタンス (${instances.length}箇所) ===\n`);

  instances.forEach((inst, idx) => {
    console.log(`【${idx + 1}】 ${inst.class_name}`);
    console.log(`  📄 ファイル: ${inst.file_path}`);
    console.log(`  📍 行番号: ${inst.line_number}`);
    console.log(`  📅 記録日時: ${inst.created_at}`);
    
    // 引数情報の解析
    const args = JSON.parse(inst.arguments_json || '[]');
    if (args.length > 0) {
      console.log(`  🔧 引数:`);
      args.forEach((arg, argIdx) => {
        if (arg.type === 'object' && arg.properties) {
          console.log(`    [${argIdx}] オブジェクト:`);
          arg.properties.forEach(prop => {
            const valueStr = prop.value !== null ? ` = ${prop.value}` : '';
            console.log(`      - ${prop.key}: ${prop.valueType}${valueStr}`);
          });
        } else if (arg.type === 'literal') {
          console.log(`    [${argIdx}] リテラル: ${arg.value}`);
        } else if (arg.type === 'identifier') {
          console.log(`    [${argIdx}] 変数: ${arg.name}`);
        } else {
          console.log(`    [${argIdx}] ${arg.type}`);
        }
      });
    } else {
      console.log(`  🔧 引数: なし`);
    }
    
    console.log(`  💻 コード:`);
    const snippetLines = inst.code_snippet.split('\n');
    snippetLines.forEach(line => {
      console.log(`      ${line}`);
    });
    console.log('');
  });

  // 統計サマリ
  const fileGroups = {};
  instances.forEach(inst => {
    fileGroups[inst.file_path] = (fileGroups[inst.file_path] || 0) + 1;
  });

  console.log('📊 ファイル別集計:');
  Object.entries(fileGroups)
    .sort((a, b) => b[1] - a[1])
    .forEach(([file, count]) => {
      console.log(`  ${file}: ${count}箇所`);
    });

  console.log('');
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
  
  case 'instances':
    if (!arg) {
      console.error('エラー: クラス名を指定してください');
      console.error('');
      console.error('使用例:');
      console.error('  node Project_Cognize/scripts/query_index.js instances Health');
      console.error('  node Project_Cognize/scripts/query_index.js instances Position');
      process.exit(1);
    }
    showInstances(arg);
    break;
  
  default:
    console.log(`
使用方法:
  node Project_Cognize/scripts/query_index.js list              # 全ファイル一覧
  node Project_Cognize/scripts/query_index.js search <pattern>  # パターン検索
  node Project_Cognize/scripts/query_index.js stats             # 統計情報
  node Project_Cognize/scripts/query_index.js deps <file>       # 依存関係
  node Project_Cognize/scripts/query_index.js instances <class> # インスタンス検索 ★新規
    `);
}
