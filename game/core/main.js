// game/core/main.js
import { World } from './World.js';
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
import { createPlayer } from './entityFactory.js';
import { Generator } from '../components/index.js';

// ★★★ 開発用：DebugSystem の静的import（AI上書き後はこの行を再追加）★★★
import { DebugConfig } from '../debug/DebugConfig.js';
import { DebugSystem } from '../debug/systems/DebugSystem.js';
import { OffscreenCleanupSystem } from '../debug/systems/OffscreenCleanupSystem.js';
// ★★★ ここまで ★★★

let world;
let animationFrameId;

export function startGame(canvas) {
  console.log("ゲームを開始します...");
  const context = canvas.getContext('2d');
  world = new World();
  world.canvas = canvas;
  world.context = context;

  world.addSystem(new InputSystem(world));
  world.addSystem(new LifetimeSystem(world));
  world.addSystem(new ShootingSystem(world));
  world.addSystem(new MovementSystem(world));
  world.addSystem(new RotationSystem(world));
  world.addSystem(new CollisionSystem(world));
  world.addSystem(new DamageSystem(world));
  world.addSystem(new DeathSystem(world));
  world.addSystem(new SpawningSystem(world));

  // ★★★ 開発用：ロジック段階のシステム（Renderより前に実行）★★★
  if (DebugConfig.ENABLED) {
    world.addSystem(new OffscreenCleanupSystem(world));
  }

  world.addSystem(new RenderSystem(world));

  // ★★★ 開発用：描画段階のシステム（すべての描画の後に実行）★★★
  if (DebugConfig.ENABLED) {
    world.addSystem(new DebugSystem(world));
  }

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

    context.clearRect(0, 0, world.canvas.width, world.canvas.height);
    context.fillStyle = 'black';
    context.fillRect(0, 0, world.canvas.width, world.canvas.height);

    world.update(dt);

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  gameLoop(performance.now());
}

export function stopGame() {
  console.log("ゲームを停止します。");
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}