/**
 * @file /game/core/main.js
 * @description ゲーム全体の初期化、メインループの管理、そして終了処理を行うエントリーポイント。
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

  const alwaysUpdateSystems = [];
  const gameLogicSystems = [];
  let debugSystem = null; // DebugSystemを特別扱いするため、別の変数に保持

  // グループA: 常に更新 (入力と制御のみ)
  alwaysUpdateSystems.push(new InputSystem(world));
  if (DebugConfig.ENABLED) {
    alwaysUpdateSystems.push(new DebugControlSystem(world));
  }

  // グループB: ポーズ中に停止
  gameLogicSystems.push(new LifetimeSystem(world));
  gameLogicSystems.push(new ShootingSystem(world));
  gameLogicSystems.push(new MovementSystem(world));
  gameLogicSystems.push(new RotationSystem(world));
  gameLogicSystems.push(new CollisionSystem(world));
  gameLogicSystems.push(new DamageSystem(world));
  gameLogicSystems.push(new DeathSystem(world));
  gameLogicSystems.push(new SpawningSystem(world));
  if (DebugConfig.ENABLED) {
    gameLogicSystems.push(new OffscreenCleanupSystem(world));
  }
  gameLogicSystems.push(new RenderSystem(world)); // ゲームオブジェクトの描画は最後

  // DebugSystemは描画の最後、かつ特別扱い
  if (DebugConfig.ENABLED) {
    debugSystem = new DebugSystem(world);
  }

  // Worldに全システムを登録
  const allSystems = [...alwaysUpdateSystems, ...gameLogicSystems];
  if (debugSystem) allSystems.push(debugSystem);
  allSystems.forEach(s => world.addSystem(s));

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

    // 1. 常に更新されるシステムを実行 (入力と制御)
    alwaysUpdateSystems.forEach(system => system.update(dt));

    const shouldUpdateLogic = !world.isPaused || world.stepFrame;

    // 2. 画面をクリア (ポーズ中はクリアしない)
    if (shouldUpdateLogic) {
      world.context.clearRect(0, 0, world.canvas.width, world.canvas.height);
      world.context.fillStyle = 'black';
      world.context.fillRect(0, 0, world.canvas.width, world.canvas.height);
    }

    // 3. ゲームロジックと描画を更新 (ポーズ中は更新しない)
    if (shouldUpdateLogic) {
      gameLogicSystems.forEach(system => system.update(dt));
      
      world.flushRemovals();
      world.processEvents();

      if (world.stepFrame) {
        world.stepFrame = false;
      }
    }

    // 4. デバッグ情報を常に最前面に描画
    if (debugSystem) {
      debugSystem.update(dt);
    }

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
