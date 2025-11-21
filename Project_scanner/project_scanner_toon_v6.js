#!/usr/bin/env node

/**
 * ShootingGame7 - Project Scanner v6.0 TOON対応版 (ESM互換版)
 * 共通設定ファイル対応版
 */

import { fileURLToPath } from 'url';
import { dirname, join, relative, resolve, extname, normalize } from 'path';
import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { glob } from 'glob';
import Database from 'better-sqlite3';

// ===== ESM互換のパス解決 =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// ===== 共通設定の読み込み =====
const sharedConfigPath = resolve(projectRoot, 'Project_Cognize/config/shared_patterns.js');
let SCAN_PATTERNS = [];
let IGNORE_PATTERNS = [];

try {
  const { SCAN_PATTERNS: importedPatterns, IGNORE_PATTERNS: importedIgnores } = await import(sharedConfigPath);
  SCAN_PATTERNS = importedPatterns;
  IGNORE_PATTERNS = importedIgnores;
  console.log('✓ 共通設定ファイルを正常に読み込み');
} catch (err) {
  console.warn(`⚠ 共通設定読み込みエラー（デフォルト値を使用）: ${err.message}`);
  // デフォルト値（従来の設定）
  SCAN_PATTERNS = [
    'game/**/*.{js,json,html,css}',
    'Project_Cognize/**/*.{js,json}',
    'DynamicErrorMonitor/**/*.{js,json}',
    'Project_scanner/**/*.{js,json}'
  ];
  IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/*.log',
    '**/.DS_Store'
  ];
}

// ===== 設定 =====
const CONFIG = {
  projectRoot: projectRoot,
  dbPath: resolve(__dirname, '../Project_Cognize/database/static_index.db'),
  outputDir: resolve(__dirname, './output'),
  outputFile: 'project_structure.json',
  toonOutputFile: 'project_structure_toon.json',
  maxDepth: 20,
  scanPatterns: SCAN_PATTERNS,
  ignorePatterns: IGNORE_PATTERNS
};

// ===== 以降は変更なし（従来の関数群をそのまま使用）=====
function ensureOutputDir() {
  if (!existsSync(CONFIG.outputDir)) {
    try {
      mkdirSync(CONFIG.outputDir, { recursive: true });
      console.log(`✓ 出力ディレクトリを作成: ${CONFIG.outputDir}`);
    } catch (err) {
      console.error(`✗ 出力ディレクトリ作成エラー: ${err.message}`);
      throw err;
    }
  }
}

function connectDatabase() {
  if (!existsSync(CONFIG.dbPath)) {
    console.warn(`⚠ DBファイルが見つかりません: ${CONFIG.dbPath}`);
    console.warn('  DB参照なしでスキャンを続行します');
    return null;
  }
  try {
    const db = new Database(CONFIG.dbPath, { readonly: true, fileMustExist: true });
    console.log('✓ データベース接続成功');
    return db;
  } catch (err) {
    console.error(`✗ DB接続エラー: ${err.message}`);
    return null;
  }
}

function detectFilePathColumn(db) {
  if (!db) return null;
  try {
    const pragma = db.prepare("PRAGMA table_info(file_index)").all();
    const candidates = ['file_path', 'filepath', 'path', 'file'];
    for (const candidate of candidates) {
      const col = pragma.find(c => c.name.toLowerCase() === candidate);
      if (col) {
        console.log(`✓ DBカラム検出: ${col.name}`);
        return col.name;
      }
    }
    const fallback = pragma.find(c => /file/i.test(c.name));
    if (fallback) {
      console.warn(`⚠ フォールバックカラム使用: ${fallback.name}`);
      return fallback.name;
    }
    return null;
  } catch (err) {
    console.error(`✗ カラム検出エラー: ${err.message}`);
    return null;
  }
}

