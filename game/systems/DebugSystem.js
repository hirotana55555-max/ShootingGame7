// game/systems/DebugSystem.js 【最終修正版】

import { Controllable } from '../components/index.js';

export class DebugSystem {
  constructor(world) {
    this.world = world;
    this.fps = 0;
    this.frames = 0;
    this.lastFpsUpdateTime = 0; // FPS更新専用のタイムスタンプ 
  }

  update(dt) { // ← main.jsから渡されるdtを正しく使う
    const currentTime = performance.now();

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

    // --- デバッグ情報取得 ---
    const context = this.world.context;
    const controllableEntities = this.world.getEntities([Controllable]);
    const playerCount = controllableEntities.length;
    const totalEntities = this.world.entities.size;

    // --- デバッグ情報描画 ---
    context.fillStyle = 'white';
    context.font = '16px Arial';
    context.fillText(`FPS: ${this.fps}`, 10, 20);
    
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★  main.jsから渡されたdtを、そのまま表示します  ★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    context.fillText(`DeltaTime: ${dt.toFixed(4)}`, 10, 40); 
    
    context.fillStyle = 'lime';
    context.font = '20px Arial';
    context.fillText(`PLAYER COUNT: ${playerCount}`, 10, 80);
    context.fillText(`TOTAL ENTITIES: ${totalEntities}`, 10, 110);
  }
}
