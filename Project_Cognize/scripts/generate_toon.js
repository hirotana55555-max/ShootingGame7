const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// ===== 設定 =====
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DB_PATH = path.resolve(__dirname, '../database/static_index.db');
const OUTPUT_FILE = path.resolve(__dirname, '../workspace/outputs/project_structure_toon.json');

console.log('=== Project Cognize: TOON Generator (v1.1) ===');

// 1. DB接続確認
if (!fs.existsSync(DB_PATH)) {
  console.error(`Error: Database not found at ${DB_PATH}`);
  process.exit(1);
}

// 2. データ取得
const db = new Database(DB_PATH, { readonly: true });
console.log('✓ Database connected');

try {
  // ★ 修正: DBスキーマに合わせてカラム名を変更 (loc, updated_at, is_criticalを使用)
  const sql = "SELECT path, loc AS size, updated_at AS last_modified, is_critical AS is_indexed FROM file_index ORDER BY path ASC";
  const files = db.prepare(sql).all();
  console.log(`✓ Found ${files.length} files (using LOC count as size)`);

  // 3. TOON構造の構築 (ロジックは変更なし)
  const structure = {
    n: path.basename(PROJECT_ROOT),
    t: 'directory',
    p: '/',
    lvl: 0,
    nodes: []
  };

  function addToStructure(root, filePath, fileData) {
    const normalizedPath = filePath.split(path.sep).join('/');
    const parts = normalizedPath.split('/').filter(p => p);
    
    let current = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += '/' + part;
      const isFile = (i === parts.length - 1);

      let node = current.nodes ? current.nodes.find(n => n.n === part) : null;

      if (!node) {
        node = {
          n: part,
          t: isFile ? 'file' : 'directory',
          p: currentPath,
          lvl: current.lvl + 1
        };
        
        if (isFile) {
          node.ext = path.extname(part);
          node.sz = fileData.size; // loc (行数) が入る
          node.mdf = fileData.last_modified;
          node.dbi = !!fileData.is_indexed; // is_critical (ブール値) が入る
        } else {
          node.nodes = [];
        }
        
        if (!current.nodes) current.nodes = [];
        current.nodes.push(node);
      }
      current = node;
    }
  }

  files.forEach(file => {
    let relPath = file.path;
    if (path.isAbsolute(relPath)) {
      relPath = path.relative(PROJECT_ROOT, relPath);
    }
    addToStructure(structure, relPath, file);
  });

  // 4. JSON出力
  const outputData = {
    TOON_HEADER: {
      version: "1.1-integrated-fixed",
      generated_at: new Date().toISOString(),
      source: "Project_Cognize (Internal)",
      db_source: path.basename(DB_PATH)
    },
    statistics: {
      totalFiles: files.length,
      generated_by: "generate_toon.js"
    },
    structure: structure
  };

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
  console.log(`✓ TOON file successfully generated:`);
  console.log(`  -> ${OUTPUT_FILE}`);

} catch (err) {
  console.error('✗ Execution Error:', err.message);
  process.exit(1);
} finally {
  db.close();
}
