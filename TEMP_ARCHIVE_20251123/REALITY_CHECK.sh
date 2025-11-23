#!/bin/bash
echo "🚀 現実チェックを実行 (2025-11-20)"
echo "--------------------------------"

# Collectorの状態
echo "🔍 Collectorの状態:"
if curl -s http://localhost:3002 > /dev/null 2>&1; then
  echo "✅ ポート3002で応答"
  curl -s http://localhost:3002/api/health || echo "⚠️ /api/health が存在しない (物理バックアップ版)"
else
  echo "❌ Collectorが起動していない"
fi

# 開発補助システムの状態
echo -e "\n🔍 開発補助システムの状態:"
DISABLED_COUNT=$(ls -la ~/development/shooting_game/ShootingGame7/PROJECTS_DISABLED 2>/dev/null | wc -l)
if [ $DISABLED_COUNT -gt 2 ]; then
  echo "✅ 開発補助システムは安全に停止中"
else
  echo "⚠️ 開発補助システムが有効状態 (リスクあり)"
fi

# フォルダ構造
echo -e "\n🔍 フォルダ構造:"
tree -L 1 ~/development/shooting_game/ShootingGame7 | grep -E "game|DynamicErrorMonitor|PROJECTS_DISABLED"
