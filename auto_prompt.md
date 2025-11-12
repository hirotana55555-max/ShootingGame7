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
DEPS:target=game/components/Lifetime.ts|imports=game/systems/LifetimeSystem.js[POTENTIAL_ECS_DEPENDENCY]|used_by=

[TARGET SOURCE CODE: game/components/Lifetime.ts]
```typescript
// game/components/Lifetime.ts

/**
 * エンティティの寿命を管理するコンポーネント。
 */
export class Lifetime {
  /**
   * 残りの寿命（秒）。システムによって毎フレーム減算される。
   * @type {number}
   */
  public remainingTime: number;

  /**
   * @param {object} config - コンポーネントの設定
   * @param {number} config.duration - エンティティが存在する秒数
   */
  constructor({ duration }: { duration: number }) {
    if (duration === undefined || duration < 0) {
      console.error("Lifetimeコンポーネント: 不正な'duration'が指定されたため、デフォルト値0を使用します。");
      this.remainingTime = 0;
      return;
    }
    this.remainingTime = duration;
  }

  /**
   * デバッグ用の文字列表現
   * @returns {string}
   */
  toString(): string {
    return `Lifetime(remainingTime=${this.remainingTime.toFixed(2)})`;
  }
}

```

[TSC CHECK RESULT: PASSED]
TypeScriptの型チェックは成功しました。コードベースは現在、型安全な状態です。

[RELATED SYSTEM CODES]
以下は、対象Componentに関連する可能性のあるSystemファイルです:

[SYSTEM CODE: game/systems/LifetimeSystem.js]
```javascript
// game/systems/LifetimeSystem.js 

import { Lifetime } from '../components/index.js';

export class LifetimeSystem {
  constructor(world) {
    this.world = world;
    this.query = [Lifetime];
  }

  update(dt) {
    const entities = this.world.getEntities(this.query);

    for (const entityId of entities) {
      const lifetime = this.world.getComponent(entityId, Lifetime);

      // ▼▼▼ ここが新しいプロパティ名に変わっています ▼▼▼
      lifetime.remainingTime -= dt;

      if (lifetime.remainingTime <= 0) {
      // ▲▲▲ ここまで ▲▲▲
        this.world.markForRemoval(entityId);
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
