// game/systems/ShootingSystem.js

import { Controllable, InputState, Position, Rotation, Team } from '../components/index.js';
import { createBullet } from '../core/entityFactory.js';
// import { DebugVector } from '../debug/components/DebugVector.js'; // 不要になった
import { DebugConfig } from '../debug/DebugConfig.js';

export class ShootingSystem {
  constructor(world) {
    this.world = world;
    this.query = [Controllable, Position, Rotation, Team];
  }

  update(dt) {
    const inputEntities = this.world.getEntities([InputState]);
    if (inputEntities.length === 0) return;
    const inputState = this.world.getComponent(inputEntities[0], InputState);

    // --- ▼▼▼ 変更箇所 ▼▼▼ ---
    // ポインターが押されているか、またはスペースバーが押されているかを確認
    const isShooting = inputState.isPointerDown || inputState.keys.has(' ');
    if (!isShooting) return;
    // --- ▲▲▲ 変更ここまで ▲▲▲ ---

    const shooters = this.world.getEntities(this.query);
    for (const entityId of shooters) {
      const position = this.world.getComponent(entityId, Position);
      const rotation = this.world.getComponent(entityId, Rotation);
      const team = this.world.getComponent(entityId, Team);

      const speed = 10.0;
      const angle = rotation ? rotation.angle : 0;
      const vx = Math.sin(angle) * speed;
      const vy = -Math.cos(angle) * speed;

      createBullet(this.world, {
        ownerPosition: position,
        ownerTeam: team.id,
        vx: vx,
        vy: vy
      });
    }

    // 処理済みの入力状態をクリアする
    if (inputState.isPointerDown) {
      inputState.isPointerDown = false;
    }
    if (inputState.keys.has(' ')) {
      inputState.keys.delete(' ');
    }
  }
}
