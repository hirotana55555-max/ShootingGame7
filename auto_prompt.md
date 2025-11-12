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
DEPS:target=game/components/Generator.js|imports=game/systems/SpawningSystem.js[POTENTIAL_ECS_DEPENDENCY]|used_by=

[TARGET SOURCE CODE: game/components/Generator.js]
```javascript
/**
 * 新しいエンティティを動的に生成する「スポナー」の定義を持つコンポーネント。 
 */
export class Generator {
    /**
     * @param {object} config - 生成設定
     */
    constructor(config) {
      this.config = config;
      this.timer = config.trigger.initialDelay || 0; // 生成までのタイマー
    }
  }
  
```

[RELATED SYSTEM CODES]
以下は、対象Componentに関連する可能性のあるSystemファイルです:

[SYSTEM CODE: game/systems/SpawningSystem.js]
```javascript
// game/systems/SpawningSystem.js
import { Generator } from '../components/index.js';
import { createMeteor } from '../core/entityFactory.js';

export class SpawningSystem {
  constructor(world) {
    this.world = world;
  }

  update(dt) {
    const generators = this.world.getEntities([Generator]);

    for (const entityId of generators) {
      const generator = this.world.getComponent(entityId, Generator);
      generator.timer -= dt;

      if (generator.timer <= 0) {
        const config = generator.config;

        if (config.entityType === 'meteor') {
          const spawnX = Math.random() * this.world.canvas.width;
          const spawnY = -50;
          
          // ★★★ 変更点：引数をオブジェクト形式で渡す ★★★
          createMeteor(this.world, { x: spawnX, y: spawnY });
        }

        generator.timer = config.trigger.interval;
      }
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
