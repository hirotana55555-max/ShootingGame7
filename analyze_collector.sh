#!/bin/bash
echo "🚀 Collector分析を開始..."
cd /home/hiro/development/shooting_game/ShootingGame7

# 1. 地図作成
echo "🗺  コードの地図を作成中..."
node Project_Cognize/scripts/indexer_v1.3.js --full-scan

# 2. プロンプト生成
echo "💬 LLM向け質問を生成中..."
cd Project_Cognize
npm run build >/dev/null 2>&1 || true  # エラーを無視
node dist/scripts/generate_prompt_v3.7.js \
  --target "DynamicErrorMonitor/src/collector/index.js" \
  --output "workspace/outputs/collector_prompt.json"

# 3. 結果表示
echo "✅ 分析完了！結果を表示:"
cat workspace/outputs/collector_prompt.json
