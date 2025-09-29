// game/systems/RotationSystem.js 

import { Velocity, Rotation } from '../components/index.js';

// 線形補間関数 (lerp)。2つの値の間を滑らかに補間します。
function lerp(start, end, amount) {
  return (1 - amount) * start + amount * end;
}

/**
 * エンティティの速度に応じて、回転角度を滑らかに更新するシステム
 */
export class RotationSystem {
  constructor(world) {
    this.world = world;
  }

  update(dt) {
    // VelocityとRotationの両方を持つエンティティを探す
    const entities = this.world.getEntities([Velocity, Rotation]);

    // --- 調整用パラメータ ---
    // どのくらい傾けるか (値を大きくすると、より深く傾く)
    const tiltFactor = 0.05; 
    // どのくらい滑らかに追従するか (0.1でぬるぬる、0.3でキビキビ)
    const easing = 0.1;

    for (const entityId of entities) {
      const vel = this.world.getComponent(entityId, Velocity);
      const rot = this.world.getComponent(entityId, Rotation);

      // 1. X軸の速度に基づいて「目標となる角度」を計算する
      const targetAngle = vel.x * tiltFactor;

      // 2. 現在の角度を、目標の角度に滑らかに近づける (Lerp)
      rot.angle = lerp(rot.angle, targetAngle, easing);
    }
  }
}
