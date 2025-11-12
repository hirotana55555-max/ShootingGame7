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
DEPS:target=game/core/entityFactory.js|imports=../components/index.js[import]|used_by=

[TARGET SOURCE CODE: game/core/entityFactory.js]
```javascript
import { Position, Renderable, Velocity, Controllable, Rotation, Team, Bullet, Lifetime, Health, Collidable } from '../components/index.js';

export function createPlayer(world) {
  const canvas = world.canvas;
  if (!canvas) throw new Error('Worldにcanvasが設定されていません。');
  
  const player = world.createEntity();

  world.addComponent(player, new Position({ x: canvas.width / 2, y: canvas.height - 100 }));
  world.addComponent(player, new Renderable({ color: 'white', width: 20, height: 30, shape: 'triangle' }));
  world.addComponent(player, new Velocity({ vx: 0, vy: 0 }));
  world.addComponent(player, new Rotation({ angle: 0 }));
  world.addComponent(player, new Team({ id: 'player' }));
  world.addComponent(player, new Controllable({}));

  return player;
}

// ★★★ ここからが変更ブロック ★★★
export function createBullet(world, { ownerPosition, ownerTeam, vx, vy }) {
  const bullet = world.createEntity();

  // 速度計算ロジックは削除され、引数で受け取るようになった
  world.addComponent(bullet, new Position({ x: ownerPosition.x, y: ownerPosition.y }));
  world.addComponent(bullet, new Velocity({ vx, vy })); // 引数の値をそのまま使用
  world.addComponent(bullet, new Renderable({ color: 'yellow', width: 5, height: 10, shape: 'rectangle' }));
  world.addComponent(bullet, new Team({ id: ownerTeam }));
  world.addComponent(bullet, new Collidable({ group: 'player_bullet', radius: 5 }));
  world.addComponent(bullet, new Lifetime({ duration: 0.8 }));
  world.addComponent(bullet, new Bullet({}));

  // 検証用のDebugVector追加コードは不要になったため削除

  return bullet;
}
// ★★★ 変更ブロックここまで ★★★

export function createMeteor(world, { x, y }) {
  const meteor = world.createEntity();
  const speed = 1.0 + Math.random() * 0.5;
  const angle = (Math.random() - 0.5) * Math.PI / 4;
  const vx = Math.sin(angle) * speed;
  const vy = Math.cos(angle) * speed;

  world.addComponent(meteor, new Position({ x, y }));
  world.addComponent(meteor, new Velocity({ vx, vy }));
  world.addComponent(meteor, new Renderable({ color: 'gray', width: 20, height: 20, shape: 'rectangle' }));
  world.addComponent(meteor, new Health({current: 3}));
  world.addComponent(meteor, new Team({ id: 'enemy' }));
  world.addComponent(meteor, new Collidable({ group: 'enemy', radius: 20 }));

  return meteor;
}

```

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
