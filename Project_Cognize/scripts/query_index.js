#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DB_PATH = path.join(PROJECT_ROOT, 'Project_Cognize/database/static_index.db');

function openDB() {
  try {
    return new Database(DB_PATH, { readonly: true });
  } catch (err) {
    console.error(`\n❌ データベースを開けません: ${DB_PATH}`);
    console.error(`エラー: ${err.message}\n`);
    console.error('ヒント: 先に indexer.js を実行してください');
    process.exit(1);
  }
}

function getTableColumns(db, tableName) {
  try {
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return new Set(rows.map(r => r.name));
  } catch (err) {
    return new Set();
  }
}

function escapeLikePattern(str) {
  return str.replace(/([%_\\])/g, '\\$1');
}

function normalizePath(inputPath) {
  if (!inputPath) return '';
  let normalized = inputPath.replace(/^\.\//, '');
  if (path.isAbsolute(normalized)) {
    normalized = path.relative(PROJECT_ROOT, normalized);
  }
  return normalized.replace(/\\/g, '/');
}

function safeNumber(value, defaultValue = 0) {
  return value != null ? value : defaultValue;
}

function formatFileInfo(row, columns) {
  const parts = [`📄 ${row.path}`, `  言語: ${row.language} | LOC: ${row.loc}`];
  
  if (columns.has('is_self_made') && row.is_self_made) {
    const conf = row.confidence ? ` (${(row.confidence * 100).toFixed(0)}%)` : '';
    const cat = row.category ? ` [${row.category}]` : '';
    parts.push(`  自作コード${conf}${cat}`);
  }
  
  if (columns.has('is_critical') && row.is_critical) {
    parts.push(`  🔴 クリティカルファイル`);
  }
  
  if (row.updated_at) {
    parts.push(`  最終更新: ${row.updated_at}`);
  }
  
  return parts.join('\n');
}

function showSchema() {
  const db = openDB();
  try {
    console.log('\n=== データベーススキーマ情報 ===\n');
    const tables = ['file_index', 'file_dependencies', 'class_instances', 'indexer_runs', 'schema_migrations'];
    
    tables.forEach(table => {
      try {
        const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
        console.log(`📊 ${table} (${count}件):`);
        const columns = db.prepare(`PRAGMA table_info(${table})`).all();
        columns.forEach(col => {
          const pk = col.pk ? ' [PK]' : '';
          const nn = col.notnull ? ' NOT NULL' : '';
          const def = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
          console.log(`  - ${col.name}: ${col.type}${pk}${nn}${def}`);
        });
        console.log('');
      } catch (e) {
        console.log(`📊 ${table}: (テーブルが存在しません)`);
      }
    });
    
    const schemaMigrations = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='schema_migrations'
    `).get();
    
    if (schemaMigrations) {
      console.log('📜 マイグレーション履歴:');
      const migrations = db.prepare(`
        SELECT version, applied_at, description 
        FROM schema_migrations 
        ORDER BY id DESC
      `).all();
      migrations.forEach(m => {
        console.log(`  ${m.version} - ${m.applied_at.substring(0, 19)}: ${m.description}`);
      });
    }
  } finally {
    db.close();
  }
}

function listAll(options = {}) {
  const db = openDB();
  const columns = getTableColumns(db, 'file_index');
  
  try {
    let sql = 'SELECT * FROM file_index';
    const conditions = [];
    
    if (options.selfMadeOnly && columns.has('is_self_made')) {
      conditions.push('is_self_made = 1');
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY path';
    const rows = db.prepare(sql).all();
    
    console.log(`\n=== 全ファイル一覧 (${rows.length}件) ===\n`);
    rows.forEach(row => {
      console.log(formatFileInfo(row, columns));
      console.log('');
    });
  } finally {
    db.close();
  }
}

function search(pattern, options = {}) {
  const db = openDB();
  const columns = getTableColumns(db, 'file_index');
  
  try {
    const escapedPattern = options.fuzzy 
      ? `%${pattern}%`
      : `%${escapeLikePattern(pattern)}%`;
    
    const rows = db.prepare(`
      SELECT * FROM file_index
      WHERE path LIKE ? ESCAPE '\\'
      ORDER BY path
    `).all(escapedPattern);
    
    console.log(`\n=== 検索結果: "${pattern}" (${rows.length}件) ===\n`);
    
    if (rows.length === 0) {
      console.log('該当するファイルが見つかりませんでした。\n');
      return;
    }
    
    rows.forEach(row => {
      console.log(formatFileInfo(row, columns));
      
      if (row.symbols_json) {
        try {
          const symbols = JSON.parse(row.symbols_json);
          if (symbols.length > 0) {
            const names = symbols.slice(0, 5).map(s => s.name).join(', ');
            const more = symbols.length > 5 ? ` ... (+${symbols.length - 5})` : '';
            console.log(`  シンボル: ${names}${more}`);
          }
        } catch (e) {}
      }
      console.log('');
    });
  } finally {
    db.close();
  }
}

function stats(options = {}) {
  const db = openDB();
  const columns = getTableColumns(db, 'file_index');
  
  try {
    const total = db.prepare('SELECT COUNT(*) as count, SUM(loc) as total_loc FROM file_index').get();
    const totalFiles = safeNumber(total.count);
    const totalLoc = safeNumber(total.total_loc);
    
    console.log('\n=== 統計情報 ===\n');
    console.log(`総ファイル数: ${totalFiles}`);
    console.log(`総行数: ${totalLoc.toLocaleString()}`);
    
    if (columns.has('is_self_made')) {
      const selfMade = db.prepare(`
        SELECT COUNT(*) as count, SUM(loc) as total_loc 
        FROM file_index 
        WHERE is_self_made = 1
      `).get();
      const selfMadeFiles = safeNumber(selfMade.count);
      const selfMadeLoc = safeNumber(selfMade.total_loc);
      const percentage = totalFiles > 0 ? (selfMadeFiles / totalFiles * 100).toFixed(1) : 0;
      
      console.log(`\n自作コード: ${selfMadeFiles}ファイル (${percentage}%)`);
      console.log(`自作コードLOC: ${selfMadeLoc.toLocaleString()}`);
    }
    
    if (columns.has('is_critical')) {
      const critical = db.prepare('SELECT COUNT(*) as count FROM file_index WHERE is_critical = 1').get();
      console.log(`クリティカルファイル: ${safeNumber(critical.count)}個`);
    }
    
    console.log('\n📊 言語別内訳:');
    const byLang = db.prepare(`
      SELECT language, COUNT(*) as count, SUM(loc) as total_loc
      FROM file_index
      GROUP BY language
      ORDER BY total_loc DESC
    `).all();
    
    byLang.forEach(row => {
      const loc = safeNumber(row.total_loc);
      console.log(`  ${row.language}: ${row.count}ファイル (${loc.toLocaleString()}行)`);
    });
    
    if (options.byCategory && columns.has('category')) {
      console.log('\n📂 カテゴリ別内訳:');
      const byCategory = db.prepare(`
        SELECT category, COUNT(*) as count, SUM(loc) as total_loc
        FROM file_index
        WHERE is_self_made = 1
        GROUP BY category
        ORDER BY count DESC
      `).all();
      
      byCategory.forEach(row => {
        const loc = safeNumber(row.total_loc);
        console.log(`  ${row.category}: ${row.count}ファイル (${loc.toLocaleString()}行)`);
      });
    }
    
    console.log('\n📏 行数TOP10:');
    const topFiles = db.prepare(`
      SELECT path, loc
      FROM file_index
      ORDER BY loc DESC
      LIMIT 10
    `).all();
    
    topFiles.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.path} (${row.loc}行)`);
    });
    
    const instanceStats = db.prepare('SELECT COUNT(*) as total FROM class_instances').get();
    console.log(`\n🔧 総インスタンス化: ${safeNumber(instanceStats.total)}箇所`);
    
    const topClasses = db.prepare(`
      SELECT class_name, COUNT(*) as count
      FROM class_instances
      GROUP BY class_name
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    if (topClasses.length > 0) {
      console.log('\n頻繁にインスタンス化されるクラスTOP10:');
      topClasses.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row.class_name} (${row.count}箇所)`);
      });
    }
    
    console.log('');
  } finally {
    db.close();
  }
}

