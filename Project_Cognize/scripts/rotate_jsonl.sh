#!/bin/bash
# JSONLローテーション手動実行用

COGNIZE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JSONL_PATH="$COGNIZE_ROOT/workspace/outputs/static_index.jsonl"
ARCHIVE_DIR="$COGNIZE_ROOT/workspace/outputs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🔄 JSONLローテーション開始..."

if [ ! -f "$JSONL_PATH" ]; then
  echo "❌ $JSONL_PATH が見つかりません"
  exit 1
fi

SIZE_MB=$(du -m "$JSONL_PATH" | cut -f1)
echo "📊 現在のサイズ: ${SIZE_MB}MB"

if [ "$SIZE_MB" -lt 10 ]; then
  echo "ℹ️  10MB未満のためローテーション不要"
  exit 0
fi

ARCHIVE_FILE="$ARCHIVE_DIR/static_index_${TIMESTAMP}.jsonl.gz"
gzip -c "$JSONL_PATH" > "$ARCHIVE_FILE"

if [ $? -eq 0 ]; then
  echo "" > "$JSONL_PATH"
  echo "✅ アーカイブ完了: $(basename "$ARCHIVE_FILE")"
else
  echo "❌ 圧縮失敗"
  exit 1
fi
