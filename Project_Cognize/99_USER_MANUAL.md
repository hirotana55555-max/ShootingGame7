# Project_Cognize v2.0 ユーザーマニュアル

## 📖 目次

1. [概要](#%E6%A6%82%E8%A6%81)
2. [基本的な使い方](#%E5%9F%BA%E6%9C%AC%E7%9A%84%E3%81%AA%E4%BD%BF%E3%81%84%E6%96%B9)
3. [コマンドリファレンス](#%E3%82%B3%E3%83%9E%E3%83%B3%E3%83%89%E3%83%AA%E3%83%95%E3%82%A1%E3%83%AC%E3%83%B3%E3%82%B9)
4. [よくある質問](#%E3%82%88%E3%81%8F%E3%81%82%E3%82%8B%E8%B3%AA%E5%95%8F)
5. [トラブルシューティング](#%E3%83%88%E3%83%A9%E3%83%96%E3%83%AB%E3%82%B7%E3%83%A5%E3%83%BC%E3%83%86%E3%82%A3%E3%83%B3%E3%82%B0)

---

## 概要

Project_Cognize は、プロジェクト全体のコード構造を分析し、LLMに安全な情報を提供するためのツールです。

### v2.0 の新機能

- **自作コード判定**: どのファイルが自作コードかを自動判定
- **カテゴリ分類**: component, app, game-core などに分類
- **厳密な依存関係検索**: 誤検知を減らした正確な依存分析
- **スキーマバージョニング**: データベースの変更履歴を管理

---

## 基本的な使い方

### 1. プロジェクト全体の統計を見る

```bash
node Project_Cognize/scripts/query_index.js stats
```

**出力例**:

```
=== 統計情報 ===

総ファイル数: 112
総行数: 8,450

自作コード: 45ファイル (40.2%)
自作コードLOC: 3,200
```

### 2. 自作コードのみを一覧表示

```bash
node Project_Cognize/scripts/query_index.js list --self-made-only
```

### 3. 特定のファイルを検索

```bash
node Project_Cognize/scripts/query_index.js search GameCanvas
```

### 4. ファイルの依存関係を調べる

```bash
node Project_Cognize/scripts/query_index.js deps components/GameCanvas.tsx
```

---

## コマンドリファレンス

### schema - スキーマ情報の表示

データベースのテーブル構造とマイグレーション履歴を表示します。

```bash
node Project_Cognize/scripts/query_index.js schema
```

**用途**: データベースの状態確認、新カラムの追加確認

---

### list - ファイル一覧

プロジェクト内の全ファイルを一覧表示します。

```bash
node Project_Cognize/scripts/query_index.js list [オプション]
```

**オプション**:

- `--self-made-only`: 自作コードのみ表示

**使用例**:

```bash
# すべてのファイル
node Project_Cognize/scripts/query_index.js list

# 自作コードのみ
node Project_Cognize/scripts/query_index.js list --self-made-only
```

---

### search - パターン検索

ファイルパスにマッチするファイルを検索します。

```bash
node Project_Cognize/scripts/query_index.js search <パターン> [オプション]
```

**オプション**:

- `--fuzzy`: 部分一致検索（デフォルトは厳密検索）

**使用例**:

```bash
# 厳密検索（推奨）
node Project_Cognize/scripts/query_index.js search Position

# ファジー検索
node Project_Cognize/scripts/query_index.js search Pos --fuzzy
```

**厳密検索とファジー検索の違い**:

- 厳密検索: `Position` → `game/components/Position.ts` のみ
- ファジー検索: `Pos` → `Position.ts`, `Posture.ts`, `Composite.ts` 等

---

### stats - 統計情報

プロジェクトの統計情報を表示します。

```bash
node Project_Cognize/scripts/query_index.js stats [オプション]
```

**オプション**:

- `--by-category`: カテゴリ別の詳細統計を表示

**使用例**:

```bash
# 基本統計
node Project_Cognize/scripts/query_index.js stats

# カテゴリ別統計
node Project_Cognize/scripts/query_index.js stats --by-category
```

**出力項目**:

- 総ファイル数・行数
- 自作コード数・割合
- 言語別内訳
- カテゴリ別内訳（`--by-category`指定時）
- 行数TOP10
- 頻繁にインスタンス化されるクラスTOP10

---

### deps - 依存関係

指定したファイルの依存関係を表示します。

```bash
node Project_Cognize/scripts/query_index.js deps <ファイルパス> [オプション]
```

**オプション**:

- `--fuzzy`: 部分一致で検索（通常は不要）

**使用例**:

```bash
# 厳密検索（推奨）
node Project_Cognize/scripts/query_index.js deps components/GameCanvas.tsx

# パス表記のバリエーション（すべて同じ結果）
node Project_Cognize/scripts/query_index.js deps ./components/GameCanvas.tsx
node Project_Cognize/scripts/query_index.js deps /full/path/to/components/GameCanvas.tsx
```

**出力内容**:

- 📥 このファイルが使用しているモジュール
- 📤 このファイルを使用しているファイル

---

### instances - インスタンス検索

指定したクラスのインスタンス化箇所を検索します。

```bash
node Project_Cognize/scripts/query_index.js instances <クラス名> [オプション]
```

**オプション**:

- `--show-builtins`: ビルトインクラス（RegExp, Date等）も表示

**使用例**:

```bash
# 自作クラスのみ検索
node Project_Cognize/scripts/query_index.js instances Health

# ビルトインも含めて検索
node Project_Cognize/scripts/query_index.js instances RegExp --show-builtins
```

**出力内容**:

- ファイルパス
- 行番号
- コードスニペット
- 引数情報
- ファイル別集計

---

## よくある質問

### Q1: 検索しても見つからない

**A**: 以下を確認してください：

1. `indexer.js` を最近実行しましたか？
    
    ```bash
    node Project_Cognize/scripts/indexer.js
    ```
    
2. ファイルは `shared_patterns.js` で除外されていませんか？
    
    ```bash
    cat Project_Cognize/config/shared_patterns.js | grep IGNORE_PATTERNS
    ```
    
3. 正しいパス表記を使っていますか？
    
    ```bash
    # ✓ 正しい
    node Project_Cognize/scripts/query_index.js search GameCanvas
    
    # ✗ 間違い（拡張子必須ではない）
    node Project_Cognize/scripts/query_index.js search GameCanvas.tsx
    ```
    

---

### Q2: 依存関係が表示されない

**A**: `--fuzzy` オプションを試してください：

```bash
# 厳密検索で見つからない場合
node Project_Cognize/scripts/query_index.js deps game/core/World.js

# ファジー検索を試す
node Project_Cognize/scripts/query_index.js deps game/core/World.js --fuzzy
```

それでも表示されない場合は、そのファイルは他のファイルから参照されていません。

---

### Q3: 自作コードの判定が間違っている

**A**: `shared_patterns.js` の `SOURCE_CODE_RULES` を確認してください：

```bash
cat Project_Cognize/config/shared_patterns.js
```

判定ロジック:

1. `include_paths` にマッチ → 自作コード
2. `exclude_paths` にマッチ → 外部コード
3. `CRITICAL_FILES` に含まれる → クリティカル

---

### Q4: カテゴリが "unknown" になっている

**A**: これは正常です。以下の場合は unknown になります：

- 新しく追加したファイル（`indexer.js` を再実行してください）
- `include_paths` にマッチしないファイル
- 分類ロジックが対応していない場所のファイル

---

## トラブルシューティング

### エラー: "データベースを開けません"

**原因**: データベースファイルが存在しない

**対処**:

```bash
# indexer を実行してデータベースを作成
node Project_Cognize/scripts/indexer.js
```

---

### エラー: "Cannot find module 'better-sqlite3'"

**原因**: 依存関係がインストールされていない

**対処**:

```bash
npm install
```

---

### 統計情報で NULL が表示される

**原因**: データベースが空、またはマイグレーションが未適用

**対処**:

```bash
# マイグレーション実行
node Project_Cognize/scripts/migrate.js

# indexer 再実行
node Project_Cognize/scripts/indexer.js
```

---

### 自作コードの統計が表示されない

**原因**: v1.x のデータベースを使用している

**対処**:

```bash
# スキーマ確認
node Project_Cognize/scripts/query_index.js schema

# is_self_made カラムがなければマイグレーション実行
node Project_Cognize/scripts/migrate.js

# indexer 再実行で値を埋める
node Project_Cognize/scripts/indexer.js
```

---

## 高度な使い方

### データベースを直接クエリ

```bash
sqlite3 Project_Cognize/database/static_index.db

# 自作コードの一覧
SELECT path, category FROM file_index WHERE is_self_made = 1;

# カテゴリ別集計
SELECT category, COUNT(*) FROM file_index WHERE is_self_made = 1 GROUP BY category;

# 確信度が低いファイル
SELECT path, confidence FROM file_index WHERE is_self_made = 1 AND confidence < 0.7;
```

---

### マイグレーション履歴の確認

```bash
sqlite3 Project_Cognize/database/static_index.db \
  "SELECT * FROM schema_migrations ORDER BY id;"
```

---

### バックアップからの復元

```bash
# バックアップ一覧
ls -lh Project_Cognize/database/backups/

# 復元
cp Project_Cognize/database/backups/static_index_YYYYMMDD_HHMMSS.db \
   Project_Cognize/database/static_index.db
```

---

## 更新履歴

### v2.0 (2025-11-25)

- ✨ 自作コード判定機能の追加
- ✨ カテゴリ分類の導入
- ✨ スキーマバージョニング
- 🐛 依存関係検索の精度向上
- 🐛 SQLエスケープ処理の修正

### v1.5 (2025-11-24)

- インスタンス検索機能の追加
- ノイズ除去（ビルトインクラス）

---

## サポート

問題が解決しない場合は、以下の情報を添えて報告してください：

1. 実行したコマンド
2. エラーメッセージ全文
3. 以下のコマンドの出力:
    
    ```bash
    node --versionnode Project_Cognize/scripts/query_index.js schema
    ```
    

---

以上でユーザーマニュアルは完了です。