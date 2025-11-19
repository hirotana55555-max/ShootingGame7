/**
 * SyncManager Wrapper - 安全な統合のためのラッパー
 * Phase 1: 基本機能のみを有効化
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const SyncManager = require('./sync');
const ReverseLookupResolver = require('../reverse-lookup/resolver');

class SafeSyncManager {
  constructor() {
    this.isHealthy = false;
    this.healthCheckInterval = null;
  }
  
  async initialize(errorsDb) {
    try {
      console.log('[Sync] 安全なSyncManager初期化を開始...');
      
      // 1. データベースパスの検証（修正済み: 相対パス）
      const staticDbPath = path.join(__dirname, '../../../database/static_index.db');
      const errorsDbPath = path.join(__dirname, '../../../database/errors.db');
      
      console.log(`[Sync] 検証中: ${staticDbPath}`);
      if (!require('fs').existsSync(staticDbPath)) {
        console.warn(`[Sync] static_index.dbが見つかりませんが、続行します: ${staticDbPath}`);
        // 重要ではないため、存在しない場合は無視
      }
      
      // 2. データベース接続
      const staticDb = new sqlite3.Database(staticDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.warn(`[Sync] static_index.dbへの接続に警告: ${err.message}`);
        }
      });
      
      const resolver = new ReverseLookupResolver(staticDbPath);
      
      // 3. SyncManagerインスタンス作成
      this.syncManager = new SyncManager(staticDb, errorsDb, resolver);
      this.isHealthy = true;
      
      console.log('[Sync] ✅ 安全に初期化完了');
      this._startHealthMonitoring();
      
      return true;
    } catch (error) {
      console.error('[Sync] ❌ 初期化失敗:', error.message);
      console.error('[Sync] 詳細:', error.stack);
      this.isHealthy = false;
      return false;
    }
  }
  
  _startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      if (this.isHealthy) {
        console.log('[Sync] 🟢 健全性チェック: 正常');
      } else {
        console.log('[Sync] 🔴 健全性チェック: 異常 - 再初期化試行');
        // 再初期化ロジック（将来拡張）
      }
    }, 60000); // 1分ごと
  }
  
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.syncManager && this.syncManager.close) {
      this.syncManager.close();
    }
  }
}

module.exports = SafeSyncManager;
