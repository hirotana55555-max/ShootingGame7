// game/systems/DebugSystem.js 【このコードで全文を置き換えてください】

import { Controllable, Position, Renderable } from '../components/index.js';

export class DebugSystem {
  constructor(world) {
    this.world = world;
    this.fps = 0;
    this.frames = 0;
    this.lastFpsUpdateTime = 0;
  }

  update(dt) {
    const currentTime = performance.now();
    const context = this.world.context;

    // --- FPS計算 ---
    this.frames++;
    if (this.lastFpsUpdateTime === 0) {
        this.lastFpsUpdateTime = currentTime;
    }
    if (currentTime >= this.lastFpsUpdateTime + 1000) {
        this.fps = this.frames;
        this.frames = 0;
        this.lastFpsUpdateTime = currentTime;
    }

    // --- 基本的なデバッグ情報描画 ---
    context.fillStyle = 'white';
    context.font = '16px Arial';
    context.fillText(`FPS: ${this.fps}`, 10, 20);
    context.fillText(`DeltaTime: ${dt.toFixed(4)}`, 10, 40);
    context.fillText(`TOTAL ENTITIES: ${this.world.entities.size}`, 10, 60);

    // --- CurrentTimeタイマー表示 ---
    context.fillStyle = 'yellow';
    context.font = '16px Arial';
    context.fillText(`CurrentTime: ${currentTime.toFixed(0)}`, 10, 80);

    // --- プレイヤー詳細デバッグ情報 ---
    const controllableEntities = this.world.getEntities([Controllable]);
    const playerCount = controllableEntities.length;
    
    context.fillStyle = 'lime';
    context.font = '16px monospace';
    let yOffset = 120;

    context.fillText(`--- PLAYER DEBUG ---`, 10, yOffset);
    yOffset += 20;

    if (playerCount > 0) {
      const playerId = controllableEntities[0];
      context.fillText(`Player ID: ${playerId}`, 10, yOffset);
      yOffset += 20;

      const position = this.world.getComponent(playerId, Position);
      if (position) {
        context.fillText(`  Position.x = ${position.x}`, 15, yOffset);
        yOffset += 20;
        context.fillText(`  Position.y = ${position.y}`, 15, yOffset);
        yOffset += 20;
      } else {
        context.fillText(`  Position: NOT FOUND`, 15, yOffset);
        yOffset += 20;
      }

      const renderable = this.world.getComponent(playerId, Renderable);
      if (renderable) {
        context.fillText(`  Renderable.shape = ${renderable.shape}`, 15, yOffset);
        yOffset += 20;
      } else {
        context.fillText(`  Renderable: NOT FOUND`, 15, yOffset);
        yOffset += 20;
      }
    } else {
      context.fillText(`Player: NOT FOUND`, 10, yOffset);
      yOffset += 20; // Player NOT FOUND の場合も yOffset を進めておく
    }

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★ ここが、NaNの源流を探るための、我々の新しい仮説検証コードだ ★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Canvas Size: ${this.world.canvas.width} x ${this.world.canvas.height}`, 10, yOffset);
  }
}
