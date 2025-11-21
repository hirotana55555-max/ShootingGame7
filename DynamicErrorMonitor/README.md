# Unit2: Dynamic Error Monitor

**AI依存開発プロセスの基盤ユニット**

## 概要

ブラウザで発生したエラーを自動収集し、プロジェクト構造との紐付けを行い、
LLMが理解可能な形式で提供するシステム。

### 主要機能

- **エラー自動収集**: ブラウザの全エラーをキャプチャ
- **逆引き解決**: Project_Cognizeと連携してエラー発生箇所を特定
- **LLM Query API**: AI向けに最適化されたデータ提供
- **可視化ダッシュボード**: Glitchtipによるエラー一覧・統計

### アーキテクチャ

Browser → error-snippet.js → Collector → errors.db (SOT)
↓
Glitchtip (View)
↓
LLM Query API


## クイックスタート

### 前提条件

- Node.js 18+
- Docker + Docker Compose
- Project_Cognize が実行済み

### セットアップ

```bash
# 1. 依存インストール
npm install

# 2. 環境変数設定
cp .env.example .env
# .env を編集: STATIC_INDEX_DB_PATH を設定

# 3. データベース初期化
npm run setup:db

# 4. Glitchtip起動
npm run setup:glitchtip

# 5. Collector起動
npm start

詳細は docs/SETUP.md を参照。

DynamicErrorMonitor/
├── src/           # Collector, LLM API, 逆引きロジック
├── client/        # ブラウザ側スニペット
├── database/      # errors.db (SQLite)
├── infra/         # Glitchtip docker-compose
└── docs/          # セットアップ・API・テストドキュメント

API
Collector

    POST /api/collect - エラー受信
    GET /api/errors/recent - 最近のエラー取得

LLM Query API

    GET /api/llm/summary - エラーサマリー
    GET /api/llm/context/:id - 個別エラーコンテキスト
    POST /api/llm/query - 自然言語クエリ

詳細は docs/API.md を参照。

テスト
npm test

詳細は docs/TESTING.md を参照。
ライセンス
MIT

貢献
Claude + ChatGPT による相互査読設計