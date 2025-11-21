#!/bin/bash
# start_all_systems.sh - 3システム統合起動スクリプト
# Project_Cognize (3000) + DynamicErrorMonitor (3002) + ProjectScanner
# 非エンジニア向けに設計 - 単一コマンドで全システム起動

set -e
BASE_DIR=$(pwd)

echo "🚀 ShootingGame7 開発補助システム起動"
echo "   Project_Cognize: ポート3000"
echo "   DynamicErrorMonitor: ポート3002"
echo "   ProjectScanner: 定期実行"
echo "========================================"

# 1. 既存プロセスの安全な停止
echo "🔄 既存プロセスの停止..."
pkill -f "node src/collector/index.js" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "project_scanner_toon_v6.js" 2>/dev/null || true
sleep 3

# 2. Project_Cognizeの起動（ポート3000）
echo "🎮 Project_Cognize 起動中 (ポート3000)..."
cd "$BASE_DIR/Project_Cognize"
PORT=3000 npm run dev &
PROJECT_PID=$!
echo "   PID: $PROJECT_PID"
sleep 8

# 3. DynamicErrorMonitorの起動（ポート3002）
echo "🔍 DynamicErrorMonitor 起動中 (ポート3002)..."
cd "$BASE_DIR/DynamicErrorMonitor"
node src/collector/index.js &
COLLECTOR_PID=$!
echo "   PID: $COLLECTOR_PID"
sleep 5

# 4. ProjectScannerの初期実行
echo "📊 ProjectScanner 初回実行..."
cd "$BASE_DIR/Project_scanner"
node project_scanner_toon_v6.js
echo "   初回スキャン完了"

# 5. 状態確認
echo "========================================"
echo "✅ 全システム起動完了"
echo ""
echo "🌐 アクセス先:"
echo "   Project_Cognize: http://localhost:3000"
echo "   DEM API: http://localhost:3002/api/events"
echo "   ProjectScanner出力: $BASE_DIR/Project_scanner/output/"
echo ""
echo "🔧 操作コマンド:"
echo "   全システム停止: Ctrl+C"
echo "   ProjectScanner再実行: cd Project_scanner && node project_scanner_toon_v6.js"
echo ""
echo "💡 ヒント: このスクリプトはバックグラウンドで実行されます"
echo "   別タブで操作を続けることができます"
echo "========================================"

# 6. バックグラウンドプロセスの維持
wait
