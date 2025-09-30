// game/systems/SpawningSystem.js
import { Generator } from '../components/index.js';
import { createMeteor } from '../core/entityFactory.js';

export class SpawningSystem {
  constructor(world) {
    this.world = world;
  }

  update(dt) {
    const generators = this.world.getEntities([Generator]);

    for (const entityId of generators) {
      const generator = this.world.getComponent(entityId, Generator);
      generator.timer -= dt;

      if (generator.timer <= 0) {
        const config = generator.config;

        if (config.entityType === 'meteor') {
          const spawnX = Math.random() * this.world.canvas.width;
          const spawnY = -50;
          
          // ★★★ 変更点：引数をオブジェクト形式で渡す ★★★
          createMeteor(this.world, { x: spawnX, y: spawnY });
        }

        generator.timer = config.trigger.interval;
      }
    }
  }
}
