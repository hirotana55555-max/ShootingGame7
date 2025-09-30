# Qwenゲームリファクタリング調査レポート

## 1. 目的

敵の種類を安全かつ効率的に増やすため、既存コードベースの状態を把握し、設計書（`REFACTORING_PLAN.md`）との乖離を特定。リスクを最小限に抑える施工計画を立案する。

## 2. 調査対象

*   **設計書:** `REFACTORING_PLAN.md`, `DESIGN_DOCUMENT.md`, `DESIGN_DOCUMENT_ENEMY.md`
*   **コード:** `ShootingGame7/game` 配下の全ファイル (`components`, `core`, `systems`, `debug`)

## 3. 調査結果サマリ

### 3.1. 現コードベースの状態

*   **`REFACTORING_PLAN.md` のフェーズ1（コンポーネントコンストラクタ統一）:** **未完了**。一部コンポーネント (`Position`, `Renderable`, `Velocity`) はオブジェクト引数形式だが、`Team`, `Health`, `Collidable`, `Generator`, `Lifetime` は旧式 (`constructor(id)`) のまま。
*   **`REFACTORING_PLAN.md` のフェーズ2（イベント駆動化）:** **完了**。`DamageSystem`, `CollisionSystem`, `World.js` がイベント駆動アーキテクチャを採用。
*   **`REFACTORING_PLAN.md` のフェーズ3（ブループリント化）:** **未完了**。`/game/blueprints` ディレクトリが存在せず、`entityFactory.js` に具体的な生成関数 (`createPlayer`, `createMeteor`) が存在。
*   **`REFACTORING_PLAN.md` のフェーズ4（堅牢化）:** **部分的に完了**。`DamageSystem` に生存確認ガード節あり。

### 3.2. 影響範囲の特定 (`REFACTORING_PLAN.md` フェーズ1)

「仮説駆動開発ワークフロー」の「検証 (Verification)」フェーズを実施し、`entityFactory.js` および `/game/components` 配下の全コンポーネント、さらに `/game/core`, `/game/systems`, `/game/debug` 配下の関連ファイルを精査した。

*   **コンポーネントの初期化 (`new Component(...)`) を行う可能性のある主要ファイル:**
    *   `game/core/entityFactory.js` (修正対象)
    *   `game/core/main.js` (関連あり、`new Generator(...)` 呼び出し)
    *   `game/systems/InputSystem.js` (軽微な修正対象、`new InputState(...)` 呼び出し)

### 3.3. リスク要因の特定

*   **AIの局所性:** AIは提示されたファイルしか分析できないため、影響範囲の網羅漏れが発生する可能性がある。
*   **ワークフローの逸脱:** 「仮説駆動開発ワークフロー」を正しく実行（すべての関連ファイルを検証）しないと、施工計画が不完全になり、失敗リスクが高まる。
*   **断片的変更:** 一部のファイルのみを修正すると、コードの不整合が発生し、破綻を招く。

## 4. 議論と結論

### 4.1. オブジェクト引数化のリスクと価値

*   **リスク:** 影響範囲の把握漏れにより、不具合が発生しやすい。AIとの協働方法が不適切な場合、そのリスクが顕著になる。
*   **価値:** ブループリント化（敵の種類増加）の前提条件。コードの可読性・保守性・拡張性を高める。
*   **結論:** ワークフローを正しく実行し、すべての関連ファイルを特定・検証すれば、リスクを大幅に軽減できる。価値はリスクを上回る。

### 4.2. 今後の施工計画（仮説の実証）

「検証 (Verification)」フェーズが完了し、すべての関連ファイルが特定されたため、仮説が**「実証された事実」に変わった**。

*   **計画の確定:** `REFACTORING_PLAN.md` の**フェーズ1完了**（コンポーネントコンストラクタのオブジェクト引数形式への統一）のための施工計画が確定。
*   **対象ファイル:** 以下の通り。これらを**一度に、機械的に**適用する。
    *   `game/components/Collidable.js`
    *   `game/components/Generator.js`
    *   `game/components/Health.js`
    *   `game/components/Lifetime.js`
    *   `game/components/Team.js`
    *   `game/core/entityFactory.js`
    *   `game/systems/InputSystem.js` (呼び出し部分の修正)

## 5. 次のステップ

確定した施工計画を元に、コードの修正を実行し、ゲームが正常に動作することを確認する。その後、`REFACTORING_PLAN.md` のフェーズ3（ブループリント化）に進む準備が整う。