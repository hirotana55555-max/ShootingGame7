#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import crypto from 'crypto';
import fg from 'fast-glob';
import Database from 'better-sqlite3';
import { parse } from '@babel/parser';
import micromatch from 'micromatch';

/**
 * Cognize Indexer v2.1 - GLIA preparation (fast-glob + micromatch)
 *
 * @version 2.1
 * @description Project_Cognize static analysis and indexer (ESM完全準拠版)
 *
 * Notes:
 * - Uses fast-glob to apply ignore patterns at collection time
 * - Uses micromatch for robust include/exclude matching
 * - Full ESM compatibility with __dirname replacement
 * - Enhanced error handling for parse failures
 *
 * Usage:
 *   node Project_Cognize/scripts/indexer.js [--dry-run] [--full-scan] [--verbose]
 */

// ESM環境で__dirnameを再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @babel/traverse のインポート（複数のフォールバック）
const babelTraverseModule = await import('@babel/traverse');
let traverse = babelTraverseModule.default;

// フォールバック1: .default.default (二重ラップされている場合)
if (typeof traverse !== 'function' && traverse && typeof traverse.default === 'function') {
  traverse = traverse.default;
}

// フォールバック2: モジュール自体が関数の場合
if (typeof traverse !== 'function' && typeof babelTraverseModule === 'function') {
  traverse = babelTraverseModule;
}

// 最終チェック
if (typeof traverse !== 'function') {
  console.error('Error: @babel/traverse could not be loaded as a function');
  console.error('Module structure:', Object.keys(babelTraverseModule));
  console.error('Default export type:', typeof babelTraverseModule.default);
  
  // デバッグ用に詳細を表示
  if (babelTraverseModule.default && typeof babelTraverseModule.default === 'object') {
    console.error('Default export keys:', Object.keys(babelTraverseModule.default));
  }
  
  process.exit(1);
}

import {
  IGNORE_PATTERNS,
  SOURCE_CODE_RULES,
  BUILTIN_CLASSES,
  CRITICAL_FILES
} from "../config/shared_patterns.js";

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const COGNIZE_ROOT = path.join(PROJECT_ROOT, 'Project_Cognize');
const JSONL_PATH = path.join(COGNIZE_ROOT, 'workspace/outputs/static_index.jsonl');
const DB_PATH = path.join(COGNIZE_ROOT, 'database/static_index.db');
const ARCHIVE_DIR = path.join(COGNIZE_ROOT, 'workspace/outputs');
const MAX_JSONL_SIZE_MB = 50;

const DRY_RUN = process.argv.includes('--dry-run');
const FULL_SCAN = process.argv.includes('--full-scan');
const VERBOSE = process.argv.includes('--verbose');

