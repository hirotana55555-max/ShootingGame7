import { Collidable, Position } from '../components/index.js';

export class CollisionSystem {
  constructor(world) {
    this.world = world;
  }

  update(dt) {
    const entities = this.world.getEntities([Collidable, Position]);
    
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entityA = entities[i];
        const entityB = entities[j];

        const collidableA = this.world.getComponent(entityA, Collidable);
        const positionA = this.world.getComponent(entityA, Position);

        const collidableB = this.world.getComponent(entityB, Collidable);
        const positionB = this.world.getComponent(entityB, Position);

        // --- 設計ルール適用: 存在確認 ---
        // このループ内ではエンティティの存在は保証されているが念のため
        if (!collidableA || !positionA || !collidableB || !positionB) {
          continue;
        }

        if (collidableA.group === collidableB.group) {
          continue;
        }

        const dx = positionA.x - positionB.x;
        const dy = positionA.y - positionB.y;
        const distanceSq = dx * dx + dy * dy;

        const radiusSum = collidableA.radius + collidableB.radius;
        const radiusSumSq = radiusSum * radiusSum;

        if (distanceSq < radiusSumSq) {
          // ★★★ 変更点：'emitEvent' から 'publish' へ ★★★
          // イベントタイプを大文字に統一（慣習）
          this.world.publish({
            type: 'COLLISION',
            entities: [entityA, entityB], // 設計ルール適用: IDのみを配列で渡す
            groups: [collidableA.group, collidableB.group]
          });
        }
      }
    }
  }
}
