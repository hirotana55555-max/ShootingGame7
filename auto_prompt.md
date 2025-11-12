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
DEPS:target=game/components/Collidable.js|imports=|used_by=

[SOURCE CODE: game/components/Collidable.js]
```javascript
/**
 * 物理的な当たり判定を持つことを示すコンポーネント。
 */
export class Collidable {
  /**
   * @param {object} config - コンポーネントの設定
   * @param {string} config.group - 衝突判定のグループ ('enemy', 'player_bullet'など)
   * @param {number} config.radius - 円形の当たり判定の半径
   */
  constructor({ group, radius }) {
    if (group === undefined || radius === undefined) {
      console.error("Collidableコンポーネントの生成に失敗: 'group'と'radius'プロパティは必須です。");
      this.group = 'unknown';
      this.radius = 0;
      return;
    }

    /**
     * 衝突判定のグループ
     * @type {string}
     */
    this.group = group;

    /**
     * 円形の当たり判定の半径
     * @type {number}
     */
    this.radius = radius;
  }

  /**
   * デバッグ用の文字列表現
   * @returns {string}
   */
  toString() {
    return `Collidable(group=${this.group}, radius=${this.radius})`;
  }
}

```

[TASK]
Analyze the target file and output a JSON object with this exact structure:

\`\`\`json
{
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
