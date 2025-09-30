// game/debug/systems/DebugSystem.js
import { Controllable, Position, Bullet, Team, Collidable } from '../../components/index.js';

export class DebugSystem {
  constructor(world) {
    this.world = world;
    this.fps = 0;
    this.frames = 0;
    this.lastFpsUpdateTime = performance.now();
    this.isVisible = true;
    this.setupMouseControls();
  }

  setupMouseControls() {
    if (typeof window === 'undefined' || !this.world.canvas) return;
    this.world.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.isVisible = !this.isVisible;
      console.log('Debug Display:', this.isVisible ? 'ON' : 'OFF');
    });
  }

  update(dt) {
    // FPS計算
    this.frames++;
    const now = performance.now();
    if (now - this.lastFpsUpdateTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastFpsUpdateTime = now;
    }

    if (!this.isVisible) return;

    const context = this.world.context;
    const currentTime = performance.now();

    // --- 基本情報（左上） ---
    context.fillStyle = 'white';
    context.font = '16px Arial';
    context.fillText(`FPS: ${this.fps}`, 10, 20);
    context.fillText(`DeltaTime: ${dt.toFixed(4)}`, 10, 40);
    context.fillText(`Canvas: ${this.world.canvas.width}x${this.world.canvas.height}`, 10, 60);

    // --- エンティティ数分析（左上） ---
    const allEntities = Array.from(this.world.entities.keys());
    const positionEntities = allEntities.filter(id => this.world.hasComponent(id, Position));
    const bulletEntities = allEntities.filter(id => this.world.hasComponent(id, Bullet));
    const meteorEntities = positionEntities.filter(id => {
      const team = this.world.getComponent(id, Team);
      return team && team.id === 'enemy';
    });

    context.fillStyle = 'cyan';
    context.fillText(`ENTITY_ALL: ${allEntities.length}`, 10, 90);
    context.fillText(`POSITION: ${positionEntities.length}`, 10, 110);
    context.fillText(`BULLET: ${bulletEntities.length}`, 10, 130);
    context.fillText(`METEOR: ${meteorEntities.length}`, 10, 150);

    // ★★★ 新規：隕石監視パネル（右上） ★★★
    context.fillStyle = 'magenta';
    context.font = '14px Arial';
    let monitorY = 20; // 右上の開始Y座標
    context.fillText(`--- METEOR MONITOR ---`, this.world.canvas.width - 200, monitorY);
    monitorY += 20;

    if (meteorEntities.length > 0) {
      // 隕石の最大Y座標を取得
      let maxY = -Infinity;
      for (const id of meteorEntities) {
        const pos = this.world.getComponent(id, Position);
        if (pos.y > maxY) maxY = pos.y;
      }
      context.fillText(`MAX_Y: ${maxY.toFixed(1)}`, this.world.canvas.width - 200, monitorY);
      monitorY += 20;

      // 削除ライン（canvasHeight）
      const removeLine = this.world.canvas.height;
      context.fillText(`REMOVE_LINE: ${removeLine}`, this.world.canvas.width - 200, monitorY);
      monitorY += 20;

      // 現在削除対象か？
      const isOver = maxY > removeLine;
      context.fillStyle = isOver ? 'red' : 'green';
      context.fillText(`OVER LINE? ${isOver ? 'YES' : 'NO'}`, this.world.canvas.width - 200, monitorY);
      monitorY += 20;
      context.fillStyle = 'magenta';

      // 先頭隕石のIDと座標
      const firstId = meteorEntities[0];
      const firstPos = this.world.getComponent(firstId, Position);
      context.fillText(`FIRST#: ${firstId} at (${firstPos.x.toFixed(1)}, ${firstPos.y.toFixed(1)})`, this.world.canvas.width - 200, monitorY);
    } else {
      context.fillText(`No meteors found`, this.world.canvas.width - 200, monitorY);
    }

    // --- プレイヤー情報（左下） ---
    context.fillStyle = 'lime';
    context.font = '16px monospace';
    let yOffset = this.world.canvas.height - 180;
    context.fillText(`--- PLAYER DEBUG ---`, 10, yOffset);
    yOffset += 20;
    const controllableEntities = allEntities.filter(id => this.world.hasComponent(id, Controllable));
    if (controllableEntities.length > 0) {
      const playerId = controllableEntities[0];
      const position = this.world.getComponent(playerId, Position);
      context.fillText(`  Position: x=${position.x.toFixed(1)}, y=${position.y.toFixed(1)}`, 15, yOffset);
      yOffset += 20;
    } else {
      context.fillText(`  Player: NOT FOUND`, 15, yOffset);
      yOffset += 20;
    }

    // --- 弾丸デバッグ情報（左下） ---
    context.fillStyle = 'cyan';
    context.fillText(`--- BULLET DEBUG ---`, 10, yOffset);
    yOffset += 20;

    if (bulletEntities.length > 0) {
      const bulletId = bulletEntities[0];
      context.fillText(`  Bullet ID: ${bulletId}`, 10, yOffset);
      yOffset += 20;

      const team = this.world.getComponent(bulletId, Team);
      if (team) {
        context.fillText(`  Team.id = ${team.id}`, 15, yOffset);
        yOffset += 20;
      } else {
        context.fillText(`  Team: NOT FOUND`, 15, yOffset);
        yOffset += 20;
      }

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