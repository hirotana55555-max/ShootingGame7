#!/bin/bash
# quick_start.sh - 非エンジニア向け完全自動化コマンド（修正版）

# 現在のディレクトリを基準にパスを解決
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

echo "🚀 ShootingGame7 AI依存開発環境を起動します..."
echo ""
echo "✅ 起動されるシステム:"
echo "   1. Project_Cognize (ポート3000) - コード分析DB"
echo "   2. DynamicErrorMonitor (ポート3002) - エラー監視"
echo "   3. ProjectScanner (自動5分間隔) - 開発状況スキャン"
echo "   4. AIワークフローダッシュボード - 状態可視化"
echo ""
echo "🌐 ブラウザで確認:"
echo "   開発環境: http://localhost:3000"
echo "   ダッシュボード: http://localhost:8000/automation/dashboard.html"
echo ""
echo "🤖 自動化機能:"
echo "   - 5分ごとに開発状況を自動スキャン"
echo "   - LLM向けプロンプトを自動生成"
echo "   - 破壊的変更のない安全な分析"
echo ""
echo "🛑 停止方法: Ctrl+C (全システムを安全に停止)"
echo ""

# バックグラウンドでProjectScannerの自動実行を開始
mkdir -p "$BASE_DIR/automation"
cd "$BASE_DIR/automation"
nohup ./auto_scanner.sh > scanner_background.log 2>&1 &
SCANNER_PID=$!

# バックグラウンドで簡易HTTPサーバーを起動（ダッシュボード用）
nohup python3 -m http.server 8000 --directory "$BASE_DIR/automation" > http_server.log 2>&1 &
HTTP_PID=$!

# 本体システムを起動
cd "$BASE_DIR"
./scripts/start_all_systems.sh

# 停止時にバックグラウンドプロセスも停止
trap "kill $SCANNER_PID $HTTP_PID 2>/dev/null; pkill -f \"node src/collector/index.js\"; pkill -f \"next dev\"" EXIT
