# 実際のディレクトリ構造 (DIRECTORY_STRUCTURE.md)

*最終更新日: 2025年10月02日2:42*

# AI支援リクエスト
## 現在取り組んでいる課題
- リファクタリングしエンティティ中央集権データ構造の構築
- 敵、味方、エフェクト等多彩な機能実装に備え基盤を洗練
- REFACTORING_PLAN.md参照

## 必要な支援タイプ
- [ ] コードレビュー
- [ ] 設計書改善
- [ ] バグ修正提案
- [ ] 新機能実装のアプローチ
- [ ] パフォーマンス改善


❯ npx tree-node-cli -I "node_modules"

ShootingGame7
├── Plan
│   ├── DEBUGGING_POLICY.md
│   ├── DESIGN_DOCUMENT.md
│   ├── DESIGN_DOCUMENT_ENEMY.md
│   ├── DESIGN_DOCUMENT_ENEMY2.md
│   ├── GAME_FEATURES.md
│   ├── REFACTORING_PLAN.md
│   └── REFACTORING_PLAN2.md
├── README.md
├── app
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components
│   └── GameCanvas.tsx
├── game
│   ├── components
│   │   ├── Bullet.js
│   │   ├── Collidable.js
│   │   ├── Controllable.js
│   │   ├── Generator.js
│   │   ├── Health.js
│   │   ├── InputState.js
│   │   ├── Lifetime.js
│   │   ├── Position.js
│   │   ├── Renderable.js
│   │   ├── Rotation.js
│   │   ├── Team.js
│   │   ├── Velocity.js
│   │   └── index.js
│   ├── core
│   │   ├── World.js
│   │   ├── entityFactory.js
│   │   └── main.js
│   ├── debug
│   │   ├── DebugConfig.js
│   │   ├── README_debug.md
│   │   └── systems
│   │       ├── DebugSystem.js
│   │       └── OffscreenCleanupSystem.js
│   └── systems
│       ├── CollisionSystem.js
│       ├── DamageSystem.js
│       ├── DeathSystem.js
│       ├── InputSystem.js
│       ├── LifetimeSystem.js
│       ├── MovementSystem.js
│       ├── RenderSystem.js
│       ├── RotationSystem.js
│       ├── ShootingSystem.js
│       └── SpawningSystem.js
├── next-env.d.ts
├── next.config.js
├── package-lock.json
├── package.json
├── postcss.config.js
├── public
│   ├── next.svg
│   └── vercel.svg
├── tailwind.config.ts
└── tsconfig.json

---

#ゲーム搭載機能ステータスレポート
#現在搭載されている機能を人間視点で記載

- スマートフォンブラウザ用縦画面シューティングゲーム（Next.js、javaScript、ECS思想）
- タイトル（ShootingGame7）を描画表示
- ゲームフィールド枠を描画表示
- 自機を描画表示
- 自機はマウス位置とタップスワイプ位置を目指し加減速移動
- 自機はキーボードでも操作可能なはずだが不具合で機能不全
- 自機は左右移動に伴い傾く
- 自機はマウス左クリック又はタップで自機の傾き方向に弾を発射
- 弾は一定時間後に消滅。
- 敵ジェネレータは１種類のみ。
- 敵は現在1種類、隕石のみ。
- 隕石は画面上方から一定時間毎に出現
- 隕石は画面出現後、下方に向いた方向に移動
- 弾の当たり判定が隕石に衝突すると弾消滅
- 弾の当たり判定が隕石の当たり判定に3回衝突すると隕石消滅
- 敵と自機の衝突判定は非搭載

- 敵チームは閾値外で消滅（開発中暫定仕様、エンティティ無限増でのRAM圧迫を抑止）
- デバッグ用数値を表示（マウス右クリックで表示ONとOFF切替）
- デバッグ機能はフラグ設定オフで全てオフに（現時点ではコリジョン範囲表示のみ例外、要整理）

