#!/usr/bin/env node
/**
 * Cognize Indexer v2.0 - GLIA準備版 (patched: micromatch)
 * 
 * @version 2.0
 * @description Project_Cognizeの中核となる静的解析・インデックス作成ツール
 * 
 * 新機能（Phase 0 + Phase 1）:
 * - ノイズ除去: JavaScriptビルトインクラスのインスタンス化を無視
 * - 自作コード判定: SOURCE_CODE_RULESに基づく初歩的な判定 (micromatch使用)
 * - クリティカルファイル検出: CRITICAL_FILESとの照合
 * 
 * @important
 * このファイルは、`/Project_Cognize/config/shared_patterns.js` の設定に完全に従属します。
 * スキャン範囲の変更は、必ず `shared_patterns.js` を編集してください。
 * 
 * 実行:
 *   node Project_Cognize/scripts/indexer.js [--dry-run] [--full-scan] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const glob = require('glob');
const Database = require('better-sqlite3');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const micromatch = require('micromatch'); // <- added per patch

// ====================
// 設定読み込み（憲法への服従）
// ====================
const {
  IGNORE_PATTERNS,
  SOURCE_CODE_RULES,
  BUILTIN_CLASSES,
  CRITICAL_FILES
} = require('../config/shared_patterns.js');

// ====================
// プロジェクト構成
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

// ====================
// 自作コード判定エンジン（Phase 1） - micromatch版
// ====================
function classifyFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');

  // クリティカルファイルチェック (simple includes is reliable)
  const isCritical = CRITICAL_FILES.some(critPath => 
    normalizedPath.includes(critPath.replace(/\\/g, '/'))
  );

  // include_paths / exclude_paths に対して micromatch で判定
  // guard: if arrays are absent, treat as empty arrays
  const includePatterns = Array.isArray(SOURCE_CODE_RULES.include_paths) ? SOURCE_CODE_RULES.include_paths : [];
  const excludePatterns = Array.isArray(SOURCE_CODE_RULES.exclude_paths) ? SOURCE_CODE_RULES.exclude_paths : [];

  // micromatch.isMatch handles glob patterns robustly
  let isIncluded = false;
  let isExcluded = false;

  try {
    if (includePatterns.length > 0) {
      // micromatch expects paths like 'game/components/Bullet.ts'
      isIncluded = micromatch.isMatch(normalizedPath, includePatterns, { dot: true });
    }
    if (excludePatterns.length > 0) {
      isExcluded = micromatch.isMatch(normalizedPath, excludePatterns, { dot: true });
    }
  } catch (e) {
    // Fallback silently but log for debugging
    log(`micromatch error for path=${normalizedPath} : ${e.message}`, 'warn');
    isIncluded = false;
    isExcluded = false;
  }

  // config_files にマッチするか（exact-ish check: endsWith）
  const isConfig = Array.isArray(SOURCE_CODE_RULES.config_files) && SOURCE_CODE_RULES.config_files.some(configFile =>
    normalizedPath.endsWith(configFile)
  );

  // 判定ロジック
  let isSelfMade = false;
  let confidence = 0.0;
  let reason = '';
  let category = 'unknown';

  if (isExcluded) {
    isSelfMade = false;
    confidence = 1.0;
    reason = 'matches exclude_paths rule';
    category = 'external';
  } else if (isCritical) {
    isSelfMade = true;
    confidence = 1.0;
    reason = 'marked as critical file';
    category = 'critical';
  } else if (isConfig) {
    isSelfMade = true;
    confidence = 0.9;
    reason = 'config file (self-made but rarely modified)';
    category = 'config';
  } else if (isIncluded) {
    isSelfMade = true;
    confidence = 0.95;
    reason = 'matches include_paths rule';

    // カテゴリ詳細判定 (normalizedPath is without leading ./)
    if (normalizedPath.startsWith('components/')) {
      category = 'component';
    } else if (normalizedPath.startsWith('app/')) {
      category = 'app';
    } else if (normalizedPath.startsWith('game/core/')) {
      category = 'game-core';
    } else if (normalizedPath.startsWith('game/components/')) {
      category = 'game-component';
    } else if (normalizedPath.startsWith('game/systems/')) {
      category = 'game-system';
    } else if (normalizedPath.startsWith('game/debug/')) {
      category = 'debug';
    } else {
      category = 'self-made';
    }
  } else {
    // どちらにもマッチしない → 低確信度で自作と仮定
    isSelfMade = true;
    confidence = 0.5;
    reason = 'not in exclude list, assumed self-made';
    category = 'uncertain';
  }

  return {
    is_self_made: isSelfMade,
    confidence,
    reason,
    category,
    is_critical: isCritical
  };
}

// ====================
// ファイル収集
// ====================
function getChangedFiles() {
  log('スキャン開始: config/shared_patterns.js の定義を使用', 'info');

  const files = glob.sync('**/*', {
    cwd: PROJECT_ROOT,
    ignore: IGNORE_PATTERNS,
    nodir: true,
    absolute: false
  });

  log(`スキャン対象として ${files.length} ファイルを検出`, 'verbose');
  return files;
}