function showDependencies(file, options = {}) {
  const db = openDB();
  
  try {
    const normalizedFile = normalizePath(file);
    
    const dependencies = db.prepare(`
      SELECT DISTINCT target_module, import_type
      FROM file_dependencies
      WHERE source_path = ?
      ORDER BY target_module
    `).all(normalizedFile);
    
    let dependents;
    if (options.fuzzy) {
      const basename = path.basename(normalizedFile, path.extname(normalizedFile));
      dependents = db.prepare(`
        SELECT DISTINCT source_path
        FROM file_dependencies
        WHERE target_module LIKE ? ESCAPE '\\'
        ORDER BY source_path
      `).all(`%${escapeLikePattern(basename)}%`);
    } else {
      const withoutExt = normalizedFile.replace(/\.[^.]+$/, '');
      dependents = db.prepare(`
        SELECT DISTINCT source_path
        FROM file_dependencies
        WHERE target_module = ? OR target_module = ?
        ORDER BY source_path
      `).all(normalizedFile, withoutExt);
    }
    
    console.log(`\n=== 依存関係: ${normalizedFile} ===\n`);
    
    console.log(`📥 このファイルが使用しているモジュール (${dependencies.length}個):`);
    if (dependencies.length === 0) {
      console.log('  (なし)');
    } else {
      dependencies.forEach(dep => {
        console.log(`  - ${dep.target_module} [${dep.import_type}]`);
      });
    }
    
    console.log(`\n📤 このファイルを使用しているファイル (${dependents.length}個):`);
    if (dependents.length === 0) {
      console.log('  (なし)');
    } else {
      dependents.forEach(dep => {
        console.log(`  - ${dep.source_path}`);
      });
    }
    
    if (options.fuzzy && dependents.length > 0) {
      console.log('\nℹ️  --fuzzy オプションにより部分一致で検索しています');
    }
    
    console.log('');
  } finally {
    db.close();
  }
}

