#!/usr/bin/env node
/**
 * Project_Cognize プロンプト自動生成ツール v4.0 - "Orchestrated Actor Model"
 *
 * 修正点:
 * - 重複importを完全解消
 * - 相対パスに修正（PROJECT_ROOT基準）
 * - TypeScript完全対応
 * - 最小限の機能を維持
 */

import { main } from '../lib/main';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ===== ESM互換のパス解決 =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// ===== CLI処理 =====
const [phase, targetFile] = process.argv.slice(2);

if (!phase || !targetFile) {
  console.log(`
Project_Cognize プロンプト自動生成ツール v4.0 - Orchestrated Actor Model

使用方法:
  node ${path.basename(__filename)} <phase> <target_file>

例:
  node ${path.basename(__filename)} refactor game/core/main.js
  `);
  process.exit(0);
}

// ===== メイン処理の実行 =====
(async () => {
  try {
    await main(phase, targetFile);
  } catch (e) {
    console.error(`\n❌ 予期しないエラーが発生しました:`);
    console.error(`   ${e.message}\n`);
    if (e.stack) {
      console.error(`スタックトレース:`);
      console.error(e.stack);
    }
    process.exit(1);
  }
})();