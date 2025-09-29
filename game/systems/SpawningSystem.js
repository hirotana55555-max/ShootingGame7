//出現（敵、第一号は隕石）

import { Generator } from '../components/index.js';
import { createMeteor } from '../core/entityFactory.js';

export class SpawningSystem {
  constructor(world) {
    this.world = world;
  }

  update(dt) {
    // 1. Generatorコンポーネントを持つエンティティをすべて見つける
    const generators = this.world.getEntities([Generator]);

    for (const entityId of generators) {
      const generator = this.world.getComponent(entityId, Generator);

      // 2. ジェネレータのタイマーを経過時間(dt)だけ減らす
      generator.timer -= dt;

      // 3. タイマーが0以下になったら、新しいエンティティを生成する
      if (generator.timer <= 0) {
        const config = generator.config;

        // 4. 設定に従ってエンティティを生成する (今回は隕石のみ)
        if (config.entityType === 'meteor') {
          // 画面上部のランダムなX座標を計算
          const spawnX = Math.random() * this.world.canvas.width;
          const spawnY = -50; // 画面外の上部から出現
          
          createMeteor(this.world, spawnX, spawnY);
        }

        // 5. タイマーをリセットして、次の生成に備える
        generator.timer = config.trigger.interval;
      }
    }
  }
}
