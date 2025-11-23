import path from 'path';
import config from './config';
import { ProjectConfig, GatheredInfo } from './contracts';
import { gatherAllInfo } from './information_provider';
import { buildPrompt } from './prompt_strategist';
import { output } from './system_interface';

async function main(phase: string, targetFile: string): Promise<void> {
  console.log(`🚀 プロンプト生成を開始 (Project_Cognize v4.0 - Orchestrated Actor Model)`);
  console.log(`   フェーズ: ${phase}`);
  console.log(`   対象ファイル: ${targetFile}\n`);

  const projectConfig: ProjectConfig = config;

  const absoluteTargetFile = path.resolve(projectConfig.PROJECT_ROOT, targetFile);

  const collectedInfo: GatheredInfo = await gatherAllInfo(absoluteTargetFile, projectConfig);

  const { fullPrompt, analysisResult } = buildPrompt(phase, targetFile, collectedInfo, projectConfig);

  output(fullPrompt, analysisResult, projectConfig);
}

export { main };
