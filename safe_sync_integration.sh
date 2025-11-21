#!/bin/bash
set -e
echo "🚀 安全なSyncManager統合を開始..."
echo "🛑 現在のCollectorプロセスを停止..."
pkill -f "node index.js" 2>/dev/null || true
sleep 1
echo "✅ Collectorを停止"
BACKUP_DIR="collector_backups_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "💾 バックアップディレクトリを作成: $BACKUP_DIR"
cp DynamicErrorMonitor/src/collector/index.js "$BACKUP_DIR/index.js.backup" 2>/dev/null || true
cp DynamicErrorMonitor/src/collector/sync.js "$BACKUP_DIR/sync.js.backup" 2>/dev/null || true
echo "✅ 安全なバックアップを作成"
