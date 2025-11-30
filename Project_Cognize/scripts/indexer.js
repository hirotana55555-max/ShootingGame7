#!/usr/bin/env node
/**
 * Cognize Indexer v2.1 - GLIA preparation (fast-glob + micromatch)
 *
 * @version 2.1
 * @description Project_Cognize static analysis and indexer
 *
 * Notes:
 * - Uses fast-glob to apply ignore patterns at collection time
 * - Uses micromatch for robust include/exclude matching
 *
 * Usage:
 *   node Project_Cognize/scripts/indexer.js [--dry-run] [--full-scan] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fg = require('fast-glob');
const Database = require('better-sqlite3');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const micromatch = require('micromatch');

const {
  IGNORE_PATTERNS,
  SOURCE_CODE_RULES,
  BUILTIN_CLASSES,
  CRITICAL_FILES
} = require('../config/shared_patterns.js');

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

// indexer.js の classifyFile 関数内を以下の内容に置き換えるイメージです
function classifyFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');

  // ★★★ 以下のチェックを最優先に追加（これが解決の鍵です） ★★★
  if (normalizedPath.startsWith('node_modules/') || normalizedPath.startsWith('DynamicErrorMonitor/node_modules/')) {
    return { is_self_made: false, confidence: 1.0, reason: 'explicitly excluded node_modules', category: 'external' };
  }
  // ★★★ ここまで ★★★

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

  const isConfig = Array.isArray(SOURCE_CODE_RULES.config_files) && SOURCE_CODE_RULES.config_files.some(configFile =>
    normalizedPath.endsWith(configFile)
  );

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
  
  log('SQLite DB opened (Schema management delegated to migrate.js)', 'debug');
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
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy']
    });
  } catch (err) {
    throw new Error(`Parse failed: ${err.message}`);
  }

  const symbols = [];
  const imports = [];
  const exports = [];
  const reexports = [];
  const instances = [];
  const lines = code.split('\n');

  const builtinSet = new Set(BUILTIN_CLASSES || []);

  traverse(ast, {
    ImportDeclaration(p) {
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
    },

    CallExpression(p) {
      if (p.node.callee && p.node.callee.name === 'require' && p.node.arguments.length > 0 && p.node.arguments[0].type === 'StringLiteral') {
        const moduleName = p.node.arguments[0].value;
        if (!imports.some(imp => imp.module === moduleName)) {
          imports.push({ module: moduleName, specifiers: [{ type: 'require', name: null }] });
        }
      }
    },

    ExportAllDeclaration(p) {
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
      } else if (p.node.specifiers && p.node.specifiers.length > 0) {
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

      if (builtinSet.has(className)) {
        return;
      }

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

function main() {
  const startTime = Date.now();
  log('=== Cognize Indexer v2.1 ===');
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
      const instLog = instCount > 0 ? `, ${instCount} instances` : '';
      const classLog = classification.is_self_made ? ` [self-made: ${classification.category}]` : '';
      log(`Processed: ${relPath} (${typeLog}${instLog}${classLog})`, 'verbose');

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
  log(`Failed: ${errorCount} files`);
  log(`Elapsed: ${elapsed} sec`);
}

try {
  main();
} catch (err) {
  log(`Fatal error: ${err.message}`, 'error');
  console.error(err.stack);
  process.exit(1);
}