// index.js (Collector)
/**
 * Collector サーバ
 * /api/events で受けたイベントを SQLite に保存
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.COLLECTOR_PORT || 3002;

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// DB 接続
const db = new sqlite3.Database(__dirname + '/../../database/errors.db', (err) => {
  if (err) console.error(err.message);
  else console.log('[DB] Connected to errors.db');
});

// テーブル作成（存在しない場合のみ）
db.run(`CREATE TABLE IF NOT EXISTS errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT,
  message TEXT,
  payload TEXT
)`);

app.post('/api/events', (req, res) => {
  const { name, payload } = req.body;
  const timestamp = new Date().toISOString();
  const message = name || 'unknown_event';
  const payloadStr = JSON.stringify(payload || {});

  const stmt = db.prepare(`INSERT INTO errors (timestamp, message, payload) VALUES (?, ?, ?)`);
  stmt.run(timestamp, message, payloadStr, function(err) {
    if (err) {
      console.error(err);
      res.status(500).send(err.message);
    } else {
      res.json({ id: this.lastID, timestamp, message, payload: payloadStr });
    }
  });
  stmt.finalize();
});

app.listen(PORT, () => {
  console.log(`[Collector] Running on port ${PORT}`);
});
// GET /api/events - 保存されたイベントを取得
app.get('/api/events', (req, res) => {
  db.all('SELECT id, timestamp, message as name, payload FROM errors ORDER BY timestamp DESC LIMIT 100', (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    const result = rows.map(row => ({
      ...row,
      payload: row.payload ? JSON.parse(row.payload) : null
    }));
    res.json(result);
  });
});