function log(msg, level = 'info') {
  const icons = { info: '✓', warn: '⚠', error: '✗', verbose: '→', debug: '•' };
  if (level === 'verbose' && !VERBOSE) return;
  if (level === 'debug' && !VERBOSE) return;
  console.log(`${icons[level] || '•'} [${new Date().toISOString()}] ${msg}`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Directory created: ${path.relative(PROJECT_ROOT, dirPath)}`, 'verbose');
  }
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, '');
    log(`File created: ${path.relative(PROJECT_ROOT, filePath)}`, 'verbose');
  }
}

function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
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

function classifyFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');

  // node_modules を最優先で除外
  if (normalizedPath.startsWith('node_modules/') || normalizedPath.startsWith('DynamicErrorMonitor/node_modules/')) {
    return { is_self_made: false, confidence: 1.0, reason: 'explicitly excluded node_modules', category: 'external' };
  }

  const isCritical = Array.isArray(CRITICAL_FILES) && CRITICAL_FILES.some(critPath =>
    normalizedPath.includes(critPath.replace(/\\/g, '/'))
  );

  const includePatterns = Array.isArray(SOURCE_CODE_RULES.include_paths) ? SOURCE_CODE_RULES.include_paths : [];
  const excludePatterns = Array.isArray(SOURCE_CODE_RULES.exclude_paths) ? SOURCE_CODE_RULES.exclude_paths : [];

  let isIncluded = false;
  let isExcluded = false;

  try {
    if (includePatterns.length > 0) {
      isIncluded = micromatch.isMatch(normalizedPath, includePatterns, { dot: true });
    }
    if (excludePatterns.length > 0) {
      isExcluded = micromatch.isMatch(normalizedPath, excludePatterns, { dot: true });
    }
  } catch (e) {
    log(`micromatch error for path=${normalizedPath} : ${e.message}`, 'warn');
    isIncluded = false;
    isExcluded = false;
  }

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
  } else if (isIncluded) {
    isSelfMade = true;
    confidence = 0.95;
    reason = 'matches include_paths rule';

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
    isSelfMade = true;
    confidence = 0.5;
    reason = 'not in include or exclude, assumed self-made';
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

function getChangedFiles() {
  log('Starting scan: using config/shared_patterns.js', 'info');

  const includePatterns = Array.isArray(SOURCE_CODE_RULES.include_paths) && SOURCE_CODE_RULES.include_paths.length > 0
    ? SOURCE_CODE_RULES.include_paths.slice()
    : ['**/*'];

  const excludePatterns = Array.isArray(SOURCE_CODE_RULES.exclude_paths) ? SOURCE_CODE_RULES.exclude_paths.slice() : [];
  const ignorePatterns = Array.isArray(IGNORE_PATTERNS) ? IGNORE_PATTERNS.slice() : [];

  if (!ignorePatterns.includes('**/node_modules/**')) {
    ignorePatterns.push('**/node_modules/**');
  }

  excludePatterns.forEach(p => { if (!ignorePatterns.includes(p)) ignorePatterns.push(p); });

  let files = [];
  try {
    files = fg.sync(includePatterns, {
      cwd: PROJECT_ROOT,
      dot: true,
      onlyFiles: true,
      ignore: ignorePatterns,
      unique: true,
      followSymbolicLinks: true,
      ignoreBasename: ignorePatterns.map(p => path.basename(p))
    });
  } catch (e) {
    log(`fast-glob error: ${e.message}`, 'error');
    return [];
  }

  const normalized = files.map(f => f.replace(/\\/g, '/'));
  log(`Found ${normalized.length} files to analyze`, 'verbose');
  return normalized;
}

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
    jsonMeta = Object.assign(jsonMeta, {
      keys_count: keys.length,
      has_array: Array.isArray(parsed),
      sample_keys: keys.slice(0, 5),
      is_critical: filePath.includes('refactor_policy.json') || filePath.includes('baseline_summary.json')
    });
  } catch (e) {
    jsonMeta.type = 'invalid_json';
    jsonMeta.parse_error = e.message.substring(0, 100);
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

function initDatabase() {
  ensureDir(path.dirname(DB_PATH));
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  
  log('SQLite DB opened (Direct access for write operations)', 'debug');
  return db;
}

function analyzeFile(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const code = fs.readFileSync(fullPath, 'utf8');
  const ext = path.extname(filePath);
  const language = ext.match(/\.tsx?$/) ? 'typescript' : 'javascript';

  let ast;
  try {
    // 拡張プラグインセットでパース試行
    const plugins = ['jsx', 'typescript', 'classProperties', 'decorators-legacy'];
    
    // TypeScriptファイルの場合は追加プラグイン
    if (ext.match(/\.tsx?$/)) {
      plugins.push('optionalChaining', 'nullishCoalescingOperator');
    }

    ast = parse(code, {
      sourceType: 'unambiguous', // 'module'から'unambiguous'に変更
      plugins,
      errorRecovery: true, // エラーリカバリーを有効化
      allowImportExportEverywhere: true,
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      allowUndeclaredExports: true
    });
  } catch (err) {
    // パースエラー時は構文エラー情報のみを記録
    log(`Parse failed for ${filePath}: ${err.message}`, 'warn');
    throw new Error(`Parse failed: ${err.message.substring(0, 200)}`);
  }

  const symbols = [];
  const imports = [];
  const exports = [];
  const reexports = [];
  const instances = [];
  const lines = code.split('\n');

  const builtinSet = new Set(BUILTIN_CLASSES || []);

  try {
    traverse(ast, {
      ImportDeclaration(p) {
        try {
          const source = p.node.source && p.node.source.value;
          if (!source) return;
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
        } catch (e) {
          log(`ImportDeclaration error in ${filePath}: ${e.message}`, 'debug');
        }
      },

      CallExpression(p) {
        try {
          if (p.node.callee && p.node.callee.name === 'require' && 
              p.node.arguments.length > 0 && 
              p.node.arguments[0].type === 'StringLiteral') {
            const moduleName = p.node.arguments[0].value;
            if (!imports.some(imp => imp.module === moduleName)) {
              imports.push({ module: moduleName, specifiers: [{ type: 'require', name: null }] });
            }
          }
        } catch (e) {
          log(`CallExpression error in ${filePath}: ${e.message}`, 'debug');
        }
      },

      ExportAllDeclaration(p) {
        try {
          const source = p.node.source && p.node.source.value;
          if (source) {
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
          }
        } catch (e) {
          log(`ExportAllDeclaration error in ${filePath}: ${e.message}`, 'debug');
        }
      },

      ExportNamedDeclaration(p) {
        try {
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
          } else if (p.node.specifiers && p.node.specifiers.length > 0) {
            p.node.specifiers.forEach(spec => {
              exports.push({
                name: spec.exported.name,
                type: 'named',
                local: spec.local.name
              });
            });
          }
        } catch (e) {
          log(`ExportNamedDeclaration error in ${filePath}: ${e.message}`, 'debug');
        }
      },

      ExportDefaultDeclaration(p) {
        try {
          let name = 'default';
          if (p.node.declaration && p.node.declaration.id) {
            name = p.node.declaration.id.name;
          }
          exports.push({ name, type: 'default' });
        } catch (e) {
          log(`ExportDefaultDeclaration error in ${filePath}: ${e.message}`, 'debug');
        }
      },

      FunctionDeclaration(p) {
        try {
          if (p.node.id) {
            symbols.push({
              name: p.node.id.name,
              type: 'function',
              line: p.node.loc ? p.node.loc.start.line : 0
            });
          }
        } catch (e) {
          log(`FunctionDeclaration error in ${filePath}: ${e.message}`, 'debug');
        }
      },

      ClassDeclaration(p) {
        try {
          if (p.node.id) {
            symbols.push({
              name: p.node.id.name,
              type: 'class',
              line: p.node.loc ? p.node.loc.start.line : 0
            });
          }
        } catch (e) {
          log(`ClassDeclaration error in ${filePath}: ${e.message}`, 'debug');
        }
      },

      VariableDeclarator(p) {
        try {
          if (p.node.id && p.node.id.name) {
            symbols.push({
              name: p.node.id.name,
              type: 'variable',
              line: p.node.loc ? p.node.loc.start.line : 0
            });
          }
        } catch (e) {
          log(`VariableDeclarator error in ${filePath}: ${e.message}`, 'debug');
        }
      },

      NewExpression(p) {
        try {
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
          if (builtinSet.has(className)) return;
          if (!className.match(/^[A-Z]/)) {
            log(`Skipping suspicious class name: ${className} in ${filePath}`, 'debug');
            return;
          }

          const args = node.arguments.map(arg => {
            if (arg.type === 'ObjectExpression') {
              return {
                type: 'object',
                properties: arg.properties.map(prop => {
                  const key = prop.key ? (prop.key.name || (prop.key.value ? prop.key.value : null)) : null;
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

          if (node.loc) {
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
        } catch (e) {
          log(`NewExpression error in ${filePath}: ${e.message}`, 'debug');
        }
      }
    });
  } catch (traverseErr) {
    log(`Traverse error for ${filePath}: ${traverseErr.message}`, 'warn');
  }

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
  log(`static_index.jsonl size: ${sizeMB.toFixed(2)}MB`, 'verbose');
  if (sizeMB > MAX_JSONL_SIZE_MB) {
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const archivePath = path.join(ARCHIVE_DIR, `static_index_${timestamp}.jsonl.gz`);
    try {
      execSync(`gzip -c "${JSONL_PATH}" > "${archivePath}"`, { cwd: PROJECT_ROOT });
      fs.writeFileSync(JSONL_PATH, '');
      log(`Archived: ${path.basename(archivePath)}`, 'info');
    } catch (err) {
      log(`Rotation failed: ${err.message}`, 'error');
    }
  }
}

async function main() {
  const startTime = Date.now();
  log('=== Cognize Indexer v2.1 (ESM) ===');
  log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'production'}`);
  
  if (FULL_SCAN && !DRY_RUN) {
    if (fs.existsSync(DB_PATH)) {
      try {
        fs.unlinkSync(DB_PATH);
        log('Removed existing DB for full-scan', 'warn');
      } catch (err) {
        log(`Failed to remove DB: ${err.message}`, 'error');
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
    log('No files to analyze', 'warn');
    db.close();
    return;
  }

  log(`Analyzing ${files.length} files`);

  let successCount = 0;
  let errorCount = 0;
  let parseErrorCount = 0;

  const insertFile = db.prepare(`
    INSERT OR REPLACE INTO file_index (
      path, file_hash, language, symbols_json, imports_json, exports_json,
      loc, updated_at, commit_sha, json_meta, is_critical, last_accessed,
      is_self_made, confidence, classification_reason, category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDep = db.prepare(`INSERT INTO file_dependencies (source_path, target_module, import_type) VALUES (?, ?, ?)`);
  const deleteDeps = db.prepare(`DELETE FROM file_dependencies WHERE source_path = ?`);
  const insertInstance = db.prepare(`
    INSERT INTO class_instances (
      class_name, file_path, line_number, code_snippet,
      arguments_json, created_at, commit_sha
    ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
  `);
  const deleteInstances = db.prepare(`DELETE FROM class_instances WHERE file_path = ?`);

  // Symbol table statements (with existence check)
  let insertSymbol = null;
  let deleteSymbols = null;
  let symbolsTableExists = false;

  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='symbols'").get();
    if (tableCheck) {
      insertSymbol = db.prepare(`
        INSERT OR IGNORE INTO symbols (file_path, symbol_name, symbol_type, line_number, is_exported)
        VALUES (?, ?, ?, ?, ?)
      `);
      deleteSymbols = db.prepare(`DELETE FROM symbols WHERE file_path = ?`);
      symbolsTableExists = true;
      log('Symbols table found - will populate normalized symbol data', 'debug');
    } else {
      log('Symbols table not found - run migrate.js to enable symbol tracking', 'warn');
    }
  } catch (err) {
    log(`Could not check for symbols table: ${err.message}`, 'warn');
  }

  for (const relPath of files) {
    try {
      const fullPath = path.join(PROJECT_ROOT, relPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${relPath}`);
      }

      const fileHash = getFileHash(fullPath);
      let analysis;

      if (relPath.endsWith('.json')) {
        analysis = analyzeJSONFile(relPath);
      } else if (relPath.endsWith('.js') || relPath.endsWith('.ts') || relPath.endsWith('.tsx')) {
        try {
          analysis = analyzeFile(relPath);
        } catch (parseErr) {
          parseErrorCount++;
          // パースエラーでも基本情報は記録
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
              last_modified: stats.mtimeMs,
              parse_error: parseErr.message.substring(0, 200)
            }),
            is_critical: false,
            parse_failed: true
          };
          log(`Parse error (continuing): ${relPath}`, 'warn');
        }
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

      const classification = classifyFile(relPath);
      const stats = fs.statSync(fullPath);
      const lastAccessed = stats.atimeMs;

      const record = {
        record_id: crypto.randomUUID(),
        schema_version: '2.1',
        provider: { name: 'cognize-indexer', version: '2.1', mode: DRY_RUN ? 'dry-run' : 'production' },
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
          parse_failed: analysis.parse_failed || false,
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

        // Populate normalized symbols table (if available)
        if (symbolsTableExists && insertSymbol && deleteSymbols && analysis.symbols) {
          deleteSymbols.run(relPath);
          for (const sym of analysis.symbols) {
            if (sym.name && sym.type) {
              const isExported = (analysis.exports || []).some(exp => exp.name === sym.name);
              insertSymbol.run(relPath, sym.name, sym.type, sym.line || null, isExported ? 1 : 0);
            }
          }
        }

        if (analysis.instances && !analysis.parse_failed) {
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
      const instLog = instCount > 0 ? `, ${instCount} instances` : '';
      const classLog = classification.is_self_made ? ` [self-made: ${classification.category}]` : '';
      const parseLog = analysis.parse_failed ? ' [parse-error]' : '';
      log(`Processed: ${relPath} (${typeLog}${instLog}${classLog}${parseLog})`, 'verbose');

    } catch (err) {
      errorCount++;
      log(`Processing failed: ${relPath} - ${err.message}`, 'error');
    }
  }

  if (!DRY_RUN) {
    db.exec('PRAGMA wal_checkpoint;');
    db.exec('ANALYZE;');
  }
  db.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  log('=== Done ===');
  log(`Success: ${successCount} files`);
  log(`Parse errors: ${parseErrorCount} files (continued processing)`);
  log(`Failed: ${errorCount} files`);
  log(`Elapsed: ${elapsed} sec`);
}

try {
  await main();
} catch (err) {
  log(`Fatal error: ${err.message}`, 'error');
  console.error(err.stack);
  process.exit(1);
}