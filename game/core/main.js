/**
 * @file /game/core/main.js
 * @description ゲーム全体の初期化、メインループの管理、そして終了処理を行うエントリーポイント。
 *              Reactコンポーネント（GameCanvas）から呼び出され、ECSベースのゲーム世界を起動・停止する責務を持つ。
 */

// (インポート文は変更なし)
import { World } from './World.js';
import { createPlayer } from './entityFactory.js';
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
import { Generator } from '../components/index.js';
import { DebugConfig } from '../debug/DebugConfig.js';
import { DebugSystem } from '../debug/systems/DebugSystem.js';
import { OffscreenCleanupSystem } from '../debug/systems/OffscreenCleanupSystem.js';
import { DebugControlSystem } from '../debug/systems/DebugControlSystem.js';

let world;
let animationFrameId;

export function startGame(canvas) {
  console.log("ゲームを開始します...");

  world = new World();
  world.canvas = canvas;
  world.context = canvas.getContext('2d');

  // ★★★ 改変箇所 1: システムをグループ分けして登録 ★★★
  // ---------------------------------------------------------------------------
  // グループA: 常に更新されるシステム (入力、デバッグ制御、デバッグ描画)
  const alwaysUpdateSystems = [
    new InputSystem(world),
  ];
  if (DebugConfig.ENABLED) {
    alwaysUpdateSystems.push(new DebugControlSystem(world));
    alwaysUpdateSystems.push(new DebugSystem(world));
  }
  alwaysUpdateSystems.forEach(s => world.addSystem(s));

  // グループB: ゲームロジック (ポーズ中に停止するシステム)
  const gameLogicSystems = [
    new LifetimeSystem(world),
    new ShootingSystem(world),
    new MovementSystem(world),
    new RotationSystem(world),
    new CollisionSystem(world),
    new DamageSystem(world),
    new DeathSystem(world),
    new SpawningSystem(world),
  ];
  if (DebugConfig.ENABLED) {
    gameLogicSystems.push(new OffscreenCleanupSystem(world));
  }
  // 描画は最後
  gameLogicSystems.push(new RenderSystem(world));
  gameLogicSystems.forEach(s => world.addSystem(s));
  // ---------------------------------------------------------------------------

  createPlayer(world);
  const meteorGenerator = world.createEntity();
  world.addComponent(meteorGenerator, new Generator({
    entityType: 'meteor',
    trigger: { interval: 2.0, initialDelay: 1.0 }
  }));

  let lastTime = 0;

  function gameLoop(currentTime) {
    if (lastTime === 0) lastTime = currentTime;
    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // 画面クリアは常に行う
    world.context.clearRect(0, 0, world.canvas.width, world.canvas.height);
    world.context.fillStyle = 'black';
    world.context.fillRect(0, 0, world.canvas.width, world.canvas.height);

    // ★★★ 改変箇所 2: システムをグループごとに更新 ★★★
    // -------------------------------------------------------------------------
    // グループAは常に更新
    alwaysUpdateSystems.forEach(system => system.update(dt));

    const shouldUpdateLogic = !world.isPaused || world.stepFrame;
    if (shouldUpdateLogic) {
      // グループBはポーズ中でない場合のみ更新
      gameLogicSystems.forEach(system => system.update(dt));
      
      // Worldのコアな更新処理（イベント処理、エンティティ削除）もここで行う
      world.flushRemovals();
      world.processEvents();

      if (world.stepFrame) {
        world.stepFrame = false;
      }
    }
    // -------------------------------------------------------------------------

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  gameLoop(performance.now());
}

export function stopGame() {
  console.log("ゲームを停止します。");
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
}
