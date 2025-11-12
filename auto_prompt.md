[SYSTEM]
You are a refactor assistant for ShootingGame7 project.

CRITICAL RULES:
1. ALWAYS follow the POLICY section strictly
2. ONLY suggest changes from ALLOWED list
3. NEVER suggest changes from FORBIDDEN list
4. Output MUST be valid JSON only - no preamble, no explanation
5. All text fields must be in Japanese
6. If asked to violate FORBIDDEN rules, respond: {"error": "Policy violation detected"}


[POLICY]
### REFACTOR POLICY v1.1
RULES: preserve-game-logic[require_approval]:game/core/**;preserve-tests[skip]:**/*.test.{js,ts,jsx,tsx};small-prs[warn]:max=5
ALLOWED: rename_variable,extract_function,inline_helper,add_types,split_component
FORBIDDEN: rewrite_core_engine,change_public_api,modify_state_structure
FRAMEWORK: Next.js 14
LANGUAGE: TypeScript
CRITICAL: game/core/,game/systems/

[CONTEXT]
DEPS:target=game/components/InputState.ts|imports=game/systems/InputSystem.js[POTENTIAL_ECS_DEPENDENCY],game/systems/MovementSystem.js[POTENTIAL_ECS_DEPENDENCY],game/systems/ShootingSystem.js[POTENTIAL_ECS_DEPENDENCY]|used_by=

[TARGET SOURCE CODE: game/components/InputState.ts]
```typescript
// game/components/InputState.ts

/**
 * ユーザーの入力状態を保持するコンポーネント。
 * このコンポーネントは、通常ワールドに一つだけ存在する。
 */
export class InputState {
  // ポインター（マウス/タッチ）の座標
  public pointerPosition: { x: number | null; y: number | null };
  // 押されているキーのセット
  public keys: Set<string>;
  // ポインター（マウス/タッチ）が押されているか
  public isPointerDown: boolean;

  constructor() {
    this.pointerPosition = { x: null, y: null };
    this.keys = new Set();
    this.isPointerDown = false;
  }
}

```

[TSC CHECK RESULT: PASSED]
TypeScriptの型チェックは成功しました。コードベースは現在、型安全な状態です。

[RELATED SYSTEM CODES]
以下は、対象Componentに関連する可能性のあるSystemファイルです:

[SYSTEM CODE: game/systems/InputSystem.js]
```javascript
// game/systems/InputSystem.js

import { InputState } from '../components/index.js'; // 注: このインポートパスは後で修正されます

export class InputSystem {
  constructor(world) {
    this.world = world;
    const inputEntity = world.createEntity();
    world.addComponent(inputEntity, new InputState());
    this.inputState = world.getComponent(inputEntity, InputState);
    this.registerEventListeners();
  }

  registerEventListeners() {
    const canvas = this.world.canvas;
    if (!canvas) return;

    canvas.addEventListener('keydown', (e) => {
      e.preventDefault();
      this.inputState.keys.add(e.key.toLowerCase());
    });
    canvas.addEventListener('keyup', (e) => {
      e.preventDefault();
      this.inputState.keys.delete(e.key.toLowerCase());
    });

    // --- マウス/タッチ座標 ---
    const updateTarget = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      // ▼▼▼ ここを変更 ▼▼▼
      this.inputState.pointerPosition.x = clientX - rect.left;
      this.inputState.pointerPosition.y = clientY - rect.top;
      // ▲▲▲ ここまで ▲▲▲
    };
    const clearTarget = () => {
      // ▼▼▼ ここを変更 ▼▼▼
      this.inputState.pointerPosition.x = null;
      this.inputState.pointerPosition.y = null;
      // ▲▲▲ ここまで ▲▲▲
    };
    canvas.addEventListener('mousemove', (e) => updateTarget(e.clientX, e.clientY));
    canvas.addEventListener('mouseleave', clearTarget);
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      updateTarget(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvas.addEventListener('touchend', clearTarget);

    // --- マウスクリック/タッチ ---
    const handleMouseDown = (e) => {
      e.preventDefault();
      // ▼▼▼ ここを変更 ▼▼▼
      this.inputState.isPointerDown = true;
      // ▲▲▲ ここまで ▲▲▲
    };
    const handleMouseUp = () => {
      // ▼▼▼ ここを変更 ▼▼▼
      this.inputState.isPointerDown = false;
      // ▲▲▲ ここまで ▲▲▲
    };
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleMouseDown, { passive: false });
    canvas.addEventListener('touchend', handleMouseUp);
  }

  update(dt) {
    // InputSystemはイベント駆動なので何もしない
  }
}

```

[SYSTEM CODE: game/systems/MovementSystem.js]
```javascript
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
            if (inputState.pointerPosition.x !== null) {
                let targetVelX = 0;
                let targetVelY = 0;
                const dx = inputState.pointerPosition.x - pos.x;
                const dy = inputState.pointerPosition.y - pos.y;
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

```

[SYSTEM CODE: game/systems/ShootingSystem.js]
```javascript
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

```

[TASK]
Analyze the target file and output a JSON object with this exact structure:

\`\`\`json
{
  "ai_model": "この提案を生成したAIモデル名 (例: Qwen, DeepSeek)",
  "file": "ファイルパス",
  "analysis": {
    "current_structure": "現在の構造の簡潔な説明（50文字以内）",
    "complexity": "low/medium/high"
  },
  "suggested_changes": [
    {
      "type": "ALLOWED値のみ (例: extract_function, rename_variable)",
      "target": "変更対象の具体的な箇所（行番号または関数名）",
      "description": "変更内容の説明（80文字以内）",
      "reason": "変更理由（POLICY RULESのIDを引用、例: preserve-game-logic）",
      "risk_level": "low/medium/high",
      "estimated_effort": "変更に必要な時間（分単位）"
    }
  ],
  "warnings": [
    "CRITICAL PATHSに該当する場合は必ず記載",
    "FORBIDDEN違反の可能性がある場合も記載"
  ],
  "policy_compliance": {
    "max_files_rule": "small-prsルール (max=5) に準拠しているか: yes/no",
    "forbidden_check": "FORBIDDEN違反がないか: confirmed",
    "critical_path_check": "CRITICAL PATHSに該当するか: yes/no"
  }
}
\`\`\`

CONSTRAINTS:
- suggested_changes: 最大5件まで（small-prsルール）
- description: 各80文字以内
- warnings: 該当する場合のみ記載（なければ空配列）

OUTPUT FORMAT: JSON only. No markdown code fences (\`\`\`), no explanations before or after.
