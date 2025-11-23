import { ProjectConfig, AnalysisResult } from './contracts';
import fs from 'fs';

function output(fullPrompt: string, analysisResult: AnalysisResult, config: ProjectConfig): void {
    console.log(`\n📊 トークン分析結果:`);
    const { totalTokens, ...rest } = analysisResult;
    Object.entries(rest).forEach(([key, value]) => {
        if (value > 0) console.log(`   ${key}: ${value.toLocaleString()}`);
    });
    console.log(`   ────────────────────────────`);
    console.log(`   合計: ${totalTokens.toLocaleString()} トークン`);
    
    if (totalTokens > config.QWEN_INPUT_LIMIT) {
        console.error(`❌ エラー: Qwen入力上限を超過しています`);
        process.exit(1);
    } else if (totalTokens > config.QWEN_SAFE_LIMIT) {
        console.warn(`⚠️  警告: 安全上限を超えています`);
    } else {
        console.log(`✅ トークン数は安全範囲内です\n`);
    }

    fs.writeFileSync(config.OUTPUT_FILE, fullPrompt);
    console.log(`✨ プロンプトを生成しました`);
    console.log(`   出力先: ${config.OUTPUT_FILE}`);
    console.log(`   ファイルサイズ: ${fs.statSync(config.OUTPUT_FILE).size.toLocaleString()} バイト\n`);

    console.log(`📋 次の手順:`);
    console.log(`   1. cat ${config.OUTPUT_FILE}`);
    console.log(`   2. AIにコピー＆ペースト\n`);
}

export { output };
