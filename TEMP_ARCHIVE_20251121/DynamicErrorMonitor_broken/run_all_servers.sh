#!/bin/bash
# run_all_servers.sh
# ShootingGame7 + Collector + Project_Cognize の同時起動 + 自動ブラウザ表示
# ポート競合・残プロセス・ロックファイル対策済み

set -e

BASE_DIR=~/development/shooting_game/ShootingGame7

echo "1️⃣ 既存プロセス停止とロック解除"

# Collector (3002) プロセス停止
COLLECTOR_PIDS=$(lsof -ti:3002 || true)
if [ -n "$COLLECTOR_PIDS" ]; then
  kill -9 $COLLECTOR_PIDS
  echo "[Collector] PID $COLLECTOR_PIDS killed"
fi

# Project_Cognize (3003) プロセス停止
PROJECT_PIDS=$(lsof -ti:3003 || true)
if [ -n "$PROJECT_PIDS" ]; then
  kill -9 $PROJECT_PIDS
  echo "[Project_Cognize] PID $PROJECT_PIDS killed"
fi

# ShootingGame7 (3000) プロセス停止
GAME_PIDS=$(lsof -ti:3000 || true)
if [ -n "$GAME_PIDS" ]; then
  kill -9 $GAME_PIDS
  echo "[ShootingGame7] PID $GAME_PIDS killed"
fi

# Next.js ロックファイル削除
rm -f $BASE_DIR/.next/dev/lock
echo "[Next.js] Lock file removed"

echo "2️⃣ Collector 環境変数読み込み + 起動"
cd $BASE_DIR/DynamicErrorMonitor
set -a
source $BASE_DIR/DynamicErrorMonitor/.env
set +a

# Collector main script確認
if [ -f src/collector/index.js ]; then
  COLLECTOR_MAIN=src/collector/index.js
else
  echo "❌ Collector main script not found"
  exit 1
fi
echo "[Collector] Main script: $COLLECTOR_MAIN"

# Collector 起動
node $COLLECTOR_MAIN &
COLLECTOR_PID=$!
echo "[Collector] PID: $COLLECTOR_PID, ポート: 3002"
sleep 3

echo "3️⃣ Project_Cognize 起動"
cd $BASE_DIR/Project_Cognize
export PORT=3003
npm run dev &
PROJECT_PID=$!
echo "[Project_Cognize] PID: $PROJECT_PID, ポート: 3003"
sleep 5

echo "4️⃣ ShootingGame7 起動"
cd $BASE_DIR
export PORT=3000
npm run dev &
GAME_PID=$!
echo "[ShootingGame7] PID: $GAME_PID, ポート: 3000"
sleep 5

echo "5️⃣ テストイベント送信 (Collector /api/events)"
curl -s -X POST http://localhost:3002/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"test_event","payload":{"msg":"hello from full auto script"}}' \
  && echo "✅ イベント送信完了"

echo "6️⃣ Collector DB 最新 10 件確認"
sqlite3 $BASE_DIR/DynamicErrorMonitor/database/errors.db "SELECT * FROM errors ORDER BY id DESC LIMIT 10;"

echo "7️⃣ ブラウザでアクセス自動オープン"
# Linuxの場合 xdg-open、macOSの場合 open
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open http://localhost:3000
elif command -v open >/dev/null 2>&1; then
  open http://localhost:3000
fi

echo "✅ 全サーバ起動完了"
echo "Collector PID: $COLLECTOR_PID"
echo "Project_Cognize PID: $PROJECT_PID"
echo "ShootingGame7 PID: $GAME_PID"
