// game/debug/systems/OffscreenCleanupSystem.js
import { Position, Team } from '../../components/index.js';

export class OffscreenCleanupSystem {
  constructor(world) {
    this.world = world;
    this.canvasWidth = 360;
    this.canvasHeight = 580;
    this.margin = 50; // 左右・上
  }

  update() {
    const minX = -this.margin;
    const maxX = this.canvasWidth + this.margin;
    const minY = -this.margin;
    const maxY = this.canvasHeight; // 下方向マージン0

    const entities = this.world.getEntities([Position]);
    for (const entityId of entities) {
      const pos = this.world.getComponent(entityId, Position);
      if (!pos) continue;

      const { x, y } = pos;
      if (x < minX || x > maxX || y < minY || y > maxY) {
        const team = this.world.getComponent(entityId, Team);
        const isEnemy = team && team.id === 'enemy';
        if (isEnemy) {
          // ★★★ 正しい削除方法：markForRemoval ★★★
          this.world.markForRemoval(entityId);
          console.log(`[Cleanup] Marked meteor #${entityId} for removal at (${x.toFixed(1)}, ${y.toFixed(1)})`);
        }
      }
    }
  }
}