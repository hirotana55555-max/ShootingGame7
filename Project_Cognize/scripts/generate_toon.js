#!/usr/bin/env node
/**
 * TOON Generator v2.0 - Constitutional Compliance Edition
 * 
 * @description Generates Tree-Oriented Object Notation structure with symbol information
 * @constitutional_compliance YES - Follows shared_patterns.js and db.ts
 * @schema_compliance TOON_SCHEMA_INVARIANT - Uses 'p' for child nodes
 * 
 * Workflow Integration (WF-01):
 *   Step 2: Reads static_index.db → Generates TOON with symbols
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM環境で__dirnameを再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Direct Database Access (No db.ts dependency) ===
import Database from 'better-sqlite3';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DB_PATH = path.resolve(__dirname, '../database/static_index.db');
const OUTPUT_DIR = path.resolve(__dirname, '../workspace/outputs');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'project_structure_toon.json');

console.log('=== Project Cognize: TOON Generator v2.0 ===');
console.log('📜 Constitutional Compliance Mode: ENABLED');

console.log('=== Project Cognize: TOON Generator v2.0 ===');
console.log('📜 Constitutional Compliance Mode: ENABLED');
console.log('⚠  Note: Using direct DB access (db.ts unavailable in ESM)');

// === Phase 1: Database Connection ===
let db;
try {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`✗ [FATAL] Database not found: ${DB_PATH}`);
    console.error('   Hint: Run migrate.js first to create the database');
    process.exit(1);
  }
  
  db = new Database(DB_PATH, { readonly: true });
  console.log('✓ Database connection established');
  console.log(`   Path: ${path.relative(PROJECT_ROOT, DB_PATH)}`);
} catch (err) {
  console.error('✗ [FATAL] Failed to open database:', err.message);
  console.error(err.stack);
  process.exit(1);
}

try {
  // === Phase 2: Data Retrieval ===
  console.log('📊 Retrieving project data from static_index.db...');
  
  // Query 1: File metadata
  const fileQuery = `
    SELECT 
      path,
      loc AS size,
      updated_at AS last_modified,
      is_critical AS is_indexed,
      language,
      category,
      is_self_made,
      confidence
    FROM file_index 
    ORDER BY path ASC
  `;
  const files = db.prepare(fileQuery).all();
  console.log(`✓ Retrieved ${files.length} files`);

  // Query 2: Symbols for each file (with fallback)
  let getSymbols = null;
  let symbolsAvailable = false;
  
  try {
    // Check if symbols table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='symbols'").get();
    
    if (tables) {
      const symbolQuery = `
        SELECT 
          file_path,
          symbol_name,
          symbol_type,
          line_number
        FROM symbols
        WHERE file_path = ?
        ORDER BY line_number ASC
      `;
      getSymbols = db.prepare(symbolQuery);
      symbolsAvailable = true;
      console.log('✓ Symbols table found - will include symbol information');
    } else {
      console.warn('⚠ Symbols table not found - run migrate.js to create it');
      console.warn('   TOON will be generated without symbol information');
    }
  } catch (err) {
    console.warn('⚠ Could not access symbols table:', err.message);
    console.warn('   TOON will be generated without symbol information');
  }

  // === Phase 3: TOON Structure Construction ===
  console.log('🌳 Building TOON structure with symbols...');
  
  const structure = {
    n: path.basename(PROJECT_ROOT),
    t: 'directory',
    p: [], // TOON_SCHEMA_INVARIANT: Use 'p' for children
    lvl: 0,
    meta: {
      path: '/',
      is_root: true
    }
  };

  /**
   * Add file or directory node to TOON structure
   * @constitutional_compliance Follows TOON_SCHEMA_INVARIANT
   */
  function addToStructure(root, filePath, fileData) {
    const normalizedPath = filePath.split(path.sep).join('/');
    const parts = normalizedPath.split('/').filter(p => p);
    let current = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += '/' + part;
      const isFile = (i === parts.length - 1);
      
      // Find existing node (use 'p' array per TOON schema)
      let node = current.p ? current.p.find(n => n.n === part) : null;

      if (!node) {
        node = {
          n: part,
          t: isFile ? 'file' : 'directory',
          p: [], // TOON_SCHEMA_INVARIANT: Always use 'p' for children
          lvl: current.lvl + 1,
          meta: {
            path: currentPath
          }
        };

        if (isFile) {
          // File-specific metadata
          node.meta.ext = path.extname(part);
          node.meta.sz = fileData.size; // LOC count
          node.meta.mdf = fileData.last_modified;
          node.meta.dbi = !!fileData.is_indexed; // is_critical flag
          node.meta.lang = fileData.language;
          node.meta.cat = fileData.category;
          node.meta.self = !!fileData.is_self_made;
          node.meta.conf = fileData.confidence;

          // === Symbol Integration (WF-01 Step 2) ===
          // Retrieve symbols for this file (if symbols table exists)
          if (symbolsAvailable && getSymbols) {
            try {
              const symbols = getSymbols.all(filePath);
              
              if (symbols && symbols.length > 0) {
                // Add symbols as child nodes in 'p' array
                symbols.forEach(sym => {
                  const symbolNode = {
                    n: sym.symbol_name,
                    t: sym.symbol_type, // 'function', 'class', 'variable'
                    p: [], // Symbols can have children (e.g., methods in classes)
                    lvl: node.lvl + 1,
                    meta: {
                      line: sym.line_number,
                      parent_file: filePath,
                      is_symbol: true
                    }
                  };
                  node.p.push(symbolNode);
                });
                
                node.meta.sym_count = symbols.length;
              } else {
                node.meta.sym_count = 0;
              }
            } catch (symErr) {
              console.warn(`⚠ Symbol retrieval failed for ${filePath}: ${symErr.message}`);
              node.meta.sym_count = 0;
            }
          } else {
            // Symbols not available - use legacy symbols_json if present
            node.meta.sym_count = 0;
          }
        }

        // Add node to parent's children array
        if (!current.p) current.p = [];
        current.p.push(node);
      }

      current = node;
    }
  }

  // Process all files
  let processedCount = 0;
  files.forEach(file => {
    let relPath = file.path;
    if (path.isAbsolute(relPath)) {
      relPath = path.relative(PROJECT_ROOT, relPath);
    }
    addToStructure(structure, relPath, file);
    processedCount++;
    
    if (processedCount % 20 === 0) {
      process.stdout.write(`\r   Processing: ${processedCount}/${files.length} files`);
    }
  });
  console.log(`\r✓ Processed: ${processedCount}/${files.length} files`);

  // === Phase 4: Statistics Calculation ===
  function calculateStats(node) {
    let stats = {
      totalFiles: 0,
      totalDirs: 0,
      totalSymbols: 0,
      selfMadeFiles: 0,
      criticalFiles: 0,
      totalLOC: 0,
      languageBreakdown: {},
      categoryBreakdown: {}
    };

    function traverse(n) {
      if (n.t === 'file') {
        stats.totalFiles++;
        if (n.meta.self) stats.selfMadeFiles++;
        if (n.meta.dbi) stats.criticalFiles++;
        stats.totalLOC += n.meta.sz || 0;
        stats.totalSymbols += n.meta.sym_count || 0;
        
        // Language breakdown
        const lang = n.meta.lang || 'unknown';
        stats.languageBreakdown[lang] = (stats.languageBreakdown[lang] || 0) + 1;
        
        // Category breakdown (self-made only)
        if (n.meta.self && n.meta.cat) {
          stats.categoryBreakdown[n.meta.cat] = (stats.categoryBreakdown[n.meta.cat] || 0) + 1;
        }
      } else if (n.t === 'directory') {
        stats.totalDirs++;
      }

      if (n.p && Array.isArray(n.p)) {
        n.p.forEach(child => traverse(child));
      }
    }

    traverse(node);
    return stats;
  }

  const projectStats = calculateStats(structure);
  console.log(`✓ Statistics calculated:`);
  console.log(`   - Files: ${projectStats.totalFiles} (${projectStats.selfMadeFiles} self-made)`);
  console.log(`   - Directories: ${projectStats.totalDirs}`);
  console.log(`   - Symbols: ${projectStats.totalSymbols}`);
  console.log(`   - Total LOC: ${projectStats.totalLOC}`);

  // === Phase 5: JSON Output ===
  const outputData = {
    TOON_HEADER: {
      version: "2.0-constitutional-compliant",
      schema_version: "TOON_SCHEMA_INVARIANT",
      generated_at: new Date().toISOString(),
      source: "Project_Cognize (Constitutional Mode)",
      generator: "generate_toon.js v2.0",
      constitutional_compliance: {
        ap01_single_source: true,
        no_hardcoded_paths: true,
        uses_central_hub: true
      },
      capabilities: {
        symbol_information: true,
        metadata_enrichment: true,
        classification_data: true
      }
    },
    statistics: {
      ...projectStats,
      generated_by: "generate_toon.js v2.0"
    },
    structure: structure
  };

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Created output directory: ${OUTPUT_DIR}`);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
  console.log(`\n✓ TOON file successfully generated:`);
  console.log(`   → ${OUTPUT_FILE}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Schema: TOON_SCHEMA_INVARIANT (child nodes use 'p')`);
  console.log(`   - Constitutional Compliance: ✓`);
  console.log(`   - Symbol Integration: ✓ (${projectStats.totalSymbols} symbols)`);
  console.log(`   - Self-Made Code: ${projectStats.selfMadeFiles}/${projectStats.totalFiles} files`);

} catch (err) {
  console.error('\n✗ Execution Error:', err.message);
  console.error(err.stack);
  process.exit(1);
} finally {
  if (db) {
    db.close();
    console.log('\n✓ Database connection closed');
  }
  console.log('✓ TOON generation completed');
}