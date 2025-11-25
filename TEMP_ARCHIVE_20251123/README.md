# Dynamic Error Monitor (DEM) - 統合サーバー版

## 1. 概要

ゲームクライアントで発生したエラーを自動収集し、Next.jsのAPIルートとして統合されたサーバーで処理・分析するシステム。旧スタンドアロンサーバーの機能を、Next.jsの本番ビルドに対応した、TypeScriptベースの、内部ライブラリとして、再設計したものである。

---

## 2. アーキテクチャ（2025年11月23日時点）

このシステムの、コンポーネントは、複数の、ディレクトリに、またがって、存在している。

### 2.1. 主要コンポーネントと、ファイルパス

#### **【司令塔】APIエンドポイント**
-   **パス:** `ShootingGame7/app/api/collect/route.ts`
-   **役割:** クライアントからの、全エラー報告を受信する、唯一の、窓口。各内部ライブラリを、呼び出し、エラー処理の、フロー全体を、制御する。

#### **【兵器庫】内部ライブラリ**
-   **パス:** `ShootingGame7/app/api/_lib/`
-   **役割:** APIルートの、ロジックを、実現するための、TypeScriptモジュール群。Next.jsの、ルーティング対象外 (`_lib`) となっている。
    -   `parser.ts`: スタックトレースの、**解析官**。
    -   `resolver.ts`: エラー発生源の、**特定官**。
    -   `db.ts`: データベースへの、**記録官**。

#### **【心臓部】データベース**
-   **パス:** `ShootingGame7/DynamicErrorMonitor/database/errors.db`
-   **役割:** 収集・解析された、全エラー情報を、格納する、SQLiteデータベース。

#### **【知識源】静的インデックス**
-   **パス:** `ShootingGame7/Project_Cognize/database/static_index.db`
-   **役割:** `resolver.ts`が、エラー発生箇所を、特定するために、参照する、ソースコードの、インデックス。

#### **【監視モニター】エラー可視化**
-   **連携先:** GlitchTip (Sentry互換)
-   **設定ファイル:**
    -   `ShootingGame7/sentry.client.config.ts`
    -   `ShootingGame7/sentry.server.config.ts`
    -   `ShootingGame7/sentry.edge.config.ts`
    -   `ShootingGame7/next.config.js` (Sentry設定部分)

---

## 3. 旧システムの、残骸（クリーンアップ対象）

以下の、ファイルは、現在、**使用されておらず**、新システムへの、完全移行後に、削除されるべき、旧コンポーネントである。

-   `DynamicErrorMonitor/src/collector/parser.js`
-   `DynamicErrorMonitor/src/reverse-lookup/resolver.js`
-   `DynamicErrorMonitor/src/collector/db.js`
-   `public/error-snippet.js`
-   `DynamicErrorMonitor/client/error-snippet.js`

---

## 4. クイックスタート（開発環境）

1.  **依存インストール**
    ```bash
    npm install
    npm install better-sqlite3 @types/better-sqlite3
    ```

2.  **環境変数設定**
    `.env`ファイルに、以下の、変数が、設定されていることを、確認する。
    -   `ERRORS_DB_PATH`
    -   `STATIC_INDEX_DB_PATH`
    -   `ENABLE_GLITCHTIP`
    -   `GLITCHTIP_DSN`

3.  **開発サーバー起動**
    ```bash
    npm run dev
    ```

4.  **本番ビルド＆起動**
    ```bash
    npm run build
    npm run start
    ```
