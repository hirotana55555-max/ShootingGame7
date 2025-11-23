import { ProjectConfig, GatheredInfo, AnalysisResult, BuildPromptOutput } from './contracts';
import fs from 'fs';
import path from 'path';

// ===== プライベート関数 =====

function _estimateTokens(text: string | undefined): number {
  if (!text) return 0;
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 2.5); // 簡易推定
}

function _compressPolicy(phase: string, config: ProjectConfig): string {
    const policyFile = path.join(config.POLICY_DIR, `${phase}_policy.json`);
    if (!fs.existsSync(policyFile)) throw new Error(`ポリシーファイルが見つかりません: ${policyFile}`);
    try {
        const data = JSON.parse(fs.readFileSync(policyFile, 'utf8'));
        const rules = (data.rules || []).map(r => `${r.id}[${r.action}]`).join(';');
        const compressed = `RULES: ${rules}|ALLOWED: ${(data.allowed_refactors || []).join(',')}|FORBIDDEN: ${(data.forbidden_refactors || []).join(',')}`;
        console.log(`📦 ポリシー圧縮完了`);
        return compressed;
    } catch (e: unknown) {
        throw new Error(`ポリシーファイルの解析に失敗: ${e.message}`);
    }
}

function _loadTemplate(templateName: string, config: ProjectConfig, variables: Record<string, string> = {}): string {
    const templatePath = path.join(config.TEMPLATE_DIR, templateName);
    if (!fs.existsSync(templatePath)) throw new Error(`テンプレートが見つかりません: ${templatePath}`);
    let template = fs.readFileSync(templatePath, 'utf8');
    Object.entries(variables).forEach(([key, value]) => {
        template = template.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return template;
}

// ===== 公開インターフェース =====

function buildPrompt(phase: string, targetFile: string, collectedInfo: GatheredInfo, config: ProjectConfig): BuildPromptOutput {
    const { sourceCode, language, isComponent, compressedDeps, tscResult, relevantSystemCodes } = collectedInfo;

    const systemPrompt = _loadTemplate('system_prompt_template.txt', config, { phase });
    const instruction = _loadTemplate('task_prompt_template.txt', config);
    const compressedPolicy = _compressPolicy(phase, config);

    const sourceSection = `[TARGET SOURCE CODE: ${targetFile}]\n\`\`\`${language}\n${sourceCode}\n\`\`\``;
    const systemCodeSection = isComponent && relevantSystemCodes.length > 0
        ? `[RELATED SYSTEM CODES]\n${relevantSystemCodes.join('\n\n')}`
        : '';

    const fullPrompt = [
        systemPrompt,
        `[POLICY]\n${compressedPolicy}`,
        `[CONTEXT]\n${compressedDeps}`,
        sourceSection,
        tscResult,
        systemCodeSection,
        instruction
    ].filter(Boolean).join('\n\n');

    const analysisResult: Omit<AnalysisResult, "totalTokens"> = {
        systemTokens: _estimateTokens(systemPrompt),
        policyTokens: _estimateTokens(compressedPolicy),
        depsTokens: _estimateTokens(compressedDeps),
        sourceTokens: _estimateTokens(sourceSection),
        tscTokens: _estimateTokens(tscResult),
        systemCodeTokens: _estimateTokens(systemCodeSection),
        instructionTokens: _estimateTokens(instruction),
    };
    analysisResult.totalTokens = Object.values(analysisResult).reduce((sum, val) => sum + val, 0);
    
    console.log(`\n🧠 プロンプト戦略家: プロンプト構築完了`);
    const totalTokens = Object.values(analysisResult).reduce((sum, val) => (sum || 0) + (val || 0), 0);
    return { fullPrompt, analysisResult: { ...analysisResult, totalTokens } };
}

export { buildPrompt };
