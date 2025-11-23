#!/usr/bin/env node
/**
 * Cognize Indexer v1.4 - 全自作コード対応版
 * 
 * 改善点:
 * - 開発補助システム自身を含む全自作コードを対象
 * - JSONファイルの安全な処理
 * - 未使用ファイル検出の基盤を構築
 * - ★ --full-scan時にDBを自動削除する機能を追加
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const glob = require('glob');
const Database = require('better-sqlite3');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// ====================
// 設定
// ====================
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const COGNIZE_ROOT = path.join(PROJECT_ROOT, 'Project_Cognize');
const JSONL_PATH = path.join(COGNIZE_ROOT, 'workspace/outputs/static_index.jsonl');
const DB_PATH = path.join(COGNIZE_ROOT, 'database/static_index.db');
const ARCHIVE_DIR = path.join(COGNIZE_ROOT, 'workspace/outputs');
const MAX_JSONL_SIZE_MB = 50;

const DRY_RUN = process.argv.includes('--dry-run');
const FULL_SCAN = process.argv.includes('--full-scan');
const VERBOSE = process.argv.includes('--verbose');

// ====================
// ユーティリティ
// ====================
function log(msg, level = 'info') {
  const icons = { info: '✓', warn: '⚠', error: '✗', verbose: '→', debug: '•' };
  if (level === 'verbose' && !VERBOSE) return;
  if (level === 'debug' && !VERBOSE) return;
  console.log(`${icons[level] || '•'} [${new Date().toISOString()}] ${msg}`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`ディレクトリ作成: ${path.relative(PROJECT_ROOT, dirPath)}`, 'verbose');
  }
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, '');
    log(`ファイル作成: ${path.relative(PROJECT_ROOT, filePath)}`, 'verbose');
  }
}

function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`ファイルが存在しません: ${filePath}`);
  }
  const data = fs.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(data).digest('hex');
}

function getCurrentCommit() {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    }).trim();
  } catch {
    return 'unknown';
  }
}

function getChangedFiles() {
  // ★ 全自作コード対応: 開発補助システム自身を含む
  const SCAN_PATTERNS = [
    // ゲーム本体
    'game/**/*.{js,json,html,css}',
    
    // Project_Cognize (AI依存開発の聖域)
    'Project_Cognize/**/*.{js,json,ts}',
    '!Project_Cognize/workspace/outputs/**', // 生成物は除外
    '!Project_Cognize/database/**',          // DBは除外
    
    // DynamicErrorMonitor (動的エラー監視)
    'DynamicErrorMonitor/**/*.{js,json,ts}',
    '!DynamicErrorMonitor/node_modules/**',  // 依存関係は除外
    
    // Project_scanner (プロジェクトスキャナー)
    'Project_scanner/**/*.{js,json,ts}',
    '!Project_scanner/output/**'             // 生成物は除外
  ];
  
  const IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/.next/**',
    '**/*.log',
    '**/*.jsonl',
    '**/TEMP_ARCHIVE_*/**'
  ];

  if (FULL_SCAN) {
    log('フルスキャンモード（全自作コード対応）', 'verbose');
    return glob.sync(SCAN_PATTERNS, {
      cwd: PROJECT_ROOT,
      ignore: IGNORE_PATTERNS,
      nodir: true
    });
  }

  try {
    log('差分スキャンを試行...', 'debug');
    const diff = execSync('git diff --name-only HEAD~1', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    const changed = diff
      .split('\n')
      .filter(f => f && f.trim() !== '')
      .filter(f => 
        f.includes('game/') || 
        f.includes('Project_Cognize/') || 
        f.includes('DynamicErrorMonitor/') || 
        f.includes('Project_scanner/')
      )
      .filter(f => !IGNORE_PATTERNS.some(pattern => 
        f.includes(pattern.replace('**/', ''))));

    if (changed.length > 0) {
      log(`差分検出: ${changed.length}ファイル`, 'verbose');
      return changed;
    }
  } catch (err) {
    log(`差分取得失敗: ${err.message}`, 'debug');
  }

  log('フォールバック: 全自作コードパターンでスキャン', 'verbose');
  return glob.sync(SCAN_PATTERNS, {
    cwd: PROJECT_ROOT,
    ignore: IGNORE_PATTERNS,
    nodir: true
  });
}

