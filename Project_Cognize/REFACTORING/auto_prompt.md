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
DEPS:target=game/core/main.js|imports=../components/index.js[import],../debug/DebugConfig.js[import],../debug/systems/DebugControlSystem.js[import],../debug/systems/DebugSystem.js[import],../debug/systems/OffscreenCleanupSystem.js[import],../systems/CollisionSystem.js[import],../systems/DamageSystem.js[import],../systems/DeathSystem.js[import],../systems/InputSystem.js[import],../systems/LifetimeSystem.js[import],../systems/MovementSystem.js[import],../systems/RenderSystem.js[import],../systems/RotationSystem.js[import],../systems/ShootingSystem.js[import],../systems/SpawningSystem.js[import],./World.js[import],./entityFactory.js[import]|used_by=

[TARGET SOURCE CODE: game/core/main.js]
```javascript
/**
 * @file /game/core/main.js
 * @description ゲーム全体の初期化、メインループの管理、そして終了処理を行うエントリーポイント。
 */

// (インポート文は変更なし)
import { World } from './World.js';
import { createPlayer } from './entityFactory.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { RotationSystem } from '../systems/RotationSystem.js';
import { ShootingSystem } from '../systems/ShootingSystem.js';
import { LifetimeSystem } from '../systems/LifetimeSystem.js';
import { DamageSystem } from '../systems/DamageSystem.js';
import { DeathSystem } from '../systems/DeathSystem.js';
import { SpawningSystem } from '../systems/SpawningSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { Generator } from '../components/index.js';
import { DebugConfig } from '../debug/DebugConfig.js';
import { DebugSystem } from '../debug/systems/DebugSystem.js';
import { OffscreenCleanupSystem } from '../debug/systems/OffscreenCleanupSystem.js';
import { DebugControlSystem } from '../debug/systems/DebugControlSystem.js';

let world;
let animationFrameId;

export function startGame(canvas) {
  console.log("ゲームを開始します...");

  world = new World();
  world.canvas = canvas;
  world.context = canvas.getContext('2d');

  const alwaysUpdateSystems = [];
  const gameLogicSystems = [];
  let debugSystem = null; // DebugSystemを特別扱いするため、別の変数に保持

  // グループA: 常に更新 (入力と制御のみ)
  alwaysUpdateSystems.push(new InputSystem(world));
  if (DebugConfig.ENABLED) {
    alwaysUpdateSystems.push(new DebugControlSystem(world));
  }

  // グループB: ポーズ中に停止
  gameLogicSystems.push(new LifetimeSystem(world));
  gameLogicSystems.push(new ShootingSystem(world));
  gameLogicSystems.push(new MovementSystem(world));
  gameLogicSystems.push(new RotationSystem(world));
  gameLogicSystems.push(new CollisionSystem(world));
  gameLogicSystems.push(new DamageSystem(world));
  gameLogicSystems.push(new DeathSystem(world));
  gameLogicSystems.push(new SpawningSystem(world));
  if (DebugConfig.ENABLED) {
    gameLogicSystems.push(new OffscreenCleanupSystem(world));
  }
  gameLogicSystems.push(new RenderSystem(world)); // ゲームオブジェクトの描画は最後

  // DebugSystemは描画の最後、かつ特別扱い
  if (DebugConfig.ENABLED) {
    debugSystem = new DebugSystem(world);
  }

  // Worldに全システムを登録
  const allSystems = [...alwaysUpdateSystems, ...gameLogicSystems];
  if (debugSystem) allSystems.push(debugSystem);
  allSystems.forEach(s => world.addSystem(s));

  createPlayer(world);
  const meteorGenerator = world.createEntity();
  world.addComponent(meteorGenerator, new Generator({
    entityType: 'meteor',
    trigger: { interval: 2.0, initialDelay: 1.0 }
  }));

  let lastTime = 0;

  function gameLoop(currentTime) {
    if (lastTime === 0) lastTime = currentTime;
    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // 1. 常に更新されるシステムを実行 (入力と制御)
    alwaysUpdateSystems.forEach(system => system.update(dt));

    const shouldUpdateLogic = !world.isPaused || world.stepFrame;

    // 2. 画面をクリア (ポーズ中はクリアしない)
    if (shouldUpdateLogic) {
      world.context.clearRect(0, 0, world.canvas.width, world.canvas.height);
      world.context.fillStyle = 'black';
      world.context.fillRect(0, 0, world.canvas.width, world.canvas.height);
    }

    // 3. ゲームロジックと描画を更新 (ポーズ中は更新しない)
    if (shouldUpdateLogic) {
      gameLogicSystems.forEach(system => system.update(dt));
      
      world.flushRemovals();
      world.processEvents();

      if (world.stepFrame) {
        world.stepFrame = false;
      }
    }

    // 4. デバッグ情報を常に最前面に描画
    if (debugSystem) {
      debugSystem.update(dt);
    }

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  gameLoop(performance.now());
}

export function stopGame() {
  console.log("ゲームを停止します。");
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
}

```

[TSC CHECK RESULT: NOT_APPLICABLE]
対象ファイルはTypeScriptではないか、tsconfig.jsonが存在しないため、型チェックは実行されませんでした。

[RELATED SYSTEM CODES]
対象がComponentではないため、System依存関係の分析は省略されました。

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
