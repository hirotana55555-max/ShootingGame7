/**
 * 共通スキャンパターン設定 (Single Source of Truth)
 * 
 * 設計思想:
 * - 1つの設定ファイルで全システムが参照
 * - 将来的なDEM/GLIAへの移植を考慮
 * - 非エンジニアでも理解可能なコメント付き
 * 
 * バージョン: 2.0 (World-Class Best Practice Edition)
 * 作成日: 2025-11-25
 * 責任者: ひろし, Manus
 */

// ★ 共通除外パターン（全システムで共用）
// Web上のベストプラクティスに基づき、セキュリティと一貫性を向上
export const IGNORE_PATTERNS = [
  // == 依存関係 ==
  // 最も基本的で重要な除外対象。サイズが大きく、再インストール可能なため。
  '**/node_modules/**',

  // == ビルド成果物・キャッシュ ==
  // ビルドやコンパイルによって自動生成されるファイル群。
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/out/**',          // Next.jsの静的エクスポート先
  '**/.swc/**',         // Next.jsのコンパイラキャッシュ
  '**/*.tsbuildinfo',   // TypeScriptの増分ビルド情報
  '**/.cache',          // 各種ツールのキャッシュ（ESLint, Parcelなど）
  '**/.eslintcache',    // ESLintのキャッシュ

  // == 機密情報 ==
  // APIキーやパスワードなど、絶対にリポジトリに含めてはならないファイル。
  '**/.env',
  '**/.env.local',
  '**/.env.development.local',
  '**/.env.test.local',
  '**/.env.production.local',

  // == ログ・デバッグファイル ==
  // 実行時に生成される一時的なログやレポート。
  '**/*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  'report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json', // Node.jsの診断レポート

  // == OS・エディタ固有ファイル ==
  // 開発者個人の環境に依存するファイル。
  '.DS_Store',          // macOS
  '.vscode/',           // Visual Studio Code
  '.idea/',             // JetBrains IDEs

  // == プロジェクト固有の除外設定 ==
  '**/*.jsonl',               // インデックス出力
  '**/TEMP_ARCHIVE_*/**',     // 一時隔離フォルダ
  '**/automation/**'          // 過剰機能（削除予定）
];

// ★ クリティカルファイル（AIへの憲法等）
// ※ このセクションは、indexer.jsでは、直接、参照されていませんが、
//   プロジェクトの重要ファイルを、明示するために、残しておきます。
export const CRITICAL_FILES = [
  'Project_Cognize/refactor_policy.json',
  'DynamicErrorMonitor/baseline_summary.json'
];

// ★ 将来の拡張用メタデータ
export const SYSTEM_METADATA = {
  current_owner: 'Project_Cognize',
  scheduled_migration: {
    phase1: 'DynamicErrorMonitor (近い将来)',
    phase2: 'GLIA (設計中)'
  },
  version: '2.0',
  last_updated: '2025-11-25'
};
