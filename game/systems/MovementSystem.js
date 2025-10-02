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

    // --- Part 1: プレイヤーの「目標速度」を決定する ---
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

            // 1. まず、キーボード入力に基づいて速度を計算する
            let keyDirX = 0;
            let keyDirY = 0;
            if (inputState.keys.has('arrowleft') || inputState.keys.has('a')) keyDirX = -1;
            if (inputState.keys.has('arrowright') || inputState.keys.has('d')) keyDirX = 1;
            if (inputState.keys.has('arrowup') || inputState.keys.has('w')) keyDirY = -1;
            if (inputState.keys.has('arrowdown') || inputState.keys.has('s')) keyDirY = 1;

            if (keyDirX !== 0 || keyDirY !== 0) {
                vel.vx += keyDirX * keyAcceleration;
                vel.vy += keyDirY * keyAcceleration;
            } else {
                // キー入力がない場合は、既存の速度を減速させる
                vel.vx *= keyDrag;
                vel.vy *= keyDrag;
            }

            // 2. 次に、マウス/タッチ入力が存在する場合、その情報で目標速度を「上書き」する
            if (inputState.target.x !== null) {
                let targetVelX = 0;
                let targetVelY = 0;
                const dx = inputState.target.x - pos.x;
                const dy = inputState.target.y - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // ターゲット地点から一定距離以上離れている場合のみ、移動する
                if (dist > stopRadius) {
                    const dirX = dx / dist;
                    const dirY = dy / dist;
                    targetVelX = dirX * maxSpeed;
                    targetVelY = dirY * maxSpeed;
                }
                // lerpを使用してスムーズに目標速度に近づける
                vel.vx = lerp(vel.vx, targetVelX, easing);
                vel.vy = lerp(vel.vy, targetVelY, easing);
            }

            // 3. 最後に、最大速度を超えないように速度を制限する
            const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
            if (speed > maxSpeed) {
                const ratio = maxSpeed / speed;
                vel.vx *= ratio;
                vel.vy *= ratio;
            }
        }
    }

    // --- Part 2: 全ての「速度を持つもの」の「位置」を更新する ---
    const movableEntities = this.world.getEntities([Position, Velocity]);
    for (const entityId of movableEntities) {
        const pos = this.world.getComponent(entityId, Position);
        const vel = this.world.getComponent(entityId, Velocity);

        // 速度に時間(dt)を掛けることで、フレームレートに依存しない移動を実現する。
        pos.x += vel.vx * dt * 60; // * 60 は速度のスケール調整
        pos.y += vel.vy * dt * 60; // * 60 は速度のスケール調整
    }
  }
}
