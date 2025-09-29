// game/systems/SpawningSystem.js 【このコードで全文を置き換えてください】

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
        // NOTE: 現状の実装では generator.config が存在しないため、直接フォールバックする
        const config = generator.config || { 
          entityType: 'meteor', 
          trigger: { interval: 2.0 } // デフォルト値
        };

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
