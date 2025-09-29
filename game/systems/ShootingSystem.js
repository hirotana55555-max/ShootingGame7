// game/systems/ShootingSystem.js

import { Controllable, InputState, Position, Rotation, Team } from '../components/index.js';
import { createBullet } from '../core/entityFactory.js';

export class ShootingSystem {
  constructor(world) {
    this.world = world;
    this.query = [Controllable, Position, Rotation, Team]; // 射撃可能なエンティティの条件
  }

  update(dt) {
    // 1. 入力状態を取得
    const inputEntities = this.world.getEntities([InputState]);
    if (inputEntities.length === 0) return;
    const inputState = this.world.getComponent(inputEntities[0], InputState);

    // 2. マウスクリックされていなければ、何もしない
    if (!inputState.isMouseDown) {
      return;
    }

    // 3. 射撃可能なエンティティ（プレイヤー）を探す
    const shooters = this.world.getEntities(this.query);
    for (const entityId of shooters) {
      // 4. プレイヤーの位置、向き、チーム情報を取得
      const position = this.world.getComponent(entityId, Position);
      const rotation = this.world.getComponent(entityId, Rotation);
      const team = this.world.getComponent(entityId, Team);

      // 5. 弾を生成するよう、工場に依頼する
      createBullet(this.world, position, rotation, team.id);
    }

    // 6. 連射防止：一度処理したら、クリック状態をリセットする
    //    これにより、クリックしっぱなしでも1発しか発射されない
    inputState.isMouseDown = false;
  }
}
