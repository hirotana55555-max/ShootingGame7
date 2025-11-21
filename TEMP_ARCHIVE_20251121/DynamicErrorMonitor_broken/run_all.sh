#!/bin/bash
# run_all.sh
# ShootingGame7 + Collector + Project_Cognize 起動用ワンコマンドスクリプト

set -e

BASE_DIR=~/development/shooting_game/ShootingGame7
COLLECTOR_DIR=$BASE_DIR/DynamicErrorMonitor
PROJECT_DIR=$BASE_DIR/Project_Cognize

echo "1️⃣ 既存プロセス停止とロック解除"
# Next.js / Collector / Project_Cognize のプロセスを全て終了
pkill -f "next dev" || true
pkill -f "node $COLLECTOR_DIR/src/collector/index.js" || true
rm -f $BASE_DIR/.next/dev/lock || true

sleep 1

echo "2️⃣ Collector 環境変数読み込み"
set -a
source $COLLECTOR_DIR/.env
set +a

echo "3️⃣ Collector 起動 (バックグラウンド)"
cd $COLLECTOR_DIR
COLLECTOR_MAIN=src/collector/index.js
node $COLLECTOR_MAIN &
COLLECTOR_PID=$!
echo "[Collector] PID: $COLLECTOR_PID"

sleep 3

echo "4️⃣ Project_Cognize 起動 (安全ポート 3003)"
cd $PROJECT_DIR
export PORT=3003
npm run dev &
PROJECT_PID=$!
echo "[Project_Cognize] PID: $PROJECT_PID"

sleep 5

echo "5️⃣ テストイベント送信"
curl -s -X POST http://localhost:3002/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"test_event","payload":{"msg":"hello from unified run script"}}' \
  || echo "[Warning] テストイベント送信に失敗しました"

echo "6️⃣ Collector DB 最新 10 件確認"
sqlite3 $COLLECTOR_DIR/database/errors.db "SELECT * FROM errors LIMIT 10;"

echo "✅ 完了"
echo "Collector PID: $COLLECTOR_PID"
echo "Project_Cognize PID: $PROJECT_PID"