function normalizePathForDB(filePath) {
  return normalize(filePath).replace(/\\/g, '/').replace(/^\.\//, '');
}

function getFileMetadata(db, filePath, colName, dbErrorCache) {
  if (!db || !colName) return null;
  
  const normalizedPath = normalizePathForDB(filePath);
  
  try {
    const stmt = db.prepare(`SELECT * FROM file_index WHERE ${colName} = ? LIMIT 1`);
    const result = stmt.get(normalizedPath);
    
    if (!result) return null;
    return result;
  } catch (err) {
    if (!dbErrorCache.has(normalizedPath)) {
      dbErrorCache.set(normalizedPath, err.message);
    }
    return { _db_error: err.message };
  }
}

function getFileStats(filePath) {
  try {
    const stats = statSync(filePath);
    return {
      size: stats.size,
      modified: stats.mtime.toISOString(),
      isDirectory: stats.isDirectory()
    };
  } catch {
    return null;
  }
}

function buildNestedStructure(files, db, colName, dbErrorCache) {
  const root = {
    name: 'ShootingGame7',
    type: 'directory',
    path: '/',
    depth: 0,
    children: []
  };

  files.forEach(filePath => {
    const relativePath = relative(CONFIG.projectRoot, filePath);
    const parts = relativePath.split('/').filter(Boolean);
    
    if (parts.length > CONFIG.maxDepth) {
      console.warn(`⚠ 深さ制限超過（スキップ）: ${relativePath}`);
      return;
    }
    
    const stats = getFileStats(filePath);
    const dbMeta = getFileMetadata(db, relativePath, colName, dbErrorCache);

    let current = root;
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      let child = current.children.find(c => c.name === part);
      
      if (!child) {
        child = {
          name: part,
          type: isLast ? 'file' : 'directory',
          path: '/' + parts.slice(0, index + 1).join('/'),
          depth: index + 1,
          ...(isLast && {
            extension: extname(part),
            size: stats?.size || 0,
            modified: stats?.modified || null,
            ...(dbMeta && !dbMeta._db_error && { db_indexed: true }),
            ...(dbMeta && dbMeta._db_error && { db_error: true })
          }),
          ...(!isLast && { children: [] })
        };
        current.children.push(child);
      }
      
      if (!isLast) current = child;
    });
  });

  function sortChildren(node) {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });
      node.children.forEach(sortChildren);
    }
  }
  sortChildren(root);

  return root;
}

function generateStats(structure) {
  const stats = {
    totalFiles: 0,
    totalDirectories: 0,
    filesByExtension: {},
    totalSize: 0,
    dbIndexedFiles: 0,
    dbErrorFiles: 0,
    maxDepth: 0
  };

  function traverse(node) {
    stats.maxDepth = Math.max(stats.maxDepth, node.depth || 0);
    
    if (node.type === 'file') {
      stats.totalFiles++;
      const ext = node.extension || 'no-ext';
      stats.filesByExtension[ext] = (stats.filesByExtension[ext] || 0) + 1;
      stats.totalSize += node.size || 0;
      if (node.db_indexed) stats.dbIndexedFiles++;
      if (node.db_error) stats.dbErrorFiles++;
    } else if (node.type === 'directory') {
      stats.totalDirectories++;
    }
    
    if (node.children) node.children.forEach(traverse);
  }

  traverse(structure);
  return stats;
}

function convertToTOON(node) {
  const toonNode = {
    n: node.name,
    t: node.type,
    p: node.path,
    lvl: node.depth
  };

  if (node.type === 'file') {
    if (node.extension) toonNode.ext = node.extension;
    if (node.size !== undefined) toonNode.sz = node.size;
    if (node.modified) toonNode.mdf = node.modified;
    if (node.db_indexed) toonNode.dbi = true;
    if (node.db_error) toonNode.dbe = true;
  }

  if (node.children && node.children.length > 0) {
    toonNode.nodes = node.children.map(convertToTOON);
  }

  return toonNode;
}

function calculateHash(data) {
  const jsonString = JSON.stringify(data);
  return createHash('sha256').update(jsonString, 'utf8').digest('hex');
}

