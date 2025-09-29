// game/systems/ShootingSystem.js 【このコードで全文を置き換えてください】

import { Controllable, InputState, Position, Rotation, Team } from '../components/index.js';
import { createBullet } from '../core/entityFactory.js';

export class ShootingSystem {
  constructor(world) {
    this.world = world;
    this.query = [Controllable, Position, Rotation, Team]; // 射撃可能なエンティティの条件
  }

  update(dt) {
    const inputEntities = this.world.getEntities([InputState]);
    if (inputEntities.length === 0) return;
    const inputState = this.world.getComponent(inputEntities[0], InputState);

    if (!inputState.isMouseDown) {
      return;
    }

    const shooters = this.world.getEntities(this.query);
    for (const entityId of shooters) {
      const position = this.world.getComponent(entityId, Position);
      const rotation = this.world.getComponent(entityId, Rotation);
      const team = this.world.getComponent(entityId, Team);

      // ★★★ 変更点：引数をオブジェクト形式で渡す ★★★
      createBullet(this.world, {
        ownerPosition: position,
        ownerRotation: rotation,
        ownerTeam: team.id
      });
    }

    inputState.isMouseDown = false;
  }
}
