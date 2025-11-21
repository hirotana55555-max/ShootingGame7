#!/bin/bash
# restart_shooting_game.sh
# 残っている Next.js 開発サーバーを停止してロック解除後、再起動

set -e

BASE_DIR=~/development/shooting_game/ShootingGame7

echo "1️⃣ 残っている Next.js プロセスを停止"
NEXT_PIDS=$(ps aux | grep '[n]ext dev\|next-server' | awk '{print $2}')
if [ -n "$NEXT_PIDS" ]; then
  echo "Stopping PIDs: $NEXT_PIDS"
  kill -9 $NEXT_PIDS
else
  echo "Next.js プロセスは残っていません"
fi

echo "2️⃣ ロックファイル削除"
rm -f $BASE_DIR/.next/dev/lock || true

echo "3️⃣ 開発サーバー起動"
cd $BASE_DIR
npm run dev
