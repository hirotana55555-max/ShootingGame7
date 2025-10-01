# デバッグ・開発支援機能管理ポリシー（DEBUGGING_POLICY.md）

## 1. 目的

本プロジェクトは、ブラウザベースのIDE（BlitzIDE）およびメモリ制約の厳しい環境（Samsung Galaxy Fold 6）での開発を前提としている。  
そのため、以下を実現するためのポリシーを定める：

- 開発中の**メモリ圧迫・クラッシュを防ぐための暫定措置**を安全に導入
- **AIによるコード上書きリスク**に対応し、開発用コードが消失しない仕組み
- ゲーム本体の**コード肥大化を回避**
- リリース時に**1つのフラグ操作で全開発機能を無効化**し、パフォーマンス・ガベージコレクション負荷をゼロにする

---

## 2. 基本方針

### 2.1. 開発機能は本体ロジックと完全分離
- すべての開発・デバッグ用コードは、`/game/debug` ディレクトリ以下に配置する
- `/game/systems` や `/game/core` など本体ロジック内に**一切混入しない**

### 2.2. 有効/無効は1つのフラグで一元管理
- `game/debug/DebugConfig.js` に `ENABLED` フラグを設ける
- リリース時は `ENABLED: false` に変更するだけで、**全開発機能が無効化され、実行されない**

### 2.3. パフォーマンスへの影響はゼロを保証
- `ENABLED: false` 時は：
  - 開発用システムは**インスタンス化されない**
  - 開発用クラスは**メモリにロードされない**（動的import利用）
  - 毎フレーム処理が**存在しない** → GC負荷・FPS低下ゼロ

### 2.4. AI上書き耐性を確保
- `main.js` への登録は、**条件分岐＋動的import**で行う
- AIが静的importやシステム登録を上書きしても、**条件ブロックを残せば安全**

---

## 3. ディレクトリ構造

ShootingGame7/Plan/DESIGN_DOCUMENT.mdを参照

> 💡 `/game/debug` は**開発時専用**。  
> リリースビルドではこのフォルダ全体を除外しても問題ない設計とする。

---

## 4. 実装ルール

### 4.1. DebugConfig.js の形式

```js
// game/debug/DebugConfig.js
export const DebugConfig = {
  ENABLED: true, // ← 開発中は true、リリース時は false

  // 個別機能の細かい制御（将来的に使用）
  ENABLE_OFFSCREEN_CLEANUP: true,
  ENABLE_DEBUG_DRAW: false,
  // ...他、必要に応じて追加
};
```

### 4.2. 開発用システムの実装

- ファイルは `/game/debug/systems/` 以下に配置
- 通常のシステムと同様のECS構造（`update()` メソッドを持つクラス）
- `DebugConfig` をインポートして、内部で個別フラグを参照可能


### 4.3. main.js への登録方法 (2025-10-02 改訂版)

デバッグシステムは、その役割に応じて**実行順序を厳密に制御する**必要がある。そのため、`main.js` 内で複数のグループに分けて登録する。

**【重要】** 以下の構造は、ポーズ＆コマ送り機能の正常動作に不可欠である。AIによる安易な変更を禁ずる。

#### 現在の実装 (静的インポート)

```js
// game/core/main.js

// --- 1. ファイル先頭で静的にインポート ---
import { DebugConfig } from '../debug/DebugConfig.js';
import { DebugControlSystem } from '../debug/systems/DebugControlSystem.js';
import { DebugSystem } from '../debug/systems/DebugSystem.js';
import { OffscreenCleanupSystem } from '../debug/systems/OffscreenCleanupSystem.js';


// --- 2. startGame関数内で、役割に応じて分離登録 ---
export function startGame(canvas) {
  // ...

  // グループA: 常に更新 (入力・制御)
  if (DebugConfig.ENABLED) {
    alwaysUpdateSystems.push(new DebugControlSystem(world));
  }

  // グループB: ポーズ中に停止 (ゲームロジック)
  if (DebugConfig.ENABLED) {
    gameLogicSystems.push(new OffscreenCleanupSystem(world));
  }

  // グループC: 描画の最後 (デバッグ表示)
  if (DebugConfig.ENABLED) {
    debugSystem = new DebugSystem(world);
  }

  // ... (ゲームループ内の分離実行ロジック) ...
}
```

#### 理想形 (将来の課題：動的インポート)

現状は実装の容易さから静的インポートを採用しているが、リリースビルドのパフォーマンスを完全に最適化するため、将来的には**動的インポート (`await import(...)`)** への移行を目指す。これにより、`ENABLED: false` の際にデバッグ用ファイルがメモリに一切ロードされなくなる。この課題は `REFACTORING_PLAN2.md` に記載済み。

---

## 5. リリース手順

1. `game/debug/DebugConfig.js` を開く
2. `ENABLED: true` → `ENABLED: false` に変更
3. （任意）`/game/debug` フォルダ全体を削除 or ビルド対象外に設定
4. 完了 → ゲームは**純粋な本体ロジックのみで動作**

---

## 6. 注意事項
- **開発用コードを本体ファイルにコピペしないこと**
- **`main.js` のシステム登録ロジックは、ポーズ機能の根幹であるため、その構造を維持すること**
- 新しい開発機能を追加する際は、必ずこのポリシーに従い `/game/debug` に配置し、適切な実行グループに登録すること

---

> 最終更新日: 2025年10月02日
> 作成者: 開発者, Manus
> 環境: BlitzIDE + Galaxy Fold 6 (DeX)
```