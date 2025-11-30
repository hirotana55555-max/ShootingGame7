/**
 * 共通スキャンパターン設定 v2.2 (GLIA Constitutional Layer)
 *
 * 設計思想:
 * - 「どこまでが自作コードか」を厳密かつ安全に定義する
 * - indexer / DEM / generate_toon / GLIA の統一的な Single Source of Truth
 * - include > exclude > config > critical の優先順位
 * - micromatch と相性の良い “最小驚き原則” のパターン設計
 *
 * 更新日: 2025-11-26
 * 担当: ひろし / Manus / Claude / ChatGPT
 */

//
// ===========================
// 除外パターン（プロジェクト外部 or ノイズ）
// ===========================
//
const IGNORE_PATTERNS = [
  // 依存関係
  'node_modules/**',

  // ビルド成果物 / キャッシュ
  'dist/**',
  'build/**',
  '.next/**',
  'out/**',
  '.swc/**',
  '*.tsbuildinfo',
  '.cache/**',
  '.eslintcache',

  // 環境ファイル
  '.env',
  '.env.*',
  '.env.local',
  '.env.*.local',

  // ログ
  '*.log',
  'npm-debug.log*',
  'yarn-*.log*',

  // OS / IDE
  '.DS_Store',
  '.vscode/**',
  '.idea/**',

  // Cognize 自己参照
  'Project_Cognize/workspace/outputs/**',
  'Project_Cognize/database/**',
  '*.jsonl',
  '*.jsonl.gz',

  // 一時ファイル
  'TEMP_ARCHIVE_*/**',
  'automation/**'
];

//
// ===========================
// 自作コード判定ルール
// ===========================
//
const SOURCE_CODE_RULES = {
  //
  // --- ホワイトリスト（最重要） ---
  // micromatch の仕様上、ルート起点で書く方が誤爆が減る
  //
  include_paths: [
    // Cognize/GLIA 全体
    'Project_Cognize/**',

    // Dynamic Error Monitor 全体
    'DynamicErrorMonitor/**',

    // プロジェクト計画
    'Plan/**',

    // ルートスクリプト
    'scripts/**',

    // 共通ユーティリティ
    'lib/**',
    'utils/**',

    // アプリケーション本体
    'components/**',
    'app/**',
    'game/**',
  ],

  //
  // --- 明示的な外部コード（ブラックリスト） ---
  //
  exclude_paths: [
    'node_modules/**',
    'public/**',
    '.next/**',

    // lock file 明示的列挙（誤爆を避ける）
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml'
  ],

  //
  // --- 設定ファイル（自作だが critical ではない） ---
  //
  config_files: [
    'next.config.js',
    'tailwind.config.ts',
    'postcss.config.js',
    'tsconfig.json',
    'package.json'
  ],

  //
  // --- ヒューリスティック推論（indexer.js で未実装なので flag のみにする） ---
  // 実装がされていない機能を ON にするのは危険なので、明示的に off。
  //
  heuristics: {
    infer_from_package_json: false,
    infer_from_metadata: false,
    relative_imports_are_self_made: true,   // これは既に indexer 側で実質活用されている
  }
};

//
// ===========================
// JavaScript ビルトイン（ノイズ除去）
// ===========================
//
const BUILTIN_CLASSES = [
  // 基礎
  'Object', 'Array', 'Function', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt',

  // エラー
  'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError',
  'EvalError', 'URIError', 'AggregateError',

  // コレクション
  'Map', 'Set', 'WeakMap', 'WeakSet',

  // 日付 / 正規表現
  'Date', 'RegExp',

  // 非同期
  'Promise', 'AsyncFunction', 'GeneratorFunction',

  // バイト列
  'ArrayBuffer', 'SharedArrayBuffer', 'DataView',
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray',
  'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array',
  'Float32Array', 'Float64Array',
  'BigInt64Array', 'BigUint64Array',

  // Web API
  'URL', 'URLSearchParams', 'FormData', 'Blob', 'File',
  'Request', 'Response', 'Headers',
  'WebSocket', 'EventSource', 'MessageChannel', 'BroadcastChannel',
  'Worker', 'SharedWorker',
  'Image', 'Audio', 'Option'
];

//
// ===========================
// クリティカルファイル（最重要ドキュメント）
// ===========================
//
const CRITICAL_FILES = [
  'Project_Cognize/refactor_policy.json',
  'DynamicErrorMonitor/baseline_summary.json',

  // ゲームコア
  'game/core/World.js',
  'game/core/entityFactory.js',
  'game/core/main.js'
];

//
// ===========================
// メタデータ（将来的な GLIA 拡張向け）
// ===========================
//
const SYSTEM_METADATA = {
  project: 'ShootingGame7',
  owner: 'Project_Cognize',
  framework: 'Next.js 16 + React 19',

  architecture: {
    core: 'ECS',
    analyzer: 'Project_Cognize',
    observability: 'DynamicErrorMonitor'
  },

  glia_phases: {
    phase1: 'Observability unification',
    phase2: 'Distributed GLIA micro-agents',
    phase3: 'Full autonomy routing'
  },

  version: '2.2',
  last_updated: '2025-11-26',
  authors: ['ひろし', 'Manus', 'Claude', 'ChatGPT']
};

const DB_PATHS = {
  ERRORS_DB: 'DynamicErrorMonitor/database/errors.db',
};


//
// ===========================
// エクスポート
// ===========================
module.exports = {
  IGNORE_PATTERNS,
  SOURCE_CODE_RULES,
  BUILTIN_CLASSES,
  CRITICAL_FILES,
  SYSTEM_METADATA,
  DB_PATHS // DBパスを憲法としてエクスポート
};