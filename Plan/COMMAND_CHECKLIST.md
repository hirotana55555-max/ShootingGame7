# ��【完全版】開発補助システム 全コマンド検証シート
**最終更新: 2025-12-01**  
**目的: 将来のAI自立開発のための完全な実行基準を確立**  
**方針: 一度に全コマンドを検証し、機能欠落の不安を完全解消**

## 📋 全コマンド検証リスト（提供マニュアル完全網羅）

### 【第1グループ】データベース基礎コマンド
- [ ] `node Project_Cognize/scripts/query_index.js schema`  
  **完全期待結果**: 5つのテーブル構造(file_index, symbols, file_dependencies, class_instances, migration_history)と6つのマイグレーション履歴が表示

- [ ] `node Project_Cognize/scripts/query_index.js list`  
  **完全期待結果**: 114ファイルが一覧表示される
  
- [ ] `node Project_Cognize/scripts/query_index.js list --self-made-only`  
  **完全期待結果**: 114ファイルすべてが「自作コード」として表示

### 【第2グループ】検索・分析コマンド  
- [ ] `node Project_Cognize/scripts/query_index.js search "game"`  
  **完全期待結果**: game/ ディレクトリ配下のファイルが表示

- [ ] `node Project_Cognize/scripts/query_index.js search "error" --fuzzy`  
  **完全期待結果**: "error", "Error", "ERROR"を含むファイルがすべて表示

- [ ] `node Project_Cognize/scripts/query_index.js stats`  
  **完全期待結果**: ファイル数114、シンボル数906、LOC 13,633が表示

- [ ] `node Project_Cognize/scripts/query_index.js stats --by-category`  
  **完全期待結果**: component/game-core/config ごとの詳細統計が表示

### 【第3グループ】高度依存分析コマンド
- [ ] `node Project_Cognize/scripts/query_index.js deps "app/api/_lib/db.ts"`  
  **完全期待結果**: db.tsのimport元とimport先がグラフ表示

- [ ] `node Project_Cognize/scripts/query_index.js instances "Database"`  
  **完全期待結果**: Databaseクラスのインスタンス化箇所が表示

- [ ] `node Project_Cognize/scripts/query_index.js instances "Error" --show-builtins`  
  **完全期待結果**: 組み込みErrorクラスの使用箇所も表示

## 🎯 検証完了基準
- [ ] 全11コマンド・オプションが正常実行できること
- [ ] 期待結果と実際結果の差分が0であること  
- [ ] すべての結果がこのシートに記録されていること
## 🔴 発見済み不具合 - 修正要（Claude担当）

### 【不具合001】query_index.jsのESM非対応問題
**検出日時**: 2025年 12月  1日 月曜日 18:53:29 JST
**影響範囲**: 全query_index.jsコマンド（schema, list, search, stats, deps, instances）
**再現手順**:
1. コマンド実行: `node Project_Cognize/scripts/query_index.js schema`
**エラーメッセージ**:
```
file:///home/els/Shooting-Game/ShootingGame7/Project_Cognize/scripts/query_index.js:13
import { fileURLToPath } from 'url';
       ^

SyntaxError: Unexpected token '{'
    at compileSourceTextModule (node:internal/modules/esm/utils:346:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:146:18)
```
**根本原因分析**:
- indexer.js, generate_toon.jsはESM対応済みだが、query_index.jsのみ未対応
- package.jsonに"type": "module"が設定されているため、全スクリプトがESM対応必須
**修正要件**:
- ESM形式への完全移行（import/export構文）
- __filename, __dirnameの代替実装
- better-sqlite3のESM対応
**優先度**: 🔴 緊急（全コマンド検証が停止）

## 📊 検証状況サマリー（2025-12-01現在）
- **全体進捗**: 0/11 コマンド検証完了
- **ブロック要因**: query_index.jsのESM非対応（修正要）
- **次アクション**: Claudeによるquery_index.jsのESM対応実施
- **Qwen役割**: 不具合記録完了 → Claudeへ情報引継ぎ完了


## 🔴 設計不整合 - 修正要（Claude担当）

### 【不具合002】マニフェストと実装の不整合
**検出日時**: 2025年 12月  1日 月曜日 20:14:12 JST
**問題内容**: マニフェスト（設計文書）が古いESM対応前の状態のまま。migrate.jsの追加に伴うワークフロー変更が反映されていない。
**影響**: LLMが設計意図と異なる実装を生成するリスク
**修正要件**:
- マニフェストを最新実装に更新（migrate.jsをstep 0として追加）
- ESM対応状況を全ドキュメントに反映
- Single Source of Truth原則に沿ったドキュメント整合性の確保

### 【不具合003】indexer.jsのESM非対応問題
**検出日時**: 2025年 12月  1日 月曜日 20:21:41 JST
**影響範囲**: 全ファイルスキャンとデータベースへのデータ投入が失敗
**再現手順**:
1. データベース削除: `rm -rf Project_Cognize/database`
2. migrate.js実行: `node Project_Cognize/scripts/migrate.js`
3. indexer.js実行: `node Project_Cognize/scripts/indexer.js`
**エラーメッセージ**:
```
file:///home/els/Shooting-Game/ShootingGame7/Project_Cognize/scripts/indexer.js:40
const __filename = fileURLToPath(import.meta.url);
      ^

SyntaxError: Identifier '__filename' has already been declared
```
**根本原因**: ESM環境で__filenameを手動定義しているが、Node.jsが自動的に定義済み
**修正要件**: ESM対応済みのindexer.jsへの完全移行（__filename/__dirnameの安全な再定義を含む）
**優先度**: 🔴 緊急（データベースにデータが投入されない）

## 📊 現在のデータベース状態（2025-12-01記録）
**ファイル数**: 0
**シンボル数**: 0
**原因**: indexer.jsのESMエラーによりデータ投入失敗

## 🎮 ゲームサーバー状態（2025-12-01確認）
**状態**: ✅ 正常起動（http://localhost:3000 でアクセス可能）
**警告**: baseline-browser-mappingモジュールが古い（深刻度: 低）
**対応**: 必要に応じて `npm i baseline-browser-mapping@latest -D` で更新可能

## ✅ query_index.jsのESM対応確認結果（2025-12-01）
**状態**: ✅ 全11コマンドが正常に実行（ESM対応成功）
**課題**: データベースが空（indexer.jsの未修正が原因）
**次のアクション**: indexer.jsのESM対応を優先実施
