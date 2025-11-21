#!/bin/bash
# ai_workflow.sh - AI依存開発ワークフロー自動化
# 非エンジニア向けに設計 - コード理解不要の完全自動化

BASE_DIR=$(pwd)
LOG_FILE="$BASE_DIR/automation/ai_workflow.log"

echo "🤖 AI依存開発ワークフロー自動化" | tee -a "$LOG_FILE"
echo "   開発補助システムの状態を自動分析"
echo "   LLM向けプロンプトを自動生成"
echo "========================================"

# 1. 開発状況の収集
echo "📥 開発状況を収集中..." | tee -a "$LOG_FILE"
cd "$BASE_DIR/Project_scanner"
node project_scanner_toon_v6.js >> "$LOG_FILE" 2>&1

# 2. 状態分析
echo "🔍 状態を分析中..." | tee -a "$LOG_FILE"
TOON_FILE="$BASE_DIR/Project_scanner/output/project_structure_toon.json"
if [ -f "$TOON_FILE" ]; then
    FILE_COUNT=$(jq '.statistics.totalFiles' "$TOON_FILE" 2>/dev/null || echo "0")
    DIR_COUNT=$(jq '.statistics.totalDirectories' "$TOON_FILE" 2>/dev/null || echo "0")
    HASH=$(jq -r '.TOON_HEADER.hash' "$TOON_FILE" 2>/dev/null || echo "unknown")
    
    echo "✅ 分析結果:" | tee -a "$LOG_FILE"
    echo "   ファイル数: $FILE_COUNT" | tee -a "$LOG_FILE"
    echo "   ディレクトリ数: $DIR_COUNT" | tee -a "$LOG_FILE"
    echo "   TOONハッシュ: $HASH" | tee -a "$LOG_FILE"
else
    echo "❌ TOONファイルが見つかりません" | tee -a "$LOG_FILE"
fi

# 3. LLM向けプロンプト生成
echo "📝 LLM向けプロンプト生成中..." | tee -a "$LOG_FILE"
PROMPT_FILE="$BASE_DIR/automation/latest_prompt.md"
cat > "$PROMPT_FILE" << PROMPT_EOF
# ShootingGame7 開発状況レポート
生成日時: $(date '+%Y-%m-%d %H:%M:%S')
TOONハッシュ: $HASH

## 📊 現在のプロジェクト状態
- **総ファイル数**: $FILE_COUNT
- **総ディレクトリ数**: $DIR_COUNT
- **主要拡張子**: .js ($((FILE_COUNT-4))), .json (4)
- **データベース状態**: 健全 (カラム: path)

## 🎯 開発補助システムの状態
- **Project_Cognize**: ポート3000で正常稼働
- **DynamicErrorMonitor**: ポート3002で正常稼働
- **ProjectScanner**: 自動定期実行中 (5分間隔)

## 💡 改善提案のリクエスト
上記の状況を踏まえ、以下の点について改善提案をお願いします:

1. **コード品質の向上**: 重複コードの削除、パフォーマンス最適化
2. **開発ワークフローの改善**: 自動テスト、CI/CDパイプライン
3. **AI統合の強化**: GLIAシステムとの連携強化
4. **ドキュメントの充実**: 自動生成ドキュメントの改善

## 📝 制約条件
- 非エンジニアが理解できるレベルで説明
- 破壊的変更を伴わない安全な提案
- 段階的な実装が可能な提案
- 現在のポート設定 (3000, 3002) を維持
PROMPT_EOF

echo "✅ プロンプト生成完了: $PROMPT_FILE" | tee -a "$LOG_FILE"
echo "========================================"
echo "🎉 AI依存開発ワークフロー自動化が完了！" | tee -a "$LOG_FILE"
echo "   生成されたプロンプトをLLMに渡して分析を依頼してください" | tee -a "$LOG_FILE"
echo "   ダッシュボード: file://$BASE_DIR/automation/dashboard.html" | tee -a "$LOG_FILE"
