#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("../lib/main");
/**
 * Project_Cognize プロンプト自動生成ツール v4.0 - "Orchestrated Actor Model"
 *
 * このファイルは、各専門家（アクター）を適切な順序で呼び出す「司令塔」です。
 * 実際の処理はすべて `lib/` ディレクトリ内のアクターが担当します。
 */
const path = require('path');
// ===== CLI処理 =====
const [phase, targetFile] = process.argv.slice(2);
if (!phase || !targetFile) {
    console.log(`
Project_Cognize プロンプト自動生成ツール v4.0 - Orchestrated Actor Model

使用方法:
  node ${path.basename(__filename)} <phase> <target_file>

例:
  node ${path.basename(__filename)} refactor game/components/Team.ts
  `);
    process.exit(0);
}
// ===== メイン処理の実行 =====
(async () => {
    try {
        // 司令塔である main アクターを呼び出す
        await (0, main_1.main)(phase, targetFile);
    }
    catch (e) {
        console.error(`\n❌ 予期しないエラーが発生しました:`);
        console.error(`   ${e.message}\n`);
        console.error(`スタックトレース:`);
        console.error(e.stack);
        process.exit(1);
    }
})();
