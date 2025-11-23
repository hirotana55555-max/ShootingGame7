新しいPCでこのプロジェクト(Project_Cognize入り)を始める時、やるべきことはたった2つになります。

    git cloneでプロジェクトをダウンロードする。
    ターミナルでbash Project_Cognize/setup_env.shと実行する


# ブラウザシューティングゲーム (ShootingGame7)

## 1. プロジェクト概要

このリポジトリは、Next.jsとECS（Entity Component System）アーキテクチャをベースに開発中のブラウザシューティングゲームです。

開発は、非エンジニアのプロジェクトオーナーとAIアシスタント（Manusなど）の協調作業によって進められています。AIとの円滑な連携を実現するため、プロジェクト内に**`Project_Cognize`**という独自のコンテキスト管理ツールが同梱されています。

**最重要事項:** このプロジェクトに関する作業を開始するAIは、まずセクション4の「AIアシスタント向けの初期手順」を読み、`Project_Cognize`を使用してプロジェクトの現状を完全に把握すること。

---

## 2. ブランチ戦略 (2025年11月12日更新)

このプロジェクトは、明確な役割を持つブランチで管理されています。

*   ### `main` (聖域 / Production)
    *   **役割:** **安定版の保管庫**。
    *   **ルール:** 直接コミットは厳禁。完全にテストされ、安定した`develop`ブランチの内容のみが、将来的にここに統合（マージ）されます。

*   ### `develop` (メイン開発線 / Staging)
    *   **役割:** **開発の中心となるブランチ**。
    *   **ルール:** 日々の安定した改善（`Project_Cognize`の更新、バグ修正、小さなリファクタリングなど）は、このブランチで直接行うか、短期間の`feature`ブランチからマージします。**新しい作業を開始する際の出発点**となります。

*   ### `feature/*` (実験室 / Feature)
    *   **役割:** **挑戦的・破壊的な変更を試すための「模索用」ブランチ**。
    *   **ルール:**
        1.  必ず`develop`ブランチから分岐して作成します。
        2.  ブランチ名は `feature/目的` の形式にします (例: `feature/typescript-generator`)。
        3.  実験が成功し安定したら、`develop`ブランチに統合（Pull Request経由が望ましい）します。
        4.  実験が失敗した場合、このブランチは**気兼ねなく削除**できます。

---

## 3. `Project_Cognize` ツールについて

`Project_Cognize`は、AIがプロジェクトのソースコード構造を正確に理解するために開発された、このプロジェクトの**「知覚層」**です。

### 主な機能

1.  **インデクサー (`indexer_v1.3.js`):**
    *   プロジェクト内の全ソースコードをAST（抽象構文木）で解析し、ファイル間の依存関係、シンボル（クラス、関数）、クラスのインスタンス化などを抽出し、`database/static_index.db`というSQLiteデータベースに記録します。

2.  **クエリツール (`query_index.js`):**
    *   インデクサーが構築したデータベースに対し、特定のファイルの依存関係や、クラスの使用箇所などを問い合わせるためのCLIツールです。

3.  **プロンプトジェネレーター (`generate_prompt.js`):**
    *   対象ファイルのソースコード、依存関係、関連ファイルのコード、リファクタリングポリシーなどを自動的に収集・統合し、AIへの指示プロンプト（`auto_prompt.md`）を生成します。

---

## 4. AIアシスタント向けの初期手順 (Getting Started for AI)

このプロジェクトのコンテキストをロードし、開発を開始するには、以下の手順を**必ず**実行してください。

### ステップ1: 開発ブランチへの移動

まず、開発の中心である `develop` ブランチに移動し、ローカルの状態を最新にします。

```bash
git checkout develop
git pull origin develop

ステップ2: 作業用ブランチの作成
次に、タスクの目的に応じた作業用ブランチを作成します。
Bash

# 例: GeneratorコンポーネントのTS化というタスクの場合
git checkout -b feature/typescript-generator

ステップ3: プロジェクト全体のインデックス作成
作業ブランチに移動したら、Project_Cognizeのインデクサーを実行し、プロジェクトの最新の状態をデータベースに反映させます。
Bash

# フルスキャンモードでインデクサーを実行
node Project_Cognize/scripts/indexer_v1.3.js --full-scan

このコマンドが成功すれば、分析の準備は完了です。
ステップ4: 依存関係の調査とタスクの開始
タスクに着手する前に、関連ファイルの情報を調査し、AIへの指示プロンプトを生成します。
Bash

# 例: Generator.jsの依存関係を調査
node Project_Cognize/scripts/query_index.js deps game/components/Generator.js

# 例: Generator.jsのリファクタリング用プロンプトを生成
node Project_Cognize/scripts/generate_prompt.js refactor game/components/Generator.js

生成されたauto_prompt.mdの内容を分析し、オーナーに具体的な提案を行ってください。