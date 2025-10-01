/**
 * @file /game/core/main.js
 * @description ゲーム全体の初期化、メインループの管理、そして終了処理を行うエントリーポイント。
 *              Reactコンポーネント（GameCanvas）から呼び出され、ECSベースのゲーム世界を起動・停止する責務を持つ。
 */

// 依存関係のインポート
// -----------------------------------------------------------------------------
// 設計思想書(DESIGN_DOCUMENT.md)で定義された各要素をインポートします。

// --- コア ---
// World: エンティティ、コンポーネント、システムを統括する「世界」そのもの。
import { World } from './World.js';
// createPlayer: プレイヤーエンティティを生成するための専門関数（工場）。
import { createPlayer } from './entityFactory.js';

// --- システム (専門家たち) ---
// それぞれが特定の役割（描画、入力、移動など）を持つロジックの実行者。
import { RenderSystem } from '../systems/RenderSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { RotationSystem } from '../systems/RotationSystem.js';
import { ShootingSystem } from '../systems/ShootingSystem.js';
import { LifetimeSystem } from '../systems/LifetimeSystem.js';
import { DamageSystem } from '../systems/DamageSystem.js';
import { DeathSystem } from '../systems/DeathSystem.js';
import { SpawningSystem } from '../systems/SpawningSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';

// --- コンポーネント (部品) ---
// Generator: 他エンティティを定期的に生成する機能を持つ部品。
import { Generator } from '../components/index.js';

// --- デバッグ用 ---
// 開発中にのみ使用する機能。製品版では無効化されるべきもの。
import { DebugConfig } from '../debug/DebugConfig.js';
import { DebugSystem } from '../debug/systems/DebugSystem.js';
import { OffscreenCleanupSystem } from '../debug/systems/OffscreenCleanupSystem.js';


// モジュールレベルの変数定義
// -----------------------------------------------------------------------------
// `world`: ゲーム世界全体を保持する変数。startGameで初期化される。
let world;
// `animationFrameId`: ゲームループのID。stopGameでループを停止するために使用する。
let animationFrameId;


/**
 * ゲームを開始し、初期化する関数。
 * @param {HTMLCanvasElement} canvas - 描画対象のcanvas要素。GameCanvas.tsxから渡される。
 */
export function startGame(canvas) {
  console.log("ゲームを開始します...");

  // 1. 世界(World)の準備
  // ---------------------------------------------------------------------------
  const context = canvas.getContext('2d'); // 2D描画を行うための「筆」や「絵の具」を取得。
  world = new World(); // 新しい世界を創造する。
  world.canvas = canvas; // 世界にcanvas要素を記憶させる。
  world.context = context; // 世界に描画コンテキストを記憶させる。

  // 2. システム(専門家)を世界に登録
  // ---------------------------------------------------------------------------
  // 設計思想に基づき、各システムをインスタンス化（実体化）して世界に追加する。
  // これにより、世界は様々なルール（物理法則、生命の理など）を持つことになる。
  // 登録された順番が、毎フレームの更新順序になるため、順番は重要。
  // 例：Input(入力) -> Movement(移動) -> Collision(衝突) -> Render(描画)
  world.addSystem(new InputSystem(world));
  world.addSystem(new LifetimeSystem(world));
  world.addSystem(new ShootingSystem(world));
  world.addSystem(new MovementSystem(world));
  world.addSystem(new RotationSystem(world));
  world.addSystem(new CollisionSystem(world));
  world.addSystem(new DamageSystem(world));
  world.addSystem(new DeathSystem(world));
  world.addSystem(new SpawningSystem(world));

  // ★★★ 開発用：デバッグ機能が有効な場合のみ、追加のシステムを登録 ★★★
  if (DebugConfig.ENABLED) {
    // 画面外に出たエンティティを掃除するシステム。
    world.addSystem(new OffscreenCleanupSystem(world));
  }

  // 描画システムは、全ての計算が終わった後に実行されるべきなので、最後に登録する。
  world.addSystem(new RenderSystem(world));

  // ★★★ 開発用：デバッグ描画は、通常の描画が全て終わった後に行う ★★★
  if (DebugConfig.ENABLED) {
    // 当たり判定の範囲などを可視化するシステム。
    world.addSystem(new DebugSystem(world));
  }


  // 3. 初期エンティティ(世界の住人)を生成
  // ---------------------------------------------------------------------------
  createPlayer(world); // プレイヤーを世界に創造する。

  // 隕石を定期的に生成するための「生成装置」エンティティを作成する。
  const meteorGenerator = world.createEntity();
  world.addComponent(meteorGenerator, new Generator({
    entityType: 'meteor', // 生成するエンティティの種類は「隕石」
    trigger: { interval: 2.0, initialDelay: 1.0 } // 1秒待ってから、2秒間隔で生成を開始
  }));


  // 4. ゲームループの定義と開始
  // ---------------------------------------------------------------------------
  let lastTime = 0; // 前回のフレーム実行時刻を保存する変数。

  /**
   * ゲームのメインループ。ブラウザの描画更新のタイミングで繰り返し呼び出される。
   * @param {number} currentTime - requestAnimationFrameから渡される高精度のタイムスタンプ。
   */
  function gameLoop(currentTime) {
    // デルタタイム(dt)の計算：前回のフレームから何秒経過したか。
    // これにより、PCの性能に依らず、ゲームの進行速度を一定に保つことができる。
    if (lastTime === 0) lastTime = currentTime;
    const dt = (currentTime - lastTime) / 1000; // ミリ秒を秒に変換
    lastTime = currentTime;

    // 画面のクリア
    // 前回のフレームで描画した内容を一旦すべて消去する。
    context.clearRect(0, 0, world.canvas.width, world.canvas.height);
    // 背景を黒で塗りつぶす。
    context.fillStyle = 'black';
    context.fillRect(0, 0, world.canvas.width, world.canvas.height);

    // 世界の更新
    // 登録された全てのシステムに、時間を `dt` だけ進めるよう指示する。
    // これにより、移動、発射、衝突判定などの全てのゲームロジックが実行される。
    world.update(dt);

    // 次のフレームを予約
    // ブラウザに「次の画面更新のタイミングで、もう一度gameLoopを実行してください」とお願いする。
    // これにより、滑らかなアニメーションが実現される。
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  // ゲームループを開始する。
  gameLoop(performance.now());
}

/**
 * ゲームを停止する関数。
 */
export function stopGame() {
  console.log("ゲームを停止します。");
  // `requestAnimationFrame`によるループをキャンセルする。
  // `animationFrameId` が存在する場合のみ（つまり、ゲームが実行中の場合のみ）実行。
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
}
