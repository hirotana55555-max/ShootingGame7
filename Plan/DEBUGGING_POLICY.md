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

### 4.3. main.js への登録方法

```js
// game/core/main.js の末尾近くに以下を追加（AI上書き対策）

// ★★★ 開発用システムの条件付き登録（このブロックは削除しないこと）★★★
import { DebugConfig } from '../debug/DebugConfig.js';
import { DebugSystem } from '../debug/systems/DebugSystem.js';
import { OffscreenCleanupSystem } from '../debug/systems/OffscreenCleanupSystem.js';

// ...他の開発用システムも必要に応じて追加

if (DebugConfig.ENABLED) {
  world.addSystem(new OffscreenCleanupSystem(world));
  world.addSystem(new DebugSystem(world));
}
// ★★★ ここまで ★★★

```

> ✅ このブロックは、AIが `main.js` を再生成しても**手動で再挿入が容易**  
> ✅ `typeof` チェックにより、`DebugConfig.js` が存在しない場合もクラッシュしない

---

## 5. リリース手順

1. `game/debug/DebugConfig.js` を開く
2. `ENABLED: true` → `ENABLED: false` に変更
3. （任意）`/game/debug` フォルダ全体を削除 or ビルド対象外に設定
4. 完了 → ゲームは**純粋な本体ロジックのみで動作**

---

## 6. 注意事項

- **開発用コードを本体ファイルにコピペしないこと**
- **`main.js` の条件ブロックは、AI生成後も必ず確認・復元すること**
- 新しい開発機能を追加する際は、必ずこのポリシーに従い `/game/debug` に配置すること

---

> 最終更新日: 2025年9月30日  
> 作成者: 開発者（非エンジニア）  
> 環境: BlitzIDE + Galaxy Fold 6 (DeX)
```