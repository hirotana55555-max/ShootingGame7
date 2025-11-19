#!/bin/bash
# start_monitor_and_project.sh
# DynamicErrorMonitor + Project_Cognize 起動・テスト用（ポート最適化版）

set -e

BASE_DIR=~/development/shooting_game/ShootingGame7

echo "1️⃣ Collector 環境変数読み込み"
set -a
source $BASE_DIR/DynamicErrorMonitor/.env
set +a

echo "2️⃣ Collector ディレクトリ移動"
cd $BASE_DIR/DynamicErrorMonitor

# Collector main スクリプト確認
if [ -f src/collector/index.js ]; then
  COLLECTOR_MAIN=src/collector/index.js
elif [ -f index.js ]; then
  COLLECTOR_MAIN=index.js
else
  echo "❌ Collector main script not found"
  exit 1
fi
echo "Collector main script: $COLLECTOR_MAIN"

# 既存プロセスがポート 3002 を使っていたら終了
if lsof -i :3002 &>/dev/null; then
  OLD_PID=$(lsof -ti :3002)
  echo "⚠️ Port 3002 is in use. Killing PID $OLD_PID"
  kill -9 $OLD_PID
  sleep 1
fi

echo "3️⃣ Collector 起動 (バックグラウンド)"
node $COLLECTOR_MAIN & 
COLLECTOR_PID=$!
echo "Collector PID: $COLLECTOR_PID"
sleep 3

echo "4️⃣ Project_Cognize ディレクトリ移動"
cd $BASE_DIR/Project_Cognize

# 【最適化】Next.jsはデフォルトで3000ポートを使用
export PORT=3000

# 既存プロセスがポート 3000 を使っていたら終了
if lsof -i :3000 &>/dev/null; then
  OLD_PID=$(lsof -ti :3000)
  echo "⚠️ Port 3000 is in use. Killing PID $OLD_PID"
  kill -9 $OLD_PID
  sleep 1
fi

# Next.js lock ファイルの完全削除
if [ -d ".next" ]; then
  echo "🔧 Next.js lock files cleanup"
  rm -rf .next/*
fi

echo "5️⃣ Project_Cognize 起動 (バックグラウンド)"
npm run dev & 
PROJECT_PID=$!
echo "Project_Cognize PID: $PROJECT_PID"
sleep 5

echo "6️⃣ テストイベント送信"
curl -X POST http://localhost:3002/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"test_event","payload":{"msg":"hello from Project_Cognize"}}' \
  --max-time 5

echo "7️⃣ Collector DB 最新 10 件確認"
sqlite3 $BASE_DIR/DynamicErrorMonitor/database/errors.db "SELECT * FROM errors LIMIT 10;"

echo "✅ スクリプト完了"
echo "Collector PID: $COLLECTOR_PID"
echo "Project_Cognize PID: $PROJECT_PID"