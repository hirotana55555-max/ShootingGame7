#!/bin/bash
# auto_scanner.sh - ProjectScannerの自動定期実行
# 非エンジニア向けに設計 - 完全自動で開発状況を分析

BASE_DIR=$(pwd)
LOG_FILE="$BASE_DIR/automation/logs/scanner.log"
INTERVAL=300  # 5分ごとに実行

echo "🔄 ProjectScanner 自動定期実行開始" | tee -a "$LOG_FILE"
echo "   間隔: 5分"
echo "   出力: $BASE_DIR/Project_scanner/output/"
echo "   ログ: $LOG_FILE"
echo "========================================"

    echo "[$TIMESTAMP] ❌ スキャンエラー - 次回再試行" | tee -a "$LOG_FILE"
  fi
  
  echo "[$TIMESTAMP] ⏰ 次回実行まで待機 (5分)..." | tee -a "$LOG_FILE"
  sleep $INTERVAL
done
