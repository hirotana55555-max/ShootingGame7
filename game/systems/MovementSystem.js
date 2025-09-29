// game/systems/MovementSystem.js

import { Position, Velocity, Controllable, InputState } from '../components/index.js';

function lerp(start, end, amount) {
  return (1 - amount) * start + amount * end;
}

export class MovementSystem {
  constructor(world) {
    this.world = world;
  }

  /**
   * @param {number} dt - 前フレームからの経過時間（秒単位）
   */
  update(dt) {
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
                vel.x = lerp(vel.x, targetVelX, easing);
                vel.y = lerp(vel.y, targetVelY, easing);
            } else {
                // キーボード操作
                let dirX = 0;
                let dirY = 0;
                if (inputState.keys.has('ArrowLeft')) dirX = -1;
                if (inputState.keys.has('ArrowRight')) dirX = 1;
                if (inputState.keys.has('ArrowUp')) dirY = -1;
                if (inputState.keys.has('ArrowDown')) dirY = 1;

                if (dirX !== 0 || dirY !== 0) {
                    vel.x += dirX * keyAcceleration;
                    vel.y += dirY * keyAcceleration;
                } else {
                    vel.x *= keyDrag;
                    vel.y *= keyDrag;
                }

                const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
                if (speed > maxSpeed) {
                    const ratio = maxSpeed / speed;
                    vel.x *= ratio;
                    vel.y *= ratio;
                }
            }
            // ★ プレイヤーの位置更新は Part 2 で一括処理
        }
    }

    // --- Part 2: 全ての「速度を持つもの」の「位置」を更新する ---
    const movableEntities = this.world.getEntities([Position, Velocity]);
    for (const entityId of movableEntities) {
        const pos = this.world.getComponent(entityId, Position);
        const vel = this.world.getComponent(entityId, Velocity);

        // ★ DeltaTime対応：60FPS基準の速度を維持
        pos.x += vel.x * dt * 60;
        pos.y += vel.y * dt * 60;
    }
  }
}