function generateTOONOutput(metadata, statistics, dbErrors, structure) {
  const toonStructure = convertToTOON(structure);
  const bodyData = {
    statistics,
    db_errors: dbErrors,
    structure: toonStructure
  };
  const bodyHash = calculateHash(bodyData);

  const toonHeader = {
    version: '1.0',
    generated_at: metadata.generated_at,
    scanner_version: metadata.scanner_version,
    node_version: metadata.node_version,
    project_root: metadata.project_root,
    hash: bodyHash,
    flags: 0,
    database_used: metadata.database_used,
    db_column_detected: metadata.db_column_detected,
    db_errors_count: metadata.db_errors_count,
    max_depth_limit: metadata.max_depth_limit
  };

  return {
    TOON_HEADER: toonHeader,
    ...bodyData
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('ShootingGame7 - Project Scanner v6.0 TOON対応版 (ESM互換)');
  console.log('='.repeat(60));
  console.log();

  try {
    ensureOutputDir();
  } catch (err) {
    console.error('✗ 初期化エラー: 出力ディレクトリ作成に失敗');
    process.exit(1);
  }

  const db = connectDatabase();
  const dbErrorCache = new Map();
  const dbColName = detectFilePathColumn(db);
  
  if (db && !dbColName) {
    console.error('✗ DBカラムが検出できませんでした');
  }
  console.log();

  console.log('📁 ファイルスキャン中...');
  try {
    const files = await glob(CONFIG.scanPatterns, {
      cwd: CONFIG.projectRoot,
      ignore: CONFIG.ignorePatterns,
      absolute: true,
      nodir: true
    });
    console.log(`✓ ${files.length}個のファイルを検出`);
    console.log();

    console.log('🔨 ネスト構造を構築中...');
    const structure = buildNestedStructure(files, db, dbColName, dbErrorCache);
    console.log('✓ ネスト構造生成完了');
    console.log();

    const stats = generateStats(structure);
    const dbErrors = Array.from(dbErrorCache.entries()).map(([file, error]) => ({
      file,
      error
    }));

    const metadata = {
      generated_at: new Date().toISOString(),
      scanner_version: '6.0_toon_esm',
      node_version: process.version,
      project_root: CONFIG.projectRoot,
      database_used: db !== null,
      db_column_detected: dbColName,
      db_errors_count: dbErrors.length,
      max_depth_limit: CONFIG.maxDepth
    };

    // 標準JSON出力
    const standardOutput = {
      metadata,
      statistics: stats,
      db_errors: dbErrors,
      structure: structure
    };
    const standardPath = join(CONFIG.outputDir, CONFIG.outputFile);
    writeFileSync(standardPath, JSON.stringify(standardOutput, null, 2), 'utf8');
    console.log(`✓ 標準JSON出力: ${standardPath}`);

    // TOON形式出力
    console.log('🎯 TOON形式に変換中...');
    const toonOutput = generateTOONOutput(metadata, stats, dbErrors, structure);
    const toonPath = join(CONFIG.outputDir, CONFIG.toonOutputFile);
    writeFileSync(toonPath, JSON.stringify(toonOutput, null, 2), 'utf8');
    console.log(`✓ TOON形式出力: ${toonPath}`);
    console.log(`  SHA256: ${toonOutput.TOON_HEADER.hash}`);
    console.log();

    // 統計表示
    console.log('📊 統計情報:');
    console.log(`  - ファイル数: ${stats.totalFiles}`);
    console.log(`  - ディレクトリ数: ${stats.totalDirectories}`);
    console.log(`  - 合計サイズ: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`  - DB索引済み: ${stats.dbIndexedFiles} / ${stats.totalFiles}`);
    console.log(`  - DBエラー: ${stats.dbErrorFiles}`);
    console.log(`  - 最大深さ: ${stats.maxDepth}`);
    console.log();
    
    if (Object.keys(stats.filesByExtension).length > 0) {
      console.log('  拡張子別:');
      Object.entries(stats.filesByExtension)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([ext, count]) => {
          console.log(`    ${ext}: ${count}`);
        });
      console.log();
    }

    if (db) {
      db.close();
      console.log('✓ データベース接続を閉じました');
    }

    console.log();
    console.log('='.repeat(60));
    console.log('✅ 完了');
    console.log(`   標準形式: ${standardPath}`);
    console.log(`   TOON形式: ${toonPath}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ 予期せぬエラーが発生しました:');
    console.error(error.stack || error);
    process.exit(1);
  }
}

main();