// game/systems/DebugSystem.js 【最終検証形態】

import { Controllable, Position, Renderable, Bullet, Team, Collidable } from '../components/index.js';

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

    // (基本的なデバッグ情報描画部分は、変更なし)
    context.fillStyle = 'white';
    context.font = '16px Arial';
    context.fillText(`FPS: ${this.fps}`, 10, 20);
    context.fillText(`DeltaTime: ${dt.toFixed(4)}`, 10, 40);
    context.fillText(`TOTAL ENTITIES: ${this.world.entities.size}`, 10, 60);
    context.fillStyle = 'yellow';
    context.fillText(`CurrentTime: ${currentTime.toFixed(0)}`, 10, 80);
    context.fillStyle = 'red';
    context.fillText(`Canvas Size: ${this.world.canvas.width} x ${this.world.canvas.height}`, 10, 100);

    // --- プレイヤー詳細デバッグ情報 ---
    context.fillStyle = 'lime';
    context.font = '16px monospace';
    let yOffset = 140;
    context.fillText(`--- PLAYER DEBUG ---`, 10, yOffset);
    yOffset += 20;
    const controllableEntities = this.world.getEntities([Controllable]);
    if (controllableEntities.length > 0) {
      const playerId = controllableEntities[0];
      const position = this.world.getComponent(playerId, Position);
      context.fillText(`  Position: x=${position.x.toFixed(1)}, y=${position.y.toFixed(1)}`, 15, yOffset);
      yOffset += 20;
    } else {
      context.fillText(`  Player: NOT FOUND`, 15, yOffset);
      yOffset += 20;
    }

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★ ここからが、弾丸のコンポーネントを検証するための新しいコードだ ★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    context.fillStyle = 'cyan'; // 弾丸情報はシアンで表示
    context.fillText(`--- BULLET DEBUG ---`, 10, yOffset);
    yOffset += 20;

    const bulletEntities = this.world.getEntities([Bullet]); // Bulletコンポーネントを持つものを探す
    if (bulletEntities.length > 0) {
      const bulletId = bulletEntities[0]; // 最初の弾丸をターゲットにする
      context.fillText(`  Bullet ID: ${bulletId}`, 10, yOffset);
      yOffset += 20;

      // Teamコンポーネントの状態を表示
      const team = this.world.getComponent(bulletId, Team);
      if (team) {
        context.fillText(`  Team.id = ${team.id}`, 15, yOffset);
        yOffset += 20;
      } else {
        context.fillText(`  Team: NOT FOUND`, 15, yOffset);
        yOffset += 20;
      }

      // Collidableコンポーネントの状態を表示
      const collidable = this.world.getComponent(bulletId, Collidable);
      if (collidable) {
        context.fillText(`  Collidable.group = ${collidable.group}`, 15, yOffset);
        yOffset += 20;
      } else {
        context.fillText(`  Collidable: NOT FOUND`, 15, yOffset);
        yOffset += 20;
      }

    } else {
      context.fillText(`  Bullet: NOT FOUND`, 10, yOffset);
    }
  }
}
