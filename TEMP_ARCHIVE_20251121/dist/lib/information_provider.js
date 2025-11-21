"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 統合版 (Manus + Gemini): 宣言的な設計と、丁寧な責務分離を両立
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
// ===== プライベート定数・ヘルパー関数群 =====
/**
 * コンポーネント使用箇所を検出するための正規表現パターンを生成する
 * @param {string} componentName - 検索するコンポーネント名
 * @returns {RegExp[]}
 */
const createEcsUsagePatterns = (componentName) => [
    new RegExp(`getComponent\\(['"\`]${componentName}['"\`]\\)`, 'g'),
    new RegExp(`hasComponent\\(['"\`]${componentName}['"\`]\\)`, 'g'),
    new RegExp(`addComponent\\(['"\`]${componentName}['"\`]`, 'g'),
    new RegExp(`removeComponent\\(['"\`]${componentName}['"\`]`, 'g'),
    new RegExp(`import.*${componentName}.*from`, 'g'),
    new RegExp(`require\\(['"\`].*${componentName}['"\`]\\)`, 'g')
];
function detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
        '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx',
        '.py': 'python', '.java': 'java', '.cpp': 'cpp', '.c': 'c', '.cs': 'csharp',
        '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.php': 'php', '.swift': 'swift',
        '.kt': 'kotlin', '.scala': 'scala'
    };
    return languageMap[ext] || 'plaintext';
}
function isComponentFile(filePath, config) {
    const normalizedTarget = path.relative(config.PROJECT_ROOT, filePath).replace(/\\/g, '/');
    return normalizedTarget.startsWith('game/components/');
}
function getRelevantSystemFiles(componentPath, config) {
    const componentName = path.basename(componentPath, path.extname(componentPath));
    const allSystemFiles = fs.readdirSync(config.SYSTEMS_DIR).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
    console.log(`\n🔍 ${componentName}を使用しているSystemを検索中...`);
    const patterns = createEcsUsagePatterns(componentName);
    const relevantSystems = allSystemFiles.filter(systemFile => {
        const systemPath = path.resolve(config.SYSTEMS_DIR, systemFile);
        try {
            const systemCode = fs.readFileSync(systemPath, 'utf8');
            return patterns.some(pattern => pattern.test(systemCode));
        }
        catch (e) {
            console.warn(`   ⚠️  ${systemFile} - 読み込みエラー: ${e.message}`);
            return false;
        }
    });
    if (relevantSystems.length === 0) {
        console.warn(`   ⚠️  警告: ${componentName}を使用しているSystemが見つかりませんでした`);
        return allSystemFiles;
    }
    relevantSystems.forEach(file => console.log(`   ✓ ${file} - ${componentName}を使用`));
    console.log(`\n🎯 ${relevantSystems.length}/${allSystemFiles.length}個のSystemファイルが関連しています\n`);
    return relevantSystems;
}
function compressDeps(targetFile, isComponent, config) {
    const queryScript = path.resolve(config.SCRIPT_DIR, 'query_index.js');
    if (!fs.existsSync(queryScript))
        return `DEPS_WARNING:file=${targetFile}|status=query_script_missing`;
    try {
        const rawOutput = execSync(`node "${queryScript}" deps "${targetFile}"`, { encoding: 'utf8', cwd: config.PROJECT_ROOT, timeout: config.DEPS_TIMEOUT });
        let dependencies = [], dependents = [];
        let currentSection = null;
        rawOutput.split('\n').forEach(line => {
            if (line.includes('使用しているモジュール'))
                currentSection = 'deps';
            else if (line.includes('使用しているファイル'))
                currentSection = 'used';
            const match = line.match(/^\s*-\s+(.+?)\s+\[(.+?)\]/);
            if (match) {
                if (currentSection === 'deps')
                    dependencies.push(`${match[1]}[${match[2]}]`);
                else if (currentSection === 'used')
                    dependents.push(match[1]);
            }
        });
        if (isComponent) {
            const relevantSystems = getRelevantSystemFiles(targetFile, config);
            dependencies = [...new Set([...dependencies, ...relevantSystems.map(f => `game/systems/${f}[POTENTIAL_ECS_DEPENDENCY]`)])];
        }
        const compressed = `DEPS:target=${path.basename(targetFile)}|imports=${dependencies.join(',')}|used_by=${dependents.join(',')}`;
        console.log(`📦 依存関係圧縮: ${rawOutput.length}文字 → ${compressed.length}文字`);
        return compressed;
    }
    catch (e) {
        return `DEPS_ERROR:file=${path.basename(targetFile)}|error=${e.message.substring(0, 100)}`;
    }
}
function truncateTscOutput(output, targetFile, maxErrors = 20) {
    const normalizedTargetFile = targetFile.replace(/\\/g, '/');
    const lines = output.split('\n');
    const targetFileErrors = [], otherErrors = [];
    let currentError = null;
    for (const line of lines) {
        const errorMatch = line.match(/^(.+?)\(\d+,\d+\): error TS\d+:/);
        if (errorMatch) {
            const filePath = errorMatch[1].replace(/\\/g, '/');
            currentError = { file: filePath, lines: [line] };
            if (filePath === normalizedTargetFile)
                targetFileErrors.push(currentError);
            else
                otherErrors.push(currentError);
        }
        else if (currentError && line.trim() !== '') {
            currentError.lines.push(line);
        }
        else {
            currentError = null;
        }
    }
    let result = [];
    if (targetFileErrors.length > 0) {
        result.push(`### 対象ファイルのエラー (${targetFileErrors.length}個) ###`);
        targetFileErrors.forEach(err => result.push(...err.lines, ''));
    }
    if (otherErrors.length > 0 && result.length < maxErrors * 2) {
        const remainingSlots = maxErrors - targetFileErrors.length;
        const includedOthers = otherErrors.slice(0, remainingSlots);
        if (includedOthers.length > 0) {
            result.push(`\n### その他のファイルのエラー (${includedOthers.length}/${otherErrors.length}個を表示) ###`);
            includedOthers.forEach(err => result.push(...err.lines, ''));
        }
        if (otherErrors.length > remainingSlots)
            result.push(`\n... (残り${otherErrors.length - remainingSlots}個のエラーは省略)`);
    }
    return result.join('\n');
}
function runTscCheck(targetFile, config) {
    return new Promise((resolve) => {
        console.log(`\n🩺 TypeScriptの型チェックを実行中 (tsc --noEmit)...`);
        exec('npx tsc --noEmit', { cwd: config.PROJECT_ROOT, timeout: config.TSC_TIMEOUT }, (error, stdout, stderr) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    resolve(`[TSC CHECK RESULT: SKIPPED]\n⚠️ tscコマンドが見つかりません。`);
                }
                else if (error.killed) {
                    resolve(`[TSC CHECK RESULT: TIMEOUT]\n⚠️ TSCチェックがタイムアウトしました。`);
                }
                else {
                    const output = stdout || stderr;
                    const errorCount = (output.match(/error TS/g) || []).length;
                    console.warn(`   ⚠️  TSCチェックで ${errorCount}個 の型エラーが検出されました。`);
                    const truncatedOutput = truncateTscOutput(output, targetFile);
                    resolve(`[TSC CHECK RESULT: FAILED]\n以下はTypeScriptコンパイラからのエラー報告です (${errorCount}個)。\n\`\`\`\n${truncatedOutput}\n\`\`\``);
                }
            }
            else {
                console.log(`   ✅ TSCチェック完了: 型エラーは見つかりませんでした。\n`);
                resolve(`[TSC CHECK RESULT: PASSED]\nTypeScriptの型チェックは成功しました。`);
            }
        });
    });
}
/**
 * 関連するSystemファイルのソースコードを読み込み、整形する
 * @param {string[]} systemFiles - 読み込むSystemファイル名の配列
 * @param {object} config - 設定オブジェクト
 * @returns {string[]}
 */
