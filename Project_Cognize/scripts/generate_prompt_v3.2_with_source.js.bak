#!/usr/bin/env node
/**
 * Project_Cognize プロンプト自動生成ツール v3.2 - With Source Code
 * 
 * 変更点（v3.1 → v3.2）:
 *  ✅ ソースコード読み込み機能を追加
 *  ✅ [SOURCE CODE]セクションをプロンプトに統合
 *  ✅ ソースコードのトークン数を合計に加算
 *  ✅ ファイル拡張子に応じた言語判定
 * 
 * 使い方:
 *   node Project_Cognize/scripts/generate_prompt_v3.2_with_source.js refactor game/systems/CollisionSystem.js
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

// Qwen制限（公式値）
const QWEN_INPUT_LIMIT = 32768;
const QWEN_SAFE_LIMIT = 30000;
const QWEN_WARNING_THRESHOLD = 25000;

// ===== トークン推定（Qwen実測に基づく精密版） =====
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

// ===== ポリシー読み込み＆圧縮 =====
function compressPolicy(phase) {
  const policyFile = path.join(POLICY_DIR, `${phase}_policy.json`);
  
  if (!fs.existsSync(policyFile)) {
    console.error(`\n❌ エラー: ポリシーファイルが見つかりません`);
    console.error(`   パス: ${policyFile}`);
    
    const availablePolicies = fs.readdirSync(POLICY_DIR)
      .filter(f => f.endsWith('_policy.json'))
      .map(f => `   - ${f.replace('_policy.json', '')}`);
    
    console.error(`\n📋 利用可能なポリシー:`);
    if (availablePolicies.length > 0) {
      console.error(availablePolicies.join('\n'));
    } else {
      console.error('   （ポリシーファイルが見つかりません）');
    }
    
    console.error(`\n👉 対処法:`);
    console.error(`   1. refactor用: Project_Cognize/refactor_policy.json を確認`);
    console.error(`   2. 別フェーズ用: Project_Cognize/${phase}_policy.json を作成\n`);
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
    console.error(`\n❌ エラー: ポリシーファイルの解析に失敗`);
    console.error(`   ${e.message}\n`);
    process.exit(1);
  }
}

// ===== 依存関係取得＆圧縮 =====
function compressDeps(targetFile) {
  const queryScript = path.join(SCRIPT_DIR, 'query_index.js');
  
  if (!fs.existsSync(queryScript)) {
    console.warn(`⚠️  警告: query_index.jsが見つかりません`);
    console.warn(`   パス: ${queryScript}`);
    return `DEPS_WARNING:file=${targetFile}|status=query_script_missing`;
  }
  
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
    
    const dependencies = [];
    const dependents = [];
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
    
    const compressed = [
      `DEPS:target=${targetFile}`,
      `imports=${dependencies.join(',')}`,
      `used_by=${dependents.join(',')}`
    ].join('|');
    
    const reduction = Math.round((1 - compressed.length / rawOutput.length) * 100);
    console.log(`📦 依存関係圧縮: ${rawOutput.length}文字 → ${compressed.length}文字 (${reduction}%削減)`);
    
    return compressed;
    
  } catch (e) {
    if (e.killed) {
      return `DEPS_ERROR:file=${targetFile}|error=timeout after 10s`;
    }
    if (e.code === 'ENOENT') {
      return `DEPS_ERROR:file=${targetFile}|error=target file not found`;
    }
    
    const errorMsg = e.message.split('\n')[0].substring(0, 100);
    return `DEPS_ERROR:file=${targetFile}|error=${errorMsg}`;
  }
}

// ===== テンプレート読み込み =====
function loadTemplate(templateName, variables = {}) {
  const templatePath = path.join(TEMPLATE_DIR, templateName);
  
  if (!fs.existsSync(templatePath)) {
    console.error(`\n❌ エラー: テンプレートファイルが見つかりません`);
    console.error(`   パス: ${templatePath}`);
    console.error(`\n📋 必要なテンプレート:`);
    console.error(`   - system_prompt_template.txt`);
    console.error(`   - task_prompt_template.txt\n`);
    process.exit(1);
  }
  
  try {
    let template = fs.readFileSync(templatePath, 'utf8');
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      template = template.replace(placeholder, value);
    });
    
    return template;
  } catch (e) {
    console.error(`\n❌ エラー: テンプレートファイルの読み込みに失敗`);
    console.error(`   ${e.message}\n`);
    process.exit(1);
  }
}

// ===== 🔥 新機能: ソースコード読み込み =====
function loadSourceCode(targetFile) {
  const fullPath = path.join(PROJECT_ROOT, targetFile);
  
  // ファイルの存在確認
  if (!fs.existsSync(fullPath)) {
    console.error(`\n❌ エラー: 対象ファイルが見つかりません`);
    console.error(`   指定されたパス: ${targetFile}`);
    console.error(`   絶対パス: ${fullPath}`);
    console.error(`\n👉 対処法:`);
    console.error(`   1. ファイルパスを確認してください`);
    console.error(`   2. プロジェクトルートからの相対パスで指定してください`);
    console.error(`   3. 例: game/systems/CollisionSystem.js\n`);
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
    console.error(`\n❌ エラー: ソースコードの読み込みに失敗`);
    console.error(`   ${e.message}`);
    console.error(`\n👉 対処法:`);
    console.error(`   1. ファイルの読み取り権限を確認`);
    console.error(`   2. ファイルが破損していないか確認\n`);
    process.exit(1);
  }
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
  console.log(`\n🚀 プロンプト生成を開始`);
  console.log(`   フェーズ: ${phase}`);
  console.log(`   対象ファイル: ${targetFile}\n`);
  
  // 1. ポリシーを圧縮
  const compressedPolicy = compressPolicy(phase);
  const policyTokens = estimateTokens(compressedPolicy);
  
  // 2. 依存関係を圧縮
  const compressedDeps = compressDeps(targetFile);
  const depsTokens = estimateTokens(compressedDeps);
  
  // 3. テンプレートから構築
  const systemPrompt = loadTemplate('system_prompt_template.txt', { phase });
  const instruction = loadTemplate('task_prompt_template.txt');
  
  console.log(`📄 テンプレート読み込み完了`);
  console.log(`   システムプロンプト: system_prompt_template.txt`);
  console.log(`   タスク指示: task_prompt_template.txt\n`);
  
  // 4. 🔥 ソースコードを読み込み
  const sourceCode = loadSourceCode(targetFile);
  const language = detectLanguage(targetFile);
  
  // ソースコードセクションを構築（Markdownコードブロック）
  const sourceSection = `[SOURCE CODE: ${targetFile}]
\`\`\`${language}
${sourceCode}
\`\`\``;
  
  // 5. 完全なプロンプトを構築（ソースコードを追加）
  const fullPrompt = `${systemPrompt}

[POLICY]
${compressedPolicy}

[CONTEXT]
${compressedDeps}

${sourceSection}

${instruction}`;

  // 6. トークン推定（ソースコードを含む）
  const systemTokens = estimateTokens(systemPrompt);
  const instructionTokens = estimateTokens(instruction);
  const sourceTokens = estimateTokens(sourceSection);
  const totalTokens = systemTokens + policyTokens + depsTokens + sourceTokens + instructionTokens;
  
  console.log(`📊 トークン推定結果（Qwen実測ベース）:`);
  console.log(`   システムプロンプト: ${systemTokens.toLocaleString()}`);
  console.log(`   ポリシー: ${policyTokens.toLocaleString()}`);
  console.log(`   依存関係: ${depsTokens.toLocaleString()}`);
  console.log(`   ソースコード: ${sourceTokens.toLocaleString()} 🔥 NEW`);
  console.log(`   指示: ${instructionTokens.toLocaleString()}`);
  console.log(`   ────────────────────────────`);
  console.log(`   合計: ${totalTokens.toLocaleString()} トークン`);
  console.log(`   Qwen入力上限: ${QWEN_INPUT_LIMIT.toLocaleString()} トークン`);
  
  const margin = QWEN_INPUT_LIMIT - totalTokens;
  const marginPercent = Math.round((margin / QWEN_INPUT_LIMIT) * 100);
  console.log(`   余裕: ${margin.toLocaleString()} トークン (${marginPercent}%)\n`);
  
  // 7. 制限チェック
  if (totalTokens > QWEN_INPUT_LIMIT) {
    console.error(`❌ エラー: Qwen入力上限（${QWEN_INPUT_LIMIT}）を超過しています`);
    console.error(`   現在: ${totalTokens} トークン`);
    console.error(`   超過: ${totalTokens - QWEN_INPUT_LIMIT} トークン`);
    console.error(`\n💡 ソースコードのトークン数: ${sourceTokens} (${Math.round(sourceTokens/totalTokens*100)}%)`);
    console.error(`\n👉 対処法（優先度順）:`);
    console.error(`   1. 対象ファイルを小さい単位に分割`);
    console.error(`   2. 関数単位でリファクタリング（ファイル全体ではなく）`);
    console.error(`   3. テンプレートファイルを簡略化\n`);
    process.exit(1);
  }
  
  if (totalTokens > QWEN_SAFE_LIMIT) {
    console.warn(`⚠️  警告: 安全上限（${QWEN_SAFE_LIMIT}）を超えています`);
    console.warn(`   現在: ${totalTokens} トークン`);
    console.warn(`   推奨: より小さい単位でリファクタリングを実施してください\n`);
  } else if (totalTokens > QWEN_WARNING_THRESHOLD) {
    console.warn(`⚠️  注意: 警告閾値（${QWEN_WARNING_THRESHOLD}）を超えています`);
    console.warn(`   現在: ${totalTokens} トークン`);
    console.warn(`   Qwenのレスポンスが長い場合、出力が切れる可能性があります\n`);
  } else {
    console.log(`✅ トークン数は安全範囲内です\n`);
  }
  
  // 8. ファイル出力
  fs.writeFileSync(OUTPUT_FILE, fullPrompt);
  
  console.log(`✨ プロンプトを生成しました`);
  console.log(`   出力先: ${OUTPUT_FILE}`);
  console.log(`   ファイルサイズ: ${fs.statSync(OUTPUT_FILE).size.toLocaleString()} バイト\n`);
  console.log(`📋 次の手順:`);
  console.log(`   1. ファイル内容を確認:`);
  console.log(`      cat ${OUTPUT_FILE}`);
  console.log(`   2. Qwenにコピー＆ペースト`);
  console.log(`   3. レスポンスがJSON形式か検証`);
  console.log(`   4. suggested_changesが具体的か確認\n`);
  console.log(`🔍 ソースコードがプロンプトに含まれています:`);
  console.log(`   言語: ${language}`);
  console.log(`   行数: ${sourceCode.split('\n').length} 行\n`);
}

// ===== CLI処理 =====
const [phase, targetFile] = process.argv.slice(2);

if (!phase || !targetFile) {
  console.log(`
Project_Cognize プロンプト自動生成ツール v3.2 - With Source Code

🔥 新機能（v3.1 → v3.2）:
  ✅ ソースコード本体をプロンプトに統合
  ✅ ファイル拡張子から言語を自動判定
  ✅ トークン推定にソースコードを含める
  ✅ Markdownコードブロックで読みやすく整形

使用方法:
  node Project_Cognize/scripts/generate_prompt_v3.2_with_source.js <phase> <target_file>

例:
  # リファクタリングフェーズ
  node Project_Cognize/scripts/generate_prompt_v3.2_with_source.js refactor game/systems/CollisionSystem.js
  
  # 実装フェーズ
  node Project_Cognize/scripts/generate_prompt_v3.2_with_source.js implement game/core/World.js

対応言語:
  JavaScript (.js), TypeScript (.ts), JSX (.jsx), TSX (.tsx)
  Python (.py), Java (.java), C++ (.cpp), Go (.go), Rust (.rs)
  その他多数（自動判定）

制約事項:
  - Qwenの入力上限: ${QWEN_INPUT_LIMIT.toLocaleString()} トークン
  - 大きなファイル（300行以上）は分割を推奨
  - ソースコードがトークンの大部分を占めます

設計思想:
  AIにコードを「見せる」ことで、具体的で実用的な提案を引き出す
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
  console.error(`   2. ファイルの読み取り権限を確認`);
  console.error(`   3. テンプレートファイルの存在を確認\n`);
  process.exit(1);
}