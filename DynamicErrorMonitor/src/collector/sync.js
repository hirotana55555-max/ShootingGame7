/**
 * Static Index Synchronization (s2 strategy)
 * ChatGPT指摘対応：stale判定 + 定期再解決
 */

const cron = require('node-cron');

class SyncManager {
  constructor(staticDb, errorsDb, resolver) {
    this.staticDb = staticDb;
    this.errorsDb = errorsDb;
    this.resolver = resolver;
    this.lastIndexTime = null;
    
    this._updateIndexTime();
    this._startCron();
  }

  _updateIndexTime() {
    this.staticDb.get(
      "SELECT MAX(indexed_at) as max_time FROM file_index",
      (err, row) => {
        if (!err && row && row.max_time) {
          this.lastIndexTime = row.max_time;
          console.log('[Sync] Index time updated:', this.lastIndexTime);
          
          // Update sync_state
          this.errorsDb.run(
            "UPDATE sync_state SET value = ?, updated_at = datetime('now') WHERE key = 'last_index_time'",
            [this.lastIndexTime]
          );
        }
      }
    );
  }

  isStale(errorTimestamp) {
    if (!this.lastIndexTime) return false;
    return new Date(errorTimestamp) < new Date(this.lastIndexTime);
  }

  markStale(errorId) {
    this.errorsDb.run(
      "UPDATE errors SET is_stale = 1 WHERE id = ?",
      [errorId],
      (err) => {
        if (err) console.error('[Sync] Failed to mark stale:', err);
      }
    );
  }

  async reResolveStale() {
    return new Promise((resolve, reject) => {
      this.errorsDb.all(
        "SELECT id, stack, metadata_json FROM errors WHERE is_stale = 1 LIMIT 50",
        async (err, rows) => {
          if (err) return reject(err);
          
          console.log(`[Sync] Re-resolving ${rows.length} stale errors`);
          
          for (const row of rows) {
            try {
              const metadata = JSON.parse(row.metadata_json || '{}');
              const frames = metadata.frames || [];
              
              if (frames.length > 0) {
                const firstFrame = frames[0];
                const resolved = await this.resolver.resolve(
                  firstFrame.file,
                  firstFrame.line
                );
                
                if (resolved) {
                  this.errorsDb.run(
                    `UPDATE errors 
                     SET resolved_path = ?, 
                         resolved_symbol = ?, 
                         deps_json = ?,
                         is_stale = 0
                     WHERE id = ?`,
                    [
                      resolved.path,
                      resolved.symbol,
                      JSON.stringify(resolved.deps),
                      row.id
                    ]
                  );
                }
              }
            } catch (e) {
              console.error(`[Sync] Re-resolve failed for error ${row.id}:`, e);
            }
          }
          
          resolve(rows.length);
        }
      );
    });
  }

  _startCron() {
    // Check for index updates every hour
    cron.schedule('0 * * * *', () => {
      console.log('[Sync] Hourly index check');
      this._updateIndexTime();
    });

    // Re-resolve stale errors every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('[Sync] Stale re-resolution job');
      try {
        const count = await this.reResolveStale();
        console.log(`[Sync] Re-resolved ${count} errors`);
      } catch (e) {
        console.error('[Sync] Re-resolution failed:', e);
      }
    });
  }
}

module.exports = SyncManager;