function loadRelevantSystemSourceCodes(systemFiles, config) {
    console.log(`📚 関連Systemファイルのソースコードを読み込み中...\n`);
    return systemFiles.map(file => {
        const relativePath = path.relative(config.PROJECT_ROOT, path.resolve(config.SYSTEMS_DIR, file));
        try {
            const code = fs.readFileSync(path.resolve(config.SYSTEMS_DIR, file), 'utf8');
            return `[SYSTEM CODE: ${relativePath}]\n\`\`\`${detectLanguage(file)}\n${code}\n\`\`\``;
        }
        catch (e) {
            return `[SYSTEM LOAD ERROR: ${relativePath}]\n${e.message}`;
        }
    });
}
// ===== 公開インターフェース =====
async function gatherAllInfo(targetFile, config) {
    if (!fs.existsSync(targetFile))
        throw new Error(`対象ファイルが見つかりません: ${targetFile}`);
    const isComponent = isComponentFile(targetFile, config);
    if (isComponent)
        console.log(`✨ Componentファイルを検出 → 関連Systemを分析します\n`);
    const sourceCode = fs.readFileSync(targetFile, 'utf8');
    console.log(`📄 ソースコード読み込み完了: ${path.relative(config.PROJECT_ROOT, targetFile)}`);
    const compressedDeps = compressDeps(targetFile, isComponent, config);
    let tscResult = '[TSC CHECK RESULT: NOT_APPLICABLE]';
    if (/\.(ts|tsx)$/.test(targetFile) && fs.existsSync(path.join(config.PROJECT_ROOT, 'tsconfig.json'))) {
        tscResult = await runTscCheck(targetFile, config);
    }
    let relevantSystemCodes = [];
    if (isComponent) {
        const systemFiles = getRelevantSystemFiles(targetFile, config);
        relevantSystemCodes = loadRelevantSystemSourceCodes(systemFiles, config);
    }
    return {
        sourceCode,
        language: detectLanguage(targetFile),
        isComponent,
        compressedDeps,
        tscResult,
        relevantSystemCodes,
    };
}
module.exports = { gatherAllInfo };
