import { Health } from '../components/index.js';

export class DeathSystem {
  constructor(world) {
    this.world = world;
  }

  update(dt) {
    // 1. Healthコンポーネントを持つエンティティをすべて取得 
    const entities = this.world.getEntities([Health]);

    for (const entityId of entities) {
      const health = this.world.getComponent(entityId, Health);

      // 2. HPが0以下になっていたら...
      if (health.current <= 0) {
        // 3. そのエンティティをワールドから削除するよう予約する
        this.world.markForRemoval(entityId);
        console.log(`エンティティ(${entityId})がHPゼロのため消滅`);
      }
    }
  }
}