// ====================
// JSON専用処理
// ====================
function analyzeJSONFile(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  const stats = fs.statSync(fullPath);
  const content = fs.readFileSync(fullPath, 'utf8');

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
// SQLite初期化
// ====================
function initDatabase() {
  ensureDir(path.dirname(DB_PATH));
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

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
      last_accessed REAL DEFAULT 0,
      is_self_made BOOLEAN DEFAULT 0,
      confidence REAL DEFAULT 0.0,
      classification_reason TEXT,
      category TEXT
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
    CREATE INDEX IF NOT EXISTS idx_self_made ON file_index(is_self_made);
    CREATE INDEX IF NOT EXISTS idx_category ON file_index(category);
  `);

  log('SQLiteデータベース初期化完了', 'debug');
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

  // ★ Phase 1: ビルトインクラスのSetを事前作成（高速化）
  const builtinSet = new Set(BUILTIN_CLASSES);

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

      // ★ Phase 1: ノイズ除去 - ビルトインクラスをスキップ
      if (builtinSet.has(className)) {
        return;
      }

      // ★ さらに高度な判定: 大文字始まりでないクラス名は疑わしい
      if (!className.match(/^[A-Z]/)) {
        log(`疑わしいクラス名をスキップ: ${className} in ${filePath}`, 'debug');
        return;
      }

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

// ====================
// JSONLローテーション
// ====================
function checkRotation() {
  if (!fs.existsSync(JSONL_PATH)) return;

  const stats = fs.statSync(JSONL_PATH);
  const sizeMB = stats.size / (1024 * 1024);

  log(`static_index.jsonl サイズ: ${sizeMB.toFixed(2)}MB`, 'verbose');

  if (sizeMB > MAX_JSONL_SIZE_MB) {
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
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

  log('=== Cognize Indexer v2.0 (GLIA準備版) 開始 ===');
  log(`モード: ${DRY_RUN ? 'DRY-RUN（書き込みなし）' : '本番実行'}`);
  log(`スキャン: config/shared_patterns.js に基づく一貫したフルスキャン`);

  if (FULL_SCAN && !DRY_RUN) {
    if (fs.existsSync(DB_PATH)) {
      try {
        fs.unlinkSync(DB_PATH);
        log('⚠ フルスキャンモードのため既存DBを削除', 'warn');
      } catch (err) {
        log(`DB削除失敗: ${err.message}`, 'error');
        process.exit(1);
      }
    }
  }

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
      loc, updated_at, commit_sha, json_meta, is_critical, last_accessed,
      is_self_made, confidence, classification_reason, category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)
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

      if (relPath.endsWith('.json')) {
        analysis = analyzeJSONFile(relPath);
      } else if (relPath.endsWith('.js') || relPath.endsWith('.ts') || relPath.endsWith('.tsx')) {
        analysis = analyzeFile(relPath);
      } else {
        const stats = fs.statSync(fullPath);
        analysis = {
          language: path.extname(relPath).replace('.', '') || 'unknown',
          symbols: [], imports: [], exports: [], reexports: [], instances: [], loc: 0,
          json_meta: JSON.stringify({
            file_size: stats.size,
            last_accessed: stats.atimeMs,
            last_modified: stats.mtimeMs
          }),
          is_critical: false
        };
      }

      // ★ Phase 1: 自作コード判定
      const classification = classifyFile(relPath);

      const stats = fs.statSync(fullPath);
      const lastAccessed = stats.atimeMs;

      const record = {
        record_id: crypto.randomUUID(),
        schema_version: '2.0',
        provider: {
          name: 'cognize-indexer',
          version: '2.0',
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
          is_critical: analysis.is_critical || classification.is_critical,
          // ★ Phase 1: 新しい判定結果
          classification: {
            is_self_made: classification.is_self_made,
            confidence: classification.confidence,
            reason: classification.reason,
            category: classification.category
          }
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
          analysis.is_critical || classification.is_critical ? 1 : 0,
          lastAccessed,
          classification.is_self_made ? 1 : 0,
          classification.confidence,
          classification.reason,
          classification.category
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
      const typeLog = relPath.endsWith('.json') ? 'JSON' : 'JS/TS/TSX';
      const instCount = analysis.instances ? analysis.instances.length : 0;
      const instLog = instCount > 0 ? `, ${instCount}インスタンス` : '';
      const classLog = classification.is_self_made ? ` [自作: ${classification.category}]` : '';
      log(`処理完了: ${relPath} (${typeLog}${instLog}${classLog})`, 'verbose');

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
}

try {
  main();
} catch (err) {
  log(`致命的エラー: ${err.message}`, 'error');
  console.error(err.stack);
  process.exit(1);
}