// game/core/main.js

import { World } from './World.js';
// (import文は変更なし)
import { RenderSystem } from '../systems/RenderSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { RotationSystem } from '../systems/RotationSystem.js';
import { ShootingSystem } from '../systems/ShootingSystem.js';
import { LifetimeSystem } from '../systems/LifetimeSystem.js';
import { DamageSystem } from '../systems/DamageSystem.js';
import { DeathSystem } from '../systems/DeathSystem.js';
import { DebugSystem } from '../systems/DebugSystem.js';
import { SpawningSystem } from '../systems/SpawningSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { createPlayer } from './entityFactory.js';
import { Generator } from '../components/index.js';

let world;
let animationFrameId;

export function startGame(canvas) {
  // (startGameのシステム追加部分は変更なし)
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
  world.addSystem(new RenderSystem(world));
  world.addSystem(new DebugSystem(world));

  createPlayer(world);

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ★ ゲーム開始時に、隕石を生成するためのジェネレータを1つ作成する ★
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const meteorGenerator = world.createEntity();
  world.addComponent(meteorGenerator, new Generator({
    entityType: 'meteor',
    trigger: {
      interval: 2.0, // 2秒ごとに
      initialDelay: 1.0 // 最初の1秒後から
    }
  }));
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★


  // --- gameLoopの修正 ---
  let lastTime = 0;
  function gameLoop(currentTime) {
    if (lastTime === 0) {
        lastTime = currentTime;
    }
    // ★★★ dtの計算をここに集約 ★★★
    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    context.clearRect(0, 0, world.canvas.width, world.canvas.height);
    context.fillStyle = 'black';
    context.fillRect(0, 0, world.canvas.width, world.canvas.height);

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★ 原因切り分けのため、currentTimeを直接描画してみる ★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    context.fillStyle = 'yellow';
    context.font = '16px Arial';
    context.fillText(`CurrentTime: ${currentTime}`, 10, 140);
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★



    // ★★★ 計算したdtをworld.updateに渡す ★★★
    world.update(dt);

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  gameLoop(performance.now());
}

export function stopGame() {
  console.log("ゲームを停止します。");
  cancelAnimationFrame(animationFrameId);
}
