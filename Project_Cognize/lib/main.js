const config = require('./config.js');
const informationProvider = require('./information_provider.js');
const promptStrategist = require('./prompt_strategist.js');
const systemInterface = require('./system_interface.js');

/**
 * 各アクターを指揮し、プロンプト生成プロセス全体を管理する司令塔。
 * @param {string} phase - 実行フェーズ (e.g., 'refactor')
 * @param {string} targetFile - 対象ファイルのパス
 */
async function main(phase, targetFile) {
  console.log(`\n🚀 プロンプト生成を開始 (Project_Cognize v4.0 - Orchestrated Actor Model)`);
  console.log(`   フェーズ: ${phase}`);
  console.log(`   対象ファイル: ${targetFile}\n`);

  // 1. 書記官からプロジェクトの憲法（設定）を取得
  const projectConfig = config;

  // 2. 情報収集の専門家から、分析に必要な全ての情報を収集
  const collectedInfo = await informationProvider.gatherAllInfo(targetFile, projectConfig);

  // 3. プロンプト戦略家に、収集した情報と設定を渡し、最終プロンプトを構築させる
  const { fullPrompt, analysisResult } = promptStrategist.buildPrompt(phase, targetFile, collectedInfo, projectConfig);

  // 4. 外部システム担当に、完成したプロンプトと分析結果を渡し、出力させる
  systemInterface.output(fullPrompt, analysisResult, projectConfig);
}

module.exports = { main };
