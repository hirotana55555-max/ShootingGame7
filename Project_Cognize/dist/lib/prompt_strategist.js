"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrompt = buildPrompt;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ===== プライベート関数 =====
function _estimateTokens(text) {
    if (!text)
        return 0;
    return Math.ceil(Buffer.byteLength(text, 'utf8') / 2.5); // 簡易推定
}
function _compressPolicy(phase, config) {
    const policyFile = path_1.default.join(config.POLICY_DIR, `${phase}_policy.json`);
    if (!fs_1.default.existsSync(policyFile))
        throw new Error(`ポリシーファイルが見つかりません: ${policyFile}`);
    try {
        const data = JSON.parse(fs_1.default.readFileSync(policyFile, 'utf8'));
        const rules = (data.rules || []).map(r => `${r.id}[${r.action}]`).join(';');
        const compressed = `RULES: ${rules}|ALLOWED: ${(data.allowed_refactors || []).join(',')}|FORBIDDEN: ${(data.forbidden_refactors || []).join(',')}`;
        console.log(`📦 ポリシー圧縮完了`);
        return compressed;
    }
    catch (e) {
        throw new Error(`ポリシーファイルの解析に失敗: ${e.message}`);
    }
}
function _loadTemplate(templateName, config, variables = {}) {
    const templatePath = path_1.default.join(config.TEMPLATE_DIR, templateName);
    if (!fs_1.default.existsSync(templatePath))
        throw new Error(`テンプレートが見つかりません: ${templatePath}`);
    let template = fs_1.default.readFileSync(templatePath, 'utf8');
    Object.entries(variables).forEach(([key, value]) => {
        template = template.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return template;
}
// ===== 公開インターフェース =====
function buildPrompt(phase, targetFile, collectedInfo, config) {
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
    const analysisResult = {
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
