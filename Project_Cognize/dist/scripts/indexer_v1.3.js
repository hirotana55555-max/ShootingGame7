#!/usr/bin/env node
"use strict";
/**
 * Cognize Indexer v1.3 - ShootingGame7専用
 *
 * 新機能:
 * - クラスインスタンス化の追跡（new Expression）
 * - 引数情報の記録
 *
 * 実行:
 *   node Project_Cognize/scripts/indexer_v1.3.js [--dry-run] [--full-scan]
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
    if (level === 'verbose' && !VERBOSE)
        return;
    if (level === 'debug' && !VERBOSE)
        return;
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
    const data = fs.readFileSync(filePath);
    return 'sha256:' + crypto.createHash('sha256').update(data).digest('hex');
}
function getCurrentCommit() {
    try {
        return execSync('git rev-parse --short HEAD', {
            cwd: PROJECT_ROOT,
            encoding: 'utf8'
        }).trim();
    }
    catch {
        return 'unknown';
    }
}
function getChangedFiles() {
    if (FULL_SCAN) {
        log('フルスキャンモード', 'verbose');
        return glob.sync('**/*.{js,jsx,ts,tsx}', {
            cwd: PROJECT_ROOT,
            ignore: [
                'node_modules/**',
                '.git/**',
                '.next/**',
                'Project_Cognize/**',
                'scripts/**'
            ]
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
            .filter(f => f && f.match(/\.(js|jsx|ts|tsx)$/))
            .filter(f => !f.includes('node_modules') && !f.includes('Project_Cognize'));
        if (changed.length > 0) {
            log(`差分検出: ${changed.length}ファイル`, 'verbose');
            return changed;
        }
    }
    catch (err) {
        log(`差分取得失敗: ${err.message}`, 'debug');
    }
    log('フォールバック: 主要ディレクトリをスキャン', 'verbose');
    return glob.sync('{app,components,game}/**/*.{js,jsx,ts,tsx}', {
        cwd: PROJECT_ROOT
    });
}
// ====================
// SQLite初期化（v1.3スキーマ）
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
      commit_sha TEXT
    );

    CREATE TABLE IF NOT EXISTS file_dependencies (
      source_path TEXT NOT NULL,
      target_module TEXT NOT NULL,
      import_type TEXT,
      FOREIGN KEY (source_path) REFERENCES file_index(path)
    );

    -- ★ 新規テーブル: クラスインスタンス追跡
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
    CREATE INDEX IF NOT EXISTS idx_deps_source ON file_dependencies(source_path);
    CREATE INDEX IF NOT EXISTS idx_deps_target ON file_dependencies(target_module);
    
    -- ★ 新規インデックス
    CREATE INDEX IF NOT EXISTS idx_class_name ON class_instances(class_name);
    CREATE INDEX IF NOT EXISTS idx_instance_file ON class_instances(file_path);
  `);
    log('SQLiteデータベース初期化完了（v1.3スキーマ）', 'debug');
    return db;
}
// ====================
// AST解析（v1.3: NewExpression追加）
// ====================
function analyzeFile(filePath) {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    const code = fs.readFileSync(fullPath, 'utf8');
    const ext = path.extname(filePath);
    const language = ext.match(/\.tsx?$/) ? 'typescript' : 'javascript';
    let ast;
    try {
        ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy']
        });
    }
    catch (err) {
        throw new Error(`パース失敗: ${err.message}`);
    }
    const symbols = [];
    const imports = [];
    const exports = [];
    const reexports = [];
    const instances = []; // ★ 新規: インスタンス情報
    const lines = code.split('\n');
    traverse(ast, {
        ImportDeclaration(p) {
            const source = p.node.source.value;
            const specifiers = p.node.specifiers.map(spec => {
                if (spec.type === 'ImportDefaultSpecifier') {
                    return { type: 'default', name: spec.local.name };
                }
                else if (spec.type === 'ImportNamespaceSpecifier') {
                    return { type: 'namespace', name: spec.local.name };
                }
                else {
                    return {
                        type: 'named',
                        name: spec.local.name,
                        imported: spec.imported ? spec.imported.name : spec.local.name
                    };
                }
            });
            imports.push({ module: source, specifiers });
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
                }
                else if (p.node.declaration.declarations) {
                    p.node.declaration.declarations.forEach(d => {
                        if (d.id && d.id.name) {
                            exports.push({ name: d.id.name, type: 'named' });
                        }
                    });
                }
            }
            else if (p.node.specifiers.length > 0) {
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
        // ===== ★ 新規: NewExpression（クラスインスタンス化）の検出 =====
        NewExpression(p) {
            const node = p.node;
            let className = null;
            // クラス名の抽出
            if (node.callee.type === 'Identifier') {
                className = node.callee.name;
            }
            else if (node.callee.type === 'MemberExpression') {
                // new Foo.Bar() のようなケース
                if (node.callee.property && node.callee.property.name) {
                    className = node.callee.property.name;
                }
            }
            if (!className)
                return;
            // 引数の解析
            const args = node.arguments.map(arg => {
                if (arg.type === 'ObjectExpression') {
                    // {value: 3} のようなオブジェクトリテラル
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
                }
                else if (arg.type === 'Literal') {
                    return { type: 'literal', value: arg.value };
                }
                else if (arg.type === 'Identifier') {
                    return { type: 'identifier', name: arg.name };
                }
                else {
                    return { type: arg.type };
                }
            });
            // コードスニペットの抽出（前後の行も含める）
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
        instances, // ★ 追加
        loc: code.split('\n').length
    };
}
function checkRotation() {
    if (!fs.existsSync(JSONL_PATH))
        return;
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
        }
        catch (err) {
            log(`ローテーション失敗: ${err.message}`, 'error');
        }
    }
}
// ====================
// メイン処理
// ====================
function main() {
    const startTime = Date.now();
    log('=== Cognize Indexer v1.3 開始 ===');
    log(`モード: ${DRY_RUN ? 'DRY-RUN（書き込みなし）' : '本番実行'}`);
    log(`スキャン: ${FULL_SCAN ? 'フルスキャン' : '差分スキャン'}`);
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
      loc, updated_at, commit_sha
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `);
    const insertDep = db.prepare(`
    INSERT INTO file_dependencies (source_path, target_module, import_type)
    VALUES (?, ?, ?)
  `);
    const deleteDeps = db.prepare(`
    DELETE FROM file_dependencies WHERE source_path = ?
  `);
    // ★ 新規: インスタンス情報の挿入
    const insertInstance = db.prepare(`
    INSERT INTO class_instances (
      class_name, file_path, line_number, code_snippet, 
      arguments_json, created_at, commit_sha
    ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
  `);
    const deleteInstances = db.prepare(`
    DELETE FROM class_instances WHERE file_path = ?
  `);
    // ファイル処理ループ
    for (const relPath of files) {
        try {
            const fullPath = path.join(PROJECT_ROOT, relPath);
            const fileHash = getFileHash(fullPath);
            const analysis = analyzeFile(relPath);
            const record = {
                record_id: crypto.randomUUID(),
                schema_version: '1.3',
                provider: {
                    name: 'cognize-indexer',
                    version: '1.3',
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
                    instances: analysis.instances, // ★ 追加
                    stats: {
                        loc: analysis.loc,
                        symbol_count: analysis.symbols.length,
                        import_count: analysis.imports.length,
                        export_count: analysis.exports.length,
                        reexport_count: analysis.reexports.length,
                        instance_count: analysis.instances.length // ★ 追加
                    }
                }
            };
            if (!DRY_RUN) {
                // JSONL追記
                fs.appendFileSync(JSONL_PATH, JSON.stringify(record) + '\n', 'utf8');
                // SQLite更新
                insertFile.run(relPath, fileHash, analysis.language, JSON.stringify(analysis.symbols), JSON.stringify(analysis.imports), JSON.stringify(analysis.exports), analysis.loc, commitSha);
                // 依存関係更新
                deleteDeps.run(relPath);
                for (const imp of analysis.imports) {
                    const importType = imp.is_reexport ? 'reexport' : 'import';
                    insertDep.run(relPath, imp.module, importType);
                }
                // ★ インスタンス情報の更新
                deleteInstances.run(relPath);
                for (const inst of analysis.instances) {
                    insertInstance.run(inst.class_name, relPath, inst.line, inst.snippet, JSON.stringify(inst.arguments), commitSha);
                }
            }
            successCount++;
            const instCount = analysis.instances.length;
            const instLog = instCount > 0 ? `, ${instCount}インスタンス` : '';
            log(`処理完了: ${relPath} (${analysis.symbols.length}シンボル${instLog})`, 'verbose');
        }
        catch (err) {
            errorCount++;
            log(`処理失敗: ${relPath} - ${err.message}`, 'error');
        }
    }
    // 最適化
    if (!DRY_RUN) {
        db.exec('PRAGMA wal_checkpoint;');
        db.exec('ANALYZE;');
    }
    db.close();
    // 統計出力
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    log('=== 処理完了 ===');
    log(`成功: ${successCount}ファイル`);
    log(`失敗: ${errorCount}ファイル`);
    log(`実行時間: ${elapsed}秒`);
}
try {
    main();
}
catch (err) {
    log(`致命的エラー: ${err.message}`, 'error');
    console.error(err.stack);
    process.exit(1);
}
