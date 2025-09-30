// game/systems/MovementSystem.js

import { Position, Velocity, Controllable, InputState } from '../components/index.js';

function lerp(start, end, amount) {
  return (1 - amount) * start + amount * end;
}

export class MovementSystem {
  constructor(world) {
    this.world = world;
  }

  update(dt) {
    // dtがNaNでないことを保証するガード節
    if (typeof dt !== 'number' || isNaN(dt)) {
      return; 
    }

    // --- Part 1: プレイヤーの「速度」を決定する ---
    const inputEntities = this.world.getEntities([InputState]);
    if (inputEntities.length > 0) {
        const inputState = this.world.getComponent(inputEntities[0], InputState);
        const controllableEntities = this.world.getEntities([Controllable, Position, Velocity]);
        
        const maxSpeed = 7;
        const easing = 0.15;
        const stopRadius = 50.0;
        const keyAcceleration = 1.0;
        const keyDrag = 0.95;

        for (const entityId of controllableEntities) {
            const pos = this.world.getComponent(entityId, Position);
            const vel = this.world.getComponent(entityId, Velocity);

            if (inputState.target.x !== null) {
                // マウス操作
                let targetVelX = 0;
                let targetVelY = 0;
                const dx = inputState.target.x - pos.x;
                const dy = inputState.target.y - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > stopRadius) {
                    const dirX = dx / dist;
                    const dirY = dy / dist;
                    targetVelX = dirX * maxSpeed;
                    targetVelY = dirY * maxSpeed;
                }
                // ★★★ 修正点：vel.x -> vel.vx, vel.y -> vel.vy ★★★
                vel.vx = lerp(vel.vx, targetVelX, easing);
                vel.vy = lerp(vel.vy, targetVelY, easing);
            } else {
                // キーボード操作
                let dirX = 0;
                let dirY = 0;
                if (inputState.keys.has('ArrowLeft')) dirX = -1;
                if (inputState.keys.has('ArrowRight')) dirX = 1;
                if (inputState.keys.has('ArrowUp')) dirY = -1;
                if (inputState.keys.has('ArrowDown')) dirY = 1;

                if (dirX !== 0 || dirY !== 0) {
                    // ★★★ 修正点：vel.x -> vel.vx, vel.y -> vel.vy ★★★
                    vel.vx += dirX * keyAcceleration;
                    vel.vy += dirY * keyAcceleration;
                } else {
                    // ★★★ 修正点：vel.x -> vel.vx, vel.y -> vel.vy ★★★
                    vel.vx *= keyDrag;
                    vel.vy *= keyDrag;
                }

                // ★★★ 修正点：vel.x -> vel.vx, vel.y -> vel.vy ★★★
                const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
                if (speed > maxSpeed) {
                    const ratio = maxSpeed / speed;
                    // ★★★ 修正点：vel.x -> vel.vx, vel.y -> vel.vy ★★★
                    vel.vx *= ratio;
                    vel.vy *= ratio;
                }
            }
        }
    }

    // --- Part 2: 全ての「速度を持つもの」の「位置」を更新する ---
    const movableEntities = this.world.getEntities([Position, Velocity]);
    for (const entityId of movableEntities) {
        const pos = this.world.getComponent(entityId, Position);
        const vel = this.world.getComponent(entityId, Velocity);

        // ★★★ 修正点：vel.x -> vel.vx, vel.y -> vel.vy ★★★
        // また、dtが可変であるため、* 60 のような固定値での補正は挙動を不安定にするため削除。
        // 速度の調整は keyAcceleration や maxSpeed で行うのが正しいアプローチ。
        pos.x += vel.vx;
        pos.y += vel.vy;
    }
  }
}