// ====================
// JSON専用処理
// ====================
function analyzeJSONFile(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  const stats = fs.statSync(fullPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // JSON構造の簡易検証
  let jsonMeta = {
    type: 'json',
    file_size: stats.size,
    last_accessed: stats.atimeMs,
    last_modified: stats.mtimeMs,
    is_critical: false
  };
  
  try {
    const parsed = JSON.parse(content);
    const keys = Object.keys(parsed);
    jsonMeta = {
      ...jsonMeta,
      keys_count: keys.length,
      has_array: Array.isArray(parsed),
      sample_keys: keys.slice(0, 5),
      // クリティカルファイルの判定
      is_critical: filePath.includes('refactor_policy.json') || 
                  filePath.includes('baseline_summary.json')
    };
  } catch (e) {
    jsonMeta = {
      ...jsonMeta,
      type: 'invalid_json',
      parse_error: e.message.substring(0, 100)
    };
  }

  return {
    language: 'json',
    symbols: [],
    imports: [],
    exports: [],
    reexports: [],
    instances: [],
    loc: content.split('\n').length,
    json_meta: JSON.stringify(jsonMeta),
    is_critical: jsonMeta.is_critical
  };
}

// ====================
// SQLite初期化（拡張スキーマ）
// ====================
function initDatabase() {
  ensureDir(path.dirname(DB_PATH));
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  // 拡張スキーマ: JSONメタ情報とクリティカルフラグを追加
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_index (
      path TEXT PRIMARY KEY,
      file_hash TEXT NOT NULL,
      language TEXT NOT NULL,
      symbols_json TEXT,
      imports_json TEXT,
      exports_json TEXT,
      loc INTEGER,
      updated_at TEXT NOT NULL,
      commit_sha TEXT,
      json_meta TEXT,
      is_critical BOOLEAN DEFAULT 0,
      last_accessed REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS file_dependencies (
      source_path TEXT NOT NULL,
      target_module TEXT NOT NULL,
      import_type TEXT,
      FOREIGN KEY (source_path) REFERENCES file_index(path)
    );

    CREATE TABLE IF NOT EXISTS class_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      code_snippet TEXT NOT NULL,
      arguments_json TEXT,
      created_at TEXT NOT NULL,
      commit_sha TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_file_hash ON file_index(file_hash);
    CREATE INDEX IF NOT EXISTS idx_updated_at ON file_index(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_critical ON file_index(is_critical);
    CREATE INDEX IF NOT EXISTS idx_last_accessed ON file_index(last_accessed);
  `);

  log('SQLiteデータベース初期化完了（全自作コード対応スキーマ）', 'debug');
  return db;
}

// ====================
// AST解析
// ====================
function analyzeFile(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`ファイルが存在しません: ${filePath}`);
  }
  
  const code = fs.readFileSync(fullPath, 'utf8');
  const ext = path.extname(filePath);
  const language = ext.match(/\.tsx?$/) ? 'typescript' : 'javascript';

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy']
    });
  } catch (err) {
    throw new Error(`パース失敗: ${err.message}`);
  }

  const symbols = [];
  const imports = [];
  const exports = [];
  const reexports = [];
  const instances = [];

  const lines = code.split('\n');

  traverse(ast, {
    ImportDeclaration(p) {
      const source = p.node.source.value;
      const specifiers = p.node.specifiers.map(spec => {
        if (spec.type === 'ImportDefaultSpecifier') {
          return { type: 'default', name: spec.local.name };
        } else if (spec.type === 'ImportNamespaceSpecifier') {
          return { type: 'namespace', name: spec.local.name };
        } else {
          return {
            type: 'named',
            name: spec.local.name,
            imported: spec.imported ? spec.imported.name : spec.local.name
          };
        }
      });
      imports.push({ module: source, specifiers });
    },

    CallExpression(p) {
      if (p.node.callee.name === 'require' && p.node.arguments.length > 0 && p.node.arguments[0].type === 'StringLiteral') {
        const moduleName = p.node.arguments[0].value;
        // 既にimportで記録されている場合は追加しない（重複防止）
        if (!imports.some(imp => imp.module === moduleName)) {
            imports.push({ module: moduleName, specifiers: [{ type: 'require', name: null }] });
        }
      }
    },

    ExportAllDeclaration(p) {
      const source = p.node.source.value;
      reexports.push({
        type: 'all',
        module: source,
        exported_name: p.node.exported ? p.node.exported.name : null
      });
      imports.push({
        module: source,
        specifiers: [{ type: 'reexport-all', name: '*' }],
        is_reexport: true
      });
    },

    ExportNamedDeclaration(p) {
      if (p.node.source) {
        const source = p.node.source.value;
        const specifiers = p.node.specifiers.map(spec => ({
          type: 'reexport-named',
          exported: spec.exported.name,
          imported: spec.local.name
        }));
        reexports.push({
          type: 'named',
          module: source,
          specifiers
        });
        imports.push({
          module: source,
          specifiers,
          is_reexport: true
        });
      }
      if (p.node.declaration) {
        if (p.node.declaration.id) {
          exports.push({ name: p.node.declaration.id.name, type: 'named' });
        } else if (p.node.declaration.declarations) {
          p.node.declaration.declarations.forEach(d => {
            if (d.id && d.id.name) {
              exports.push({ name: d.id.name, type: 'named' });
            }
          });
        }
      } else if (p.node.specifiers.length > 0) {
        p.node.specifiers.forEach(spec => {
          exports.push({
            name: spec.exported.name,
            type: 'named',
            local: spec.local.name
          });
        });
      }
    },

    ExportDefaultDeclaration(p) {
      let name = 'default';
      if (p.node.declaration && p.node.declaration.id) {
        name = p.node.declaration.id.name;
      }
      exports.push({ name, type: 'default' });
    },

    FunctionDeclaration(p) {
      if (p.node.id) {
        symbols.push({
          name: p.node.id.name,
          type: 'function',
          line: p.node.loc.start.line
        });
      }
    },

    ClassDeclaration(p) {
      if (p.node.id) {
        symbols.push({
          name: p.node.id.name,
          type: 'class',
          line: p.node.loc.start.line
        });
      }
    },

    VariableDeclarator(p) {
      if (p.node.id && p.node.id.name) {
        symbols.push({
          name: p.node.id.name,
          type: 'variable',
          line: p.node.loc.start.line
        });
      }
    },

    NewExpression(p) {
      const node = p.node;
      let className = null;

      if (node.callee.type === 'Identifier') {
        className = node.callee.name;
      } else if (node.callee.type === 'MemberExpression') {
        if (node.callee.property && node.callee.property.name) {
          className = node.callee.property.name;
        }
      }

      if (!className) return;

      const args = node.arguments.map(arg => {
        if (arg.type === 'ObjectExpression') {
          return {
            type: 'object',
            properties: arg.properties.map(prop => {
              const key = prop.key ? prop.key.name : null;
              const valueType = prop.value ? prop.value.type : 'unknown';
              let value = null;
              
              if (prop.value && prop.value.type === 'Literal') {
                value = prop.value.value;
              }
              
              return { key, valueType, value };
            })
          };
        } else if (arg.type === 'Literal') {
          return { type: 'literal', value: arg.value };
        } else if (arg.type === 'Identifier') {
          return { type: 'identifier', name: arg.name };
        } else {
          return { type: arg.type };
        }
      });

      const lineIndex = node.loc.start.line - 1;
      const startLine = Math.max(0, lineIndex - 1);
      const endLine = Math.min(lines.length - 1, node.loc.end.line);
      const snippet = lines.slice(startLine, endLine).join('\n').trim();

      instances.push({
        class_name: className,
        line: node.loc.start.line,
        column: node.loc.start.column,
        snippet,
        arguments: args
      });
    }
  });

  return {
    language,
    symbols,
    imports,
    exports,
    reexports,
    instances,
    loc: code.split('\n').length
  };
}

function checkRotation() {
  if (!fs.existsSync(JSONL_PATH)) return;

  const stats = fs.statSync(JSONL_PATH);
  const sizeMB = stats.size / (1024 * 1024);

  log(`static_index.jsonl サイズ: ${sizeMB.toFixed(2)}MB`, 'verbose');

  if (sizeMB > MAX_JSONL_SIZE_MB) {
    const timestamp = new Date().toISOString().split('T').replace(/-/g, '');
    const archivePath = path.join(ARCHIVE_DIR, `static_index_${timestamp}.jsonl.gz`);

    log(`⚠ JSONLが${MAX_JSONL_SIZE_MB}MB超過 → ローテーション開始`, 'warn');

    try {
      execSync(`gzip -c "${JSONL_PATH}" > "${archivePath}"`, { cwd: PROJECT_ROOT });
      fs.writeFileSync(JSONL_PATH, '');
      log(`アーカイブ完了: ${path.basename(archivePath)}`, 'info');
    } catch (err) {
      log(`ローテーション失敗: ${err.message}`, 'error');
    }
  }
}

// ====================
// メイン処理
// ====================
function main() {
  const startTime = Date.now();

  log('=== Cognize Indexer v1.4 開始 ===');
  log(`モード: ${DRY_RUN ? 'DRY-RUN（書き込みなし）' : '本番実行'}`);
  log(`スキャン: ${FULL_SCAN ? 'フルスキャン' : '差分スキャン'}`);
  log('スキャン範囲: 全自作コード（ゲーム＋3開発補助システム）');

  // ★★★★★ 改変箇所 ★★★★★
  // --full-scanの場合、書き込み前にDBを削除してクリーンな状態にする
  if (FULL_SCAN && !DRY_RUN) {
    if (fs.existsSync(DB_PATH)) {
      try {
        fs.unlinkSync(DB_PATH);
        log('⚠ フルスキャンモードのため、既存のデータベースを削除しました。', 'warn');
      } catch (err) {
        log(`データベースの削除に失敗しました: ${err.message}`, 'error');
        // エラーが発生した場合は、続行せずに終了する
        process.exit(1);
      }
    }
  }
  // ★★★★★ 改変ここまで ★★★★★

  ensureFile(JSONL_PATH);
  checkRotation();

  const db = initDatabase();
  const files = getChangedFiles();
  const commitSha = getCurrentCommit();

  if (files.length === 0) {
    log('⚠ 解析対象ファイルなし', 'warn');
    db.close();
    return;
  }

  log(`解析対象: ${files.length}ファイル`);

  let successCount = 0;
  let errorCount = 0;

  const insertFile = db.prepare(`
    INSERT OR REPLACE INTO file_index (
      path, file_hash, language, symbols_json, imports_json, exports_json,
      loc, updated_at, commit_sha, json_meta, is_critical, last_accessed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
  `);

  const insertDep = db.prepare(`
    INSERT INTO file_dependencies (source_path, target_module, import_type)
    VALUES (?, ?, ?)
  `);

  const deleteDeps = db.prepare(`
    DELETE FROM file_dependencies WHERE source_path = ?
  `);

  const insertInstance = db.prepare(`
    INSERT INTO class_instances (
      class_name, file_path, line_number, code_snippet, 
      arguments_json, created_at, commit_sha
    ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
  `);

  const deleteInstances = db.prepare(`
    DELETE FROM class_instances WHERE file_path = ?
  `);

  for (const relPath of files) {
    try {
      const fullPath = path.join(PROJECT_ROOT, relPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`ファイルが存在しません: ${relPath}`);
      }
      
      const fileHash = getFileHash(fullPath);
      let analysis;
      
      // ファイルタイプによる処理分岐
      if (relPath.endsWith('.json')) {
        analysis = analyzeJSONFile(relPath);
      } else if (relPath.endsWith('.js') || relPath.endsWith('.ts')) {
        analysis = analyzeFile(relPath);
      } else {
        // その他のファイルはメタ情報のみ
        const stats = fs.statSync(fullPath);
        analysis = {
          language: path.extname(relPath).replace('.', '') || 'unknown',
          symbols: [],
          imports: [],
          exports: [],
          reexports: [],
          instances: [],
          loc: 0,
          json_meta: JSON.stringify({
            file_size: stats.size,
            last_accessed: stats.atimeMs,
            last_modified: stats.mtimeMs
          }),
          is_critical: false
        };
      }

      // アクセス日時の取得
      const stats = fs.statSync(fullPath);
      const lastAccessed = stats.atimeMs;

      const record = {
        record_id: crypto.randomUUID(),
        schema_version: '1.4',
        provider: {
          name: 'cognize-indexer',
          version: '1.4',
          mode: DRY_RUN ? 'dry-run' : 'production'
        },
        commit: commitSha,
        generated_at: new Date().toISOString(),
        type: 'file_info',
        payload: {
          path: relPath,
          file_hash: fileHash,
          language: analysis.language,
          symbols: analysis.symbols,
          imports: analysis.imports,
          exports: analysis.exports,
          reexports: analysis.reexports,
          instances: analysis.instances || [],
          stats: {
            loc: analysis.loc,
            symbol_count: analysis.symbols.length,
            import_count: analysis.imports.length,
            export_count: analysis.exports.length,
            reexport_count: analysis.reexports.length,
            instance_count: (analysis.instances || []).length,
            last_accessed: lastAccessed
          },
          json_meta: analysis.json_meta,
          is_critical: analysis.is_critical
        }
      };

      if (!DRY_RUN) {
        fs.appendFileSync(JSONL_PATH, JSON.stringify(record) + '\n', 'utf8');

        insertFile.run(
          relPath,
          fileHash,
          analysis.language,
          JSON.stringify(analysis.symbols),
          JSON.stringify(analysis.imports),
          JSON.stringify(analysis.exports),
          analysis.loc,
          commitSha,
          analysis.json_meta || null,
          analysis.is_critical ? 1 : 0,
          lastAccessed
        );

        deleteDeps.run(relPath);
        for (const imp of analysis.imports || []) {
          const importType = imp.is_reexport ? 'reexport' : 'import';
          insertDep.run(relPath, imp.module, importType);
        }

        if (analysis.instances) {
          deleteInstances.run(relPath);
          for (const inst of analysis.instances) {
            insertInstance.run(
              inst.class_name,
              relPath,
              inst.line,
              inst.snippet,
              JSON.stringify(inst.arguments),
              commitSha
            );
          }
        }
      }

      successCount++;
      const typeLog = relPath.endsWith('.json') ? 'JSON' : 'JS/TS';
      const instCount = analysis.instances ? analysis.instances.length : 0;
      const instLog = instCount > 0 ? `, ${instCount}インスタンス` : '';
      log(`処理完了: ${relPath} (${typeLog}${instLog})`, 'verbose');

    } catch (err) {
      errorCount++;
      log(`処理失敗: ${relPath} - ${err.message}`, 'error');
    }
  }

  if (!DRY_RUN) {
    db.exec('PRAGMA wal_checkpoint;');
    db.exec('ANALYZE;');
  }
  db.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  log('=== 処理完了 ===');
  log(`成功: ${successCount}ファイル`);
  log(`失敗: ${errorCount}ファイル`);
  log(`実行時間: ${elapsed}秒`);
  log(`対象範囲: ゲーム本体＋3開発補助システム`);
}

try {
  main();
} catch (err) {
  log(`致命的エラー: ${err.message}`, 'error');
  console.error(err.stack);
  process.exit(1);
}
