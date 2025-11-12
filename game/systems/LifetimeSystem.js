// game/systems/LifetimeSystem.js 

import { Lifetime } from '../components/index.js';

export class LifetimeSystem {
  constructor(world) {
    this.world = world;
    this.query = [Lifetime];
  }

  update(dt) {
    const entities = this.world.getEntities(this.query);

    for (const entityId of entities) {
      const lifetime = this.world.getComponent(entityId, Lifetime);

      // ▼▼▼ ここが新しいプロパティ名に変わっています ▼▼▼
      lifetime.remainingTime -= dt;

      if (lifetime.remainingTime <= 0) {
      // ▲▲▲ ここまで ▲▲▲
        this.world.markForRemoval(entityId);
      }
    }
  }
}
