// Project_Cognize/lib/contracts.ts

/**
 * プロジェクト全体で共有される設定情報の型定義
 * 書記官(config.ts)がこの型のオブジェクトを提供する
 */
export interface ProjectConfig {
  PROJECT_ROOT: string;
  POLICY_DIR: string;
  SCRIPT_DIR: string;
  TEMPLATE_DIR: string;
  OUTPUT_FILE: string;
  COMPONENTS_DIR: string;
  SYSTEMS_DIR: string;
  QWEN_INPUT_LIMIT: number;
  QWEN_SAFE_LIMIT: number;
  QWEN_WARNING_THRESHOLD: number;
  TSC_TIMEOUT: number;
  DEPS_TIMEOUT: number;
}

/**
 * 情報収集の専門家(information_provider.ts)が収集し、
 * プロンプト戦略家(prompt_strategist.ts)に渡す情報の型定義
 */
export interface GatheredInfo {
  sourceCode: string;
  language: string;
  isComponent: boolean;
  compressedDeps: string;
  tscResult: string;
  relevantSystemCodes: string[];
}

/**
 * プロンプト戦略家(prompt_strategist.ts)が生成する分析結果の型定義
 */
export interface AnalysisResult {
    systemTokens: number;
    policyTokens: number;
    depsTokens: number;
    sourceTokens: number;
    tscTokens: number;
    systemCodeTokens: number;
    instructionTokens: number;
    totalTokens?: number;
}
export interface BuildPromptOutput { fullPrompt: string; analysisResult: AnalysisResult; }
