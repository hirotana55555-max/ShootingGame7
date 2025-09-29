// game/systems/LifetimeSystem.js 

import { Lifetime } from '../components/index.js';

export class LifetimeSystem {
  constructor(world) {
    this.world = world;
    this.query = [Lifetime]; // このシステムはLifetimeコンポーネントを持つものにのみ興味がある
  }

  update(dt) {
    const entities = this.world.getEntities(this.query);

    for (const entityId of entities) {
      const lifetime = this.world.getComponent(entityId, Lifetime);

      // 1. 寿命タイマーを経過時間(dt)だけ減らす
      lifetime.timer -= dt;

      // 2. もしタイマーが0以下になったら、エンティティをワールドから削除する
      if (lifetime.timer <= 0) {
        //this.world.removeEntity(entityId);//繰り返し中即削除は危険
        this.world.markForRemoval(entityId);// ★まとめて削除に修正
      }
    }
  }
}
