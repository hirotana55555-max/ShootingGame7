"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.output = output;
const fs_1 = __importDefault(require("fs"));
function output(fullPrompt, analysisResult, config) {
    console.log(`\n📊 トークン分析結果:`);
    const { totalTokens, ...rest } = analysisResult;
    Object.entries(rest).forEach(([key, value]) => {
        if (value > 0)
            console.log(`   ${key}: ${value.toLocaleString()}`);
    });
    console.log(`   ────────────────────────────`);
    console.log(`   合計: ${totalTokens.toLocaleString()} トークン`);
    if (totalTokens > config.QWEN_INPUT_LIMIT) {
        console.error(`❌ エラー: Qwen入力上限を超過しています`);
        process.exit(1);
    }
    else if (totalTokens > config.QWEN_SAFE_LIMIT) {
        console.warn(`⚠️  警告: 安全上限を超えています`);
    }
    else {
        console.log(`✅ トークン数は安全範囲内です\n`);
    }
    fs_1.default.writeFileSync(config.OUTPUT_FILE, fullPrompt);
    console.log(`✨ プロンプトを生成しました`);
    console.log(`   出力先: ${config.OUTPUT_FILE}`);
    console.log(`   ファイルサイズ: ${fs_1.default.statSync(config.OUTPUT_FILE).size.toLocaleString()} バイト\n`);
    console.log(`📋 次の手順:`);
    console.log(`   1. cat ${config.OUTPUT_FILE}`);
    console.log(`   2. AIにコピー＆ペースト\n`);
}
