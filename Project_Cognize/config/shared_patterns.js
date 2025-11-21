/**
 * 共通スキャンパターン設定 (Single Source of Truth)
 * 
 * 設計思想:
 * - 1つの設定ファイルで全システムが参照
 * - 将来的なDEM/GLIAへの移植を考慮
 * - 非エンジニアでも理解可能なコメント付き
 * 
 * バージョン: 1.1 (TypeScript対応追加)
 * 作成日: 2025-11-21
 * 責任者: ひろし
 */

// ★ 共通スキャンパターン（全システムで共用）
export const SCAN_PATTERNS = [
  // ゲーム本体（コア開発対象）
  'game/**/*.{js,json,html,css}',
  
  // Project_Cognize（AI依存開発の聖域）
  'Project_Cognize/**/*.{js,json,ts}',
  '!Project_Cognize/workspace/outputs/**',    // 生成物は除外
  '!Project_Cognize/database/**',             // DBは除外
  
  // DynamicErrorMonitor（動的エラー監視）
  'DynamicErrorMonitor/**/*.{js,json,ts}',
  '!DynamicErrorMonitor/node_modules/**',     // 依存関係は除外
  
  // Project_scanner（プロジェクトスキャナー）
  'Project_scanner/**/*.{js,json,ts}',
  '!Project_scanner/output/**',               // 生成物は除外
  
  // ★ 新規追加: TypeScriptスクリプトを明示的に対象に
  'Project_Cognize/scripts/*.ts'
];

// ★ 共通除外パターン（全システムで共用）
export const IGNORE_PATTERNS = [
  '**/node_modules/**',       // 依存関係（外部）
  '**/dist/**',               // ビルド成果物
  '**/build/**',              // ビルド成果物  
  '**/.git/**',               // バージョン管理
  '**/.next/**',              // Next.js生成物
  '**/*.log',                 // ログファイル
  '**/*.jsonl',               // インデックス出力
  '**/TEMP_ARCHIVE_*/**',     // 一時隔離フォルダ
  '**/automation/**'          // 過剰機能（削除予定）
];

// ★ クリティカルファイル（AIへの憲法等）
export const CRITICAL_FILES = [
  'Project_Cognize/refactor_policy.json',      // AIへの「憲法」
  'DynamicErrorMonitor/baseline_summary.json' // ベースライン情報
];

// ★ 将来の拡張用メタデータ
export const SYSTEM_METADATA = {
  current_owner: 'Project_Cognize',
  scheduled_migration: {
    phase1: 'DynamicErrorMonitor (近い将来)',
    phase2: 'GLIA (設計中)'
  },
  version: '1.1',
  last_updated: '2025-11-21'
};

// ★ 非エンジニア向けヘルパー関数
export function getScanSummary() {
  return {
    total_patterns: SCAN_PATTERNS.length,
    critical_files: CRITICAL_FILES.length,
    system_info: SYSTEM_METADATA
  };
}

// ★ 安全性チェック（実行時検証用）
export function validatePatterns() {
  const invalidPatterns = SCAN_PATTERNS.filter(p => p.includes('TEMP_ARCHIVE') || p.includes('automation'));
  if (invalidPatterns.length > 0) {
    console.warn('⚠ 警告: 安全性の低いパターンが検出されました', invalidPatterns);
    return false;
  }
  return true;
}