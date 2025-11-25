/**
 * 共通スキャンパターン設定 v2.0 (Single Source of Truth)
 * 
 * 設計思想:
 * - プロジェクトの「自作コード範囲」を明確に定義
 * - 全システム（indexer, generate_toon, DEM, 未来のGLIA）が参照
 * - ルールベース + ヒューリスティック推論の併用
 * 
 * バージョン: 2.0 (GLIA準備版)
 * 更新日: 2025-11-25
 * 責任者: ひろし, Manus, Claude
 */

// ===========================
// 除外パターン（全システム共通）
// ===========================
const IGNORE_PATTERNS = [
  // == 依存関係 ==
  '**/node_modules/**',
  
  // == ビルド成果物・キャッシュ ==
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/out/**',
  '**/.swc/**',
  '**/*.tsbuildinfo',
  '**/.cache/**',
  '**/.eslintcache',
  
  // == 機密情報 ==
  '**/.env',
  '**/.env.local',
  '**/.env.*.local',
  
  // == ログ・デバッグファイル ==
  '**/*.log',
  '**/npm-debug.log*',
  '**/yarn-*.log*',
  '**/report.[0-9]*.json',
  
  // == OS・エディタ ==
  '**/.DS_Store',
  '**/.vscode/**',
  '**/.idea/**',
  
  // == Project_Cognize 自己参照防止 ==
  '**/Project_Cognize/workspace/outputs/**',
  '**/Project_Cognize/database/**',
  '**/*.jsonl',
  '**/*.jsonl.gz',
  
  // == 一時・アーカイブ ==
  '**/TEMP_ARCHIVE_*/**',
  '**/automation/**'  // 削除予定の過剰機能
];

// ===========================
// 自作コード判定ルール（GLIA構想の核心）
// ===========================
const SOURCE_CODE_RULES = {
  // --- ホワイトリスト: 明示的な自作コード領域 ---
  include_paths: [
    'components/**',      // React UI層
    'app/**',             // Next.js App Router
    'game/**',            // ゲームエンジン本体
    'lib/**',             // 共通ライブラリ（存在すれば）
    'utils/**'            // ユーティリティ（存在すれば）
  ],
  
  // --- ブラックリスト: 明示的な外部コード ---
  exclude_paths: [
    'node_modules/**',
    'public/**',          // 静的ファイル（SVG, 画像等）
    '.next/**'
  ],
  
  // --- 特殊ルール: Next.jsの設定ファイル ---
  // これらは「自作」だが、通常はLLMに触らせたくない
  config_files: [
    'next.config.js',
    'tailwind.config.ts',
    'postcss.config.js',
    'tsconfig.json',
    'package.json'
  ],
  
  // --- ヒューリスティック推論 ---
  heuristics: {
    // import元がpackage.jsonのdependenciesに無ければ自作と判定
    infer_from_package_json: true,
    
    // ディレクトリにREADME/LICENSEがあれば外部ライブラリと判定
    infer_from_metadata: true,
    
    // 相対パス import は自作コード
    relative_imports_are_self_made: true
  }
};

// ===========================
// JavaScriptビルトインクラス（ノイズ除去用）
// ===========================
const BUILTIN_CLASSES = [
  // 基本オブジェクト
  'Object', 'Array', 'Function', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt',
  
  // エラー系
  'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 
  'EvalError', 'URIError', 'AggregateError',
  
  // コレクション
  'Map', 'Set', 'WeakMap', 'WeakSet',
  
  // 日付・正規表現
  'Date', 'RegExp',
  
  // Promise・非同期
  'Promise', 'AsyncFunction', 'GeneratorFunction',
  
  // バイナリデータ
  'ArrayBuffer', 'SharedArrayBuffer', 'DataView',
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray',
  'Int16Array', 'Uint16Array', 
  'Int32Array', 'Uint32Array',
  'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
  
  // その他
  'Proxy', 'Reflect', 'Intl', 'WebAssembly',
  
  // ブラウザAPI（稀にnewされる）
  'URL', 'URLSearchParams', 'FormData', 'Blob', 'File',
  'Request', 'Response', 'Headers',
  'WebSocket', 'EventSource', 'MessageChannel', 'BroadcastChannel',
  'Worker', 'SharedWorker',
  'Image', 'Audio', 'Option'
];

// ===========================
// クリティカルファイル（AIへの「憲法」）
// ===========================
const CRITICAL_FILES = [
  'Project_Cognize/refactor_policy.json',
  'DynamicErrorMonitor/baseline_summary.json',
  'game/core/World.js',           // ゲームエンジンの心臓部
  'game/core/entityFactory.js',   // エンティティ生成の核
  'game/core/main.js'             // ゲームループ
];

// ===========================
// メタデータ（将来の拡張用）
// ===========================
const SYSTEM_METADATA = {
  current_owner: 'Project_Cognize',
  project_name: 'ShootingGame7',
  architecture: 'ECS (Entity-Component-System)',
  framework: 'Next.js 16 + React 19',
  
  scheduled_migration: {
    phase1: 'DynamicErrorMonitor統合',
    phase2: 'GLIA構想実装'
  },
  
  version: '2.0',
  last_updated: '2025-11-25',
  authors: ['ひろし', 'Manus', 'Claude']
};

// ===========================
// エクスポート
// ===========================
module.exports = {
  IGNORE_PATTERNS,
  SOURCE_CODE_RULES,
  BUILTIN_CLASSES,
  CRITICAL_FILES,
  SYSTEM_METADATA
};