function showInstances(className, options = {}) {
  const db = openDB();
  const columns = getTableColumns(db, 'class_instances');
  
  try {
    let sql = `
      SELECT 
        class_name, file_path, line_number, code_snippet,
        arguments_json, created_at
    `;
    
    if (columns.has('is_builtin')) sql += ', is_builtin';
    if (columns.has('inferred_module')) sql += ', inferred_module';
    
    sql += `
      FROM class_instances
      WHERE class_name LIKE ? ESCAPE '\\'
    `;
    
    if (!options.showBuiltins && columns.has('is_builtin')) {
      sql += ' AND (is_builtin = 0 OR is_builtin IS NULL)';
    }
    
    sql += ' ORDER BY file_path, line_number';
    
    const instances = db.prepare(sql).all(`%${escapeLikePattern(className)}%`);
    
    if (instances.length === 0) {
      console.log(`\n⚠️  クラス "${className}" のインスタンスは見つかりませんでした。\n`);
      return;
    }
    
    console.log(`\n=== "${className}" のインスタンス (${instances.length}箇所) ===\n`);
    
    instances.forEach((inst, idx) => {
      console.log(`【${idx + 1}】 ${inst.class_name}`);
      console.log(`  📄 ファイル: ${inst.file_path}`);
      console.log(`  📍 行番号: ${inst.line_number}`);
      console.log(`  📅 記録日時: ${inst.created_at}`);
      
      if (columns.has('is_builtin') && inst.is_builtin) {
        console.log(`  🔧 ビルトインクラス`);
      }
      
      if (columns.has('inferred_module') && inst.inferred_module) {
        console.log(`  📦 モジュール: ${inst.inferred_module}`);
      }
      
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
      const snippet = inst.code_snippet.replace(/\r\n?/g, '\n');
      snippet.split('\n').forEach(line => {
        console.log(`      ${line}`);
      });
      console.log('');
    });
    
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
  } finally {
    db.close();
  }
}

const command = process.argv[2];
const arg = process.argv[3];
const flags = process.argv.slice(2);

const options = {
  selfMadeOnly: flags.includes('--self-made-only'),
  byCategory: flags.includes('--by-category'),
  fuzzy: flags.includes('--fuzzy'),
  showBuiltins: flags.includes('--show-builtins')
};

switch (command) {
  case 'schema':
    showSchema();
    break;
  case 'list':
    listAll(options);
    break;
  case 'search':
    if (!arg) {
      console.error('❌ エラー: 検索パターンを指定してください');
      process.exit(1);
    }
    search(arg, options);
    break;
  case 'stats':
    stats(options);
    break;
  case 'deps':
    if (!arg) {
      console.error('❌ エラー: ファイルパスを指定してください');
      process.exit(1);
    }
    showDependencies(arg, options);
    break;
  case 'instances':
    if (!arg) {
      console.error('❌ エラー: クラス名を指定してください');
      process.exit(1);
    }
    showInstances(arg, options);
    break;
  default:
    console.log(`
Cognize Query Tool v2.0

コマンド:
  schema                            スキーマ情報
  list [--self-made-only]           ファイル一覧
  search <pattern> [--fuzzy]        検索
  stats [--by-category]             統計
  deps <file> [--fuzzy]             依存関係
  instances <class> [--show-builtins]  インスタンス検索
    `);
}
