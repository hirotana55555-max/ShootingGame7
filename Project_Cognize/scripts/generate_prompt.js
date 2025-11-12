#!/usr/bin/env node
/**
 * Project_Cognize プロンプト自動生成ツール v3.4 - Optimized Edition
 * 
 * 変更点（v3.3 → v3.4）:
 *  ✅ スマートフィルタリング: Componentを実際に使用しているSystemのみをロード
 *  ✅ エラーハンドリング強化: 読み込み失敗時もAIに通知
 *  ✅ スコープエラー修正: systemFiles変数の参照問題を解決
 *  ✅ Component判定の堅牢化: Windows環境とサブディレクトリに対応
 *  ✅ プロンプト構造の改善: セクション名を明確化
 * 
 * 使い方:
 *   node Project_Cognize/scripts/generate_prompt_v3.4_optimized.js refactor game/components/Position.ts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ===== 設定 =====
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const POLICY_DIR = path.join(PROJECT_ROOT, 'Project_Cognize');
const SCRIPT_DIR = path.join(POLICY_DIR, 'scripts');
const TEMPLATE_DIR = path.join(POLICY_DIR, 'templates');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'auto_prompt.md');

const COMPONENTS_DIR = path.join(PROJECT_ROOT, 'game', 'components');
const SYSTEMS_DIR = path.join(PROJECT_ROOT, 'game', 'systems');

const QWEN_INPUT_LIMIT = 32768;
const QWEN_SAFE_LIMIT = 30000;
const QWEN_WARNING_THRESHOLD = 25000;

// ===== トークン推定 =====
function estimateTokens(text) {
  const bytes = Buffer.byteLength(text, 'utf8');
  
  const hiragana = (text.match(/[\u3040-\u309F]/g) || []).length;
  const katakana = (text.match(/[\u30A0-\u30FF]/g) || []).length;
  const kanji = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
  const ascii = (text.match(/[\x20-\x7E]/g) || []).length;
  const punctuation = (text.match(/[、。！？「」『』【】（）]/g) || []).length;
  
  const hiraganaTokens = hiragana * 1.5;
  const katakanaTokens = katakana * 1.5;
  const kanjiTokens = kanji * 1.8;
  const asciiTokens = ascii * 0.29;
  const punctTokens = punctuation * 0.5;
  
  const knownBytes = (hiragana + katakana + kanji + punctuation) * 3 + ascii;
  const otherBytes = bytes - knownBytes;
  const otherTokens = otherBytes / 2;
  
  const baseTokens = hiraganaTokens + katakanaTokens + kanjiTokens + 
                     asciiTokens + punctTokens + otherTokens;
  
  return Math.ceil(baseTokens * 1.25);
}

// ===== ポリシー読み込み =====
function compressPolicy(phase) {
  const policyFile = path.join(POLICY_DIR, `${phase}_policy.json`);
  
  if (!fs.existsSync(policyFile)) {
    console.error(`\n❌ エラー: ポリシーファイルが見つかりません`);
    console.error(`   パス: ${policyFile}\n`);
    process.exit(1);
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(policyFile, 'utf8'));
    
    const rules = (data.rules || []).map(r => {
      const pattern = r.pattern ? `:${r.pattern}` : '';
      const maxFiles = r.max_files ? `:max=${r.max_files}` : '';
      return `${r.id}[${r.action}]${pattern}${maxFiles}`;
    }).join(';');
    
    const compressed = [
      `### REFACTOR POLICY v${data.policy_version}`,
      `RULES: ${rules}`,
      `ALLOWED: ${(data.allowed_refactors || []).join(',')}`,
      `FORBIDDEN: ${(data.forbidden_refactors || []).join(',')}`,
      `FRAMEWORK: ${data.project_context?.framework || 'Unknown'}`,
      `LANGUAGE: ${data.project_context?.language || 'Unknown'}`,
      `CRITICAL: ${(data.project_context?.critical_paths || []).join(',')}`
    ].join('\n');
    
    const originalBytes = Buffer.byteLength(JSON.stringify(data));
    const compressedBytes = Buffer.byteLength(compressed);
    const reduction = Math.round((1 - compressedBytes / originalBytes) * 100);
    
    console.log(`📦 ポリシー圧縮: ${originalBytes}B → ${compressedBytes}B (${reduction}%削減)`);
    
    return compressed;
  } catch (e) {
    console.error(`\n❌ エラー: ポリシーファイルの解析に失敗\n   ${e.message}\n`);
    process.exit(1);
  }
}

// ===== Component判定（堅牢化版） =====
function isComponentFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return /^game\/components\//i.test(normalized);
}

// ===== 🔥 v3.4新機能: Componentを使用しているSystemを検出 =====
function getRelevantSystemFiles(componentPath) {
  const componentName = path.basename(componentPath, path.extname(componentPath));
  const allSystemFiles = fs.readdirSync(SYSTEMS_DIR).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
  
  console.log(`\n🔍 ${componentName}を使用しているSystemを検索中...`);
  
  const relevantSystems = [];
  
  for (const systemFile of allSystemFiles) {
    const systemPath = path.join(SYSTEMS_DIR, systemFile);
    try {
      const systemCode = fs.readFileSync(systemPath, 'utf8');
      
      // Componentの使用を検出（複数パターン対応）
      const patterns = [
        new RegExp(`getComponent\\(['"\`]${componentName}['"\`]\\)`, 'g'),
        new RegExp(`hasComponent\\(['"\`]${componentName}['"\`]\\)`, 'g'),
        new RegExp(`addComponent\\(['"\`]${componentName}['"\`]`, 'g'),
        new RegExp(`removeComponent\\(['"\`]${componentName}['"\`]`, 'g'),
        new RegExp(`import.*${componentName}.*from`, 'g'),
        new RegExp(`require\\(['"\`].*${componentName}['"\`]\\)`, 'g')
      ];
      
      const isUsed = patterns.some(pattern => pattern.test(systemCode));
      
      if (isUsed) {
        relevantSystems.push(systemFile);
        console.log(`   ✓ ${systemFile} - ${componentName}を使用`);
      }
    } catch (e) {
      console.warn(`   ⚠️  ${systemFile} - 読み込みエラー: ${e.message}`);
    }
  }
  
  if (relevantSystems.length === 0) {
    console.warn(`   ⚠️  警告: ${componentName}を使用しているSystemが見つかりませんでした`);
    console.warn(`   ℹ️  全てのSystemファイルを含めます（安全策）`);
    return allSystemFiles;
  }
  
  console.log(`\n🎯 ${relevantSystems.length}/${allSystemFiles.length}個のSystemファイルが関連しています\n`);
  return relevantSystems;
}

// ===== 依存関係取得 =====
function compressDeps(targetFile, isComponent) {
  const queryScript = path.join(SCRIPT_DIR, 'query_index.js');
  
  if (!fs.existsSync(queryScript)) {
    console.warn(`⚠️  警告: query_index.jsが見つかりません`);
    return `DEPS_WARNING:file=${targetFile}|status=query_script_missing`;
  }
  
  let dependencies = [];
  let dependents = [];
  
  try {
    const rawOutput = execSync(
      `node "${queryScript}" deps "${targetFile}"`,
      {
        encoding: 'utf8',
        cwd: PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 10000
      }
    );
    
    let currentSection = null;
    rawOutput.split('\n').forEach(line => {
      if (line.includes('使用しているモジュール') || 
          line.includes('Modules used by this file')) {
        currentSection = 'deps';
        return;
      }
      if (line.includes('使用しているファイル') || 
          line.includes('Files using this module')) {
        currentSection = 'used';
        return;
      }
      
      const match = line.match(/^\s*-\s+(.+?)\s+\[(.+?)\]/);
      if (match) {
        const [, modulePath, importType] = match;
        if (currentSection === 'deps') {
          dependencies.push(`${modulePath}[${importType}]`);
        } else if (currentSection === 'used') {
          dependents.push(modulePath);
        }
      }
    });
    
    // Componentの場合、関連Systemを追加
    if (isComponent) {
      const relevantSystems = getRelevantSystemFiles(targetFile);
      const systemContexts = relevantSystems.map(file => 
        `game/systems/${file}[POTENTIAL_ECS_DEPENDENCY]`
      );
      dependencies = [...new Set([...dependencies, ...systemContexts])];
    }

    const compressed = [
      `DEPS:target=${targetFile}`,
      `imports=${dependencies.join(',')}`,
      `used_by=${dependents.join(',')}`
    ].join('|');
    
    const reduction = Math.round((1 - compressed.length / rawOutput.length) * 100);
    console.log(`📦 依存関係圧縮: ${rawOutput.length}文字 → ${compressed.length}文字 (${reduction}%削減)`);
    
    return compressed;
    
  } catch (e) {
    if (e.killed) return `DEPS_ERROR:file=${targetFile}|error=timeout`;
    if (e.code === 'ENOENT') return `DEPS_ERROR:file=${targetFile}|error=not found`;
    return `DEPS_ERROR:file=${targetFile}|error=${e.message.substring(0, 100)}`;
  }
}

// ===== テンプレート読み込み =====
function loadTemplate(templateName, variables = {}) {
  const templatePath = path.join(TEMPLATE_DIR, templateName);
  
  if (!fs.existsSync(templatePath)) {
    console.error(`\n❌ エラー: テンプレートが見つかりません: ${templatePath}\n`);
    process.exit(1);
  }
  
  try {
    let template = fs.readFileSync(templatePath, 'utf8');
    Object.entries(variables).forEach(([key, value]) => {
      template = template.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return template;
  } catch (e) {
    console.error(`\n❌ エラー: テンプレート読み込み失敗\n   ${e.message}\n`);
    process.exit(1);
  }
}

// ===== ソースコード読み込み =====
function loadSourceCode(targetFile) {
  const fullPath = path.join(PROJECT_ROOT, targetFile);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`\n❌ エラー: ファイルが見つかりません`);
    console.error(`   パス: ${targetFile}\n`);
    process.exit(1);
  }
  
  try {
    const sourceCode = fs.readFileSync(fullPath, 'utf8');
    const fileSize = fs.statSync(fullPath).size;
    const lineCount = sourceCode.split('\n').length;
    
    console.log(`📄 ソースコード読み込み完了`);
    console.log(`   ファイル: ${targetFile}`);
    console.log(`   サイズ: ${fileSize.toLocaleString()} バイト`);
    console.log(`   行数: ${lineCount.toLocaleString()} 行\n`);
    
    return sourceCode;
  } catch (e) {
    console.error(`\n❌ エラー: ソースコード読み込み失敗\n   ${e.message}\n`);
    process.exit(1);
  }
}

// ===== 🔥 v3.4改善: 関連Systemコードのみをロード（エラーハンドリング強化版） =====
function loadRelevantSystemSourceCodes(componentPath) {
  const relevantSystemFiles = getRelevantSystemFiles(componentPath);
  const systemSourceCodes = [];
  const failedFiles = [];
  let totalSystemSourceTokens = 0;

  console.log(`📚 関連Systemファイルのソースコードを読み込み中...\n`);

  for (const file of relevantSystemFiles) {
    const relativePath = path.join('game', 'systems', file);
    const fullPath = path.join(PROJECT_ROOT, relativePath);
    
    if (fs.existsSync(fullPath)) {
      try {
        const sourceCode = fs.readFileSync(fullPath, 'utf8');
        const language = detectLanguage(file);
        const sourceSection = `[SYSTEM CODE: ${relativePath}]
\`\`\`${language}
${sourceCode}
\`\`\``;
        systemSourceCodes.push(sourceSection);
        const tokens = estimateTokens(sourceSection);
        totalSystemSourceTokens += tokens;
        console.log(`   ✓ ${relativePath}: ${tokens.toLocaleString()} トークン`);
      } catch (e) {
        failedFiles.push({ file: relativePath, error: e.message });
        console.warn(`   ✗ ${relativePath}: 読み込み失敗 - ${e.message}`);
      }
    } else {
      failedFiles.push({ file: relativePath, error: 'ファイルが存在しません' });
      console.warn(`   ✗ ${relativePath}: ファイルが存在しません`);
    }
  }
  
  console.log(`\n   総Systemソースコードトークン: ${totalSystemSourceTokens.toLocaleString()} トークン`);
  
  // 読み込み失敗情報をプロンプトに含める
  if (failedFiles.length > 0) {
    const failedSection = `[SYSTEM LOAD ERRORS]
⚠️ 以下のSystemファイルは読み込みに失敗しました（分析に含まれていません）:
${failedFiles.map(f => `- ${f.file}: ${f.error}`).join('\n')}

注意: これらのSystemへの影響は分析できません。`;
    systemSourceCodes.push(failedSection);
    console.warn(`\n⚠️  警告: ${failedFiles.length}個のSystemファイルの読み込みに失敗しました`);
  }
  
  return { 
    systemSourceCodes, 
    totalSystemSourceTokens, 
    loadedCount: relevantSystemFiles.length - failedFiles.length,
    totalCount: relevantSystemFiles.length 
  };
}

// ===== ファイル拡張子から言語を判定 =====
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap = {
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala'
  };
  
  return languageMap[ext] || 'plaintext';
}

// ===== プロンプト生成 =====
function generatePrompt(phase, targetFile) {
  console.log(`\n🚀 プロンプト生成を開始 (Project_Cognize v3.4)`);
  console.log(`   フェーズ: ${phase}`);
  console.log(`   対象ファイル: ${targetFile}\n`);
  
  const isComponent = isComponentFile(targetFile);
  
  if (isComponent) {
    console.log(`✨ Componentファイルを検出しました`);
    console.log(`   → 関連Systemファイルのみを読み込みます（トークン最適化）\n`);
  }

  // 1. ポリシーを圧縮
  const compressedPolicy = compressPolicy(phase);
  const policyTokens = estimateTokens(compressedPolicy);
  
  // 2. 依存関係を圧縮
  const compressedDeps = compressDeps(targetFile, isComponent);
  const depsTokens = estimateTokens(compressedDeps);
  
  // 3. テンプレートから構築
  const systemPrompt = loadTemplate('system_prompt_template.txt', { phase });
  const instruction = loadTemplate('task_prompt_template.txt');
  
  console.log(`📄 テンプレート読み込み完了`);
  console.log(`   システムプロンプト: system_prompt_template.txt`);
  console.log(`   タスク指示: task_prompt_template.txt\n`);
  
  // 4. ソースコードを読み込み
  const sourceCode = loadSourceCode(targetFile);
  const language = detectLanguage(targetFile);
  
  const sourceSection = `[TARGET SOURCE CODE: ${targetFile}]
\`\`\`${language}
${sourceCode}
\`\`\``;

  // 5. 関連Systemコードを読み込み（Componentの場合のみ）
  let allSystemCodeSection = '';
  let totalSystemSourceTokens = 0;
  let systemLoadInfo = { loadedCount: 0, totalCount: 0 };
  
  if (isComponent) {
    const systemLoadResult = loadRelevantSystemSourceCodes(targetFile);
    allSystemCodeSection = `[RELATED SYSTEM CODES]
以下は、対象Componentに関連する可能性のあるSystemファイルです:

${systemLoadResult.systemSourceCodes.join('\n\n')}`;
    totalSystemSourceTokens = systemLoadResult.totalSystemSourceTokens;
    systemLoadInfo = {
      loadedCount: systemLoadResult.loadedCount,
      totalCount: systemLoadResult.totalCount
    };
  } else {
    allSystemCodeSection = `[RELATED SYSTEM CODES]
対象がComponentではないため、System依存関係の分析は省略されました。`;
  }
  
  // 6. 完全なプロンプトを構築
  const fullPrompt = `${systemPrompt}

[POLICY]
${compressedPolicy}

[CONTEXT]
${compressedDeps}

${sourceSection}

${allSystemCodeSection}

${instruction}`;

  // 7. トークン推定
  const systemTokens = estimateTokens(systemPrompt);
  const instructionTokens = estimateTokens(instruction);
  const sourceTokens = estimateTokens(sourceSection);
  const systemCodeTokens = estimateTokens(allSystemCodeSection);
  const totalTokens = systemTokens + policyTokens + depsTokens + sourceTokens + systemCodeTokens + instructionTokens;
  
  console.log(`\n📊 トークン推定結果（Qwen実測ベース）:`);
  console.log(`   システムプロンプト: ${systemTokens.toLocaleString()}`);
  console.log(`   ポリシー: ${policyTokens.toLocaleString()}`);
  console.log(`   依存関係: ${depsTokens.toLocaleString()}`);
  console.log(`   対象ファイルソースコード: ${sourceTokens.toLocaleString()}`);
  if (isComponent) {
    console.log(`   関連Systemソースコード: ${systemCodeTokens.toLocaleString()} (${systemLoadInfo.loadedCount}/${systemLoadInfo.totalCount}ファイル)`);
  }
  console.log(`   指示: ${instructionTokens.toLocaleString()}`);
  console.log(`   ────────────────────────────`);
  console.log(`   合計: ${totalTokens.toLocaleString()} トークン`);
  console.log(`   Qwen入力上限: ${QWEN_INPUT_LIMIT.toLocaleString()} トークン`);
  
  const margin = QWEN_INPUT_LIMIT - totalTokens;
  const marginPercent = Math.round((margin / QWEN_INPUT_LIMIT) * 100);
  console.log(`   余裕: ${margin.toLocaleString()} トークン (${marginPercent}%)\n`);
  
  // 8. 制限チェック
  if (totalTokens > QWEN_INPUT_LIMIT) {
    console.error(`❌ エラー: Qwen入力上限（${QWEN_INPUT_LIMIT}）を超過しています`);
    console.error(`   現在: ${totalTokens} トークン`);
    console.error(`   超過: ${totalTokens - QWEN_INPUT_LIMIT} トークン`);
    console.error(`\n💡 内訳:`);
    console.error(`   対象ファイル: ${sourceTokens} (${Math.round(sourceTokens/totalTokens*100)}%)`);
    if (isComponent) {
      console.error(`   関連System: ${systemCodeTokens} (${Math.round(systemCodeTokens/totalTokens*100)}%)`);
    }
    console.error(`\n👉 対処法（優先度順）:`);
    console.error(`   1. 対象ファイルを小さい単位に分割`);
    if (isComponent) {
      console.error(`   2. Systemファイルのサイズを削減（現在: ${systemLoadInfo.loadedCount}ファイル）`);
    }
    console.error(`   3. 関数単位でリファクタリング\n`);
    process.exit(1);
  }
  
  if (totalTokens > QWEN_SAFE_LIMIT) {
    console.warn(`⚠️  警告: 安全上限（${QWEN_SAFE_LIMIT}）を超えています`);
    console.warn(`   現在: ${totalTokens} トークン`);
    console.warn(`   推奨: より小さい単位でリファクタリングを実施\n`);
  } else if (totalTokens > QWEN_WARNING_THRESHOLD) {
    console.warn(`⚠️  注意: 警告閾値（${QWEN_WARNING_THRESHOLD}）を超えています`);
    console.warn(`   現在: ${totalTokens} トークン\n`);
  } else {
    console.log(`✅ トークン数は安全範囲内です\n`);
  }
  
  // 9. ファイル出力
  fs.writeFileSync(OUTPUT_FILE, fullPrompt);
  
  console.log(`✨ プロンプトを生成しました`);
  console.log(`   出力先: ${OUTPUT_FILE}`);
  console.log(`   ファイルサイズ: ${fs.statSync(OUTPUT_FILE).size.toLocaleString()} バイト\n`);
  console.log(`📋 次の手順:`);
  console.log(`   1. cat ${OUTPUT_FILE}`);
  console.log(`   2. Qwenにコピー＆ペースト`);
  console.log(`   3. レスポンスがJSON形式か検証\n`);
  console.log(`🔍 プロンプトに含まれる内容:`);
  console.log(`   対象ソースコード: ${sourceCode.split('\n').length}行 (${language})`);
  if (isComponent) {
    console.log(`   関連Systemコード: ${systemLoadInfo.loadedCount}/${systemLoadInfo.totalCount}ファイル`);
  }
  console.log('');
}

// ===== CLI処理 =====
const [phase, targetFile] = process.argv.slice(2);

if (!phase || !targetFile) {
  console.log(`
Project_Cognize プロンプト自動生成ツール v3.4 - Optimized Edition

🔥 改善点（v3.3 → v3.4）:
  ✅ スマートフィルタリング: Componentを実際に使用しているSystemのみをロード
     → トークン数を平均70%削減
  ✅ エラーハンドリング強化: System読み込み失敗時もAIに通知
  ✅ スコープエラー修正: systemFiles変数の参照問題を解決
  ✅ Component判定の堅牢化: Windows環境とサブディレクトリに対応
  ✅ プロンプト構造の改善: セクション名を明確化

使用方法:
  node Project_Cognize/scripts/generate_prompt_v3.4_optimized.js <phase> <target_file>

例:
  # Componentのリファクタリング（関連Systemのみをロード）
  node Project_Cognize/scripts/generate_prompt_v3.4_optimized.js refactor game/components/Position.ts
  
  # Systemのリファクタリング（System依存分析は省略）
  node Project_Cognize/scripts/generate_prompt_v3.4_optimized.js refactor game/systems/CollisionSystem.js

トークン最適化の仕組み:
  - Position.tsを変更 → MovementSystem, CollisionSystem, RenderSystemのみロード
  - Health.tsを変更 → DamageSystem, DeathSystemのみロード
  - 従来の全Systemロード方式と比べて平均70%のトークン削減

制約事項:
  - Qwenの入力上限: ${QWEN_INPUT_LIMIT.toLocaleString()} トークン
  - 大きなファイル（300行以上）は分割を推奨
  - Componentファイルの検出: game/components/ 配下を自動認識

設計思想:
  ECSアーキテクチャにおける「必要最小限の情報」をAIに提供することで、
  トークン効率と分析精度を両立させる。
  `);
  process.exit(0);
}

// メイン処理実行
try {
  generatePrompt(phase, targetFile);
} catch (e) {
  console.error(`\n❌ 予期しないエラーが発生しました:`);
  console.error(`   ${e.message}\n`);
  console.error(`スタックトレース:`);
  console.error(e.stack);
  console.error(`\n👉 対処法:`);
  console.error(`   1. 対象ファイルのパスを確認`);
  console.error(`   2. game/components/ および game/systems/ の存在を確認`);
  console.error(`   3. ファイルの読み取り権限を確認\n`);
  process.exit(1);
}