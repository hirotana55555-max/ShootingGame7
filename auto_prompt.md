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
DEPS:target=game/debug/systems/DebugSystem.js|imports=../../components/index.js[import],../components/DebugVector.js[import]|used_by=

[TARGET SOURCE CODE: game/debug/systems/DebugSystem.js]
```javascript
/**
 * @file /game/debug/systems/DebugSystem.js
 * @description 開発中にゲームの状態を可視化するためのデバッグ用システム。
 *              FPS、エンティティ数、コンポーネントの状態などを画面に描画する。
 *              右クリックで表示/非表示を切り替え可能。
 */

// 依存関係のインポート
import { Controllable, Position, Bullet, Team, Collidable, Health, InputState } from '../../components/index.js';
import { DebugVector } from '../components/DebugVector.js';

export class DebugSystem {
  constructor(world) {
    this.world = world;
    this.fps = 0;
    this.frames = 0;
    this.lastFpsUpdateTime = performance.now();
    this.isVisible = true;
    this.gameStartTime = performance.now();
    this.setupMouseControls();
  }

  setupMouseControls() {
    if (typeof window === 'undefined' || !this.world.canvas) return;
    this.world.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.isVisible = !this.isVisible;
    });
  }

  update(dt) {
    // FPS計算
    this.frames++;
    const now = performance.now();
    if (now - this.lastFpsUpdateTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastFpsUpdateTime = now;
    }

    if (!this.isVisible) return;

    const context = this.world.context;
    const currentTime = performance.now();

    // === 基本情報（左上） ===
    context.fillStyle = 'white';
    context.font = '12px Arial';
    context.fillText(`FPS: ${this.fps}`, 10, 20);
    context.fillText(`DeltaTime: ${dt.toFixed(4)}`, 10, 40);
    context.fillText(`Canvas: ${this.world.canvas.width}x${this.world.canvas.height}`, 10, 60);

    // === エンティティ数分析（左上） ===
    const allEntities = Array.from(this.world.entities.keys());
    const positionEntities = allEntities.filter(id => this.world.hasComponent(id, Position));
    const bulletEntities = allEntities.filter(id => this.world.hasComponent(id, Bullet));
    const meteorEntities = positionEntities.filter(id => {
      const team = this.world.getComponent(id, Team);
      return team && team.id === 'enemy';
    });

    context.fillStyle = 'cyan';
    context.fillText(`ENTITY_ALL: ${allEntities.length}`, 10, 90);
    context.fillText(`POSITION: ${positionEntities.length}`, 10, 110);
    context.fillText(`BULLET: ${bulletEntities.length}`, 10, 130);
    context.fillText(`METEOR: ${meteorEntities.length}`, 10, 150);

    // ★★★ ここからが追加ブロック ★★★
    // === 入力状態の表示（左上） ===
    const inputEntities = this.world.getEntities([InputState]);
    if (inputEntities.length > 0) {
      const inputState = this.world.getComponent(inputEntities[0], InputState);
      const pressedKeys = Array.from(inputState.keys).join(', ');
      context.fillStyle = '#FFD700'; // ゴールド
      context.font = '12px monospace';
      context.fillText(`KEYS: [${pressedKeys}]`, 10, 170);
    }
    // ★★★ 追加ブロックここまで ★★★

    // === ゲーム開始からの経過時間（右上） ===
    context.fillStyle = 'magenta';
    context.font = '12px Arial';
    const elapsedTime = (currentTime - this.gameStartTime) / 1000;
    context.fillText(`GAME TIME: ${elapsedTime.toFixed(2)}s`, this.world.canvas.width - 200, 20);

    // === ポーズ状態の表示（右上） ===
    if (this.world.isPaused) {
      context.fillStyle = '#FFD700'; // ゴールド
      context.font = 'bold 16px Arial';
      context.textAlign = 'right'; // 右揃え
      context.fillText('PAUSED', this.world.canvas.width - 10, 40);
      context.textAlign = 'left'; // 描画設定を元に戻す
    }

    // === プレイヤー情報（左下） ===
    context.fillStyle = 'lime';
    context.font = '12px monospace';
    let yOffset = this.world.canvas.height - 120;
    context.fillText(`--- PLAYER DEBUG ---`, 10, yOffset);
    yOffset += 20;
    const controllableEntities = allEntities.filter(id => this.world.hasComponent(id, Controllable));
    if (controllableEntities.length > 0) {
      const playerId = controllableEntities[0];
      const position = this.world.getComponent(playerId, Position);
      context.fillText(`Position: x=${position.x.toFixed(1)}, y=${position.y.toFixed(1)}`, 15, yOffset);
      yOffset += 20;
      
      const health = this.world.getComponent(playerId, Health);
      if (health) {
        context.fillText(`Health: ${health.current}/${health.max}`, 15, yOffset);
        yOffset += 20;
      }
    } else {
      context.fillText(`Player: NOT FOUND`, 15, yOffset);
      yOffset += 20;
    }

    // === バレットデバッグ情報 ===
    context.fillStyle = 'cyan';
    context.fillText(`--- BULLET DEBUG ---`, 10, yOffset);
    yOffset += 20;

    if (bulletEntities.length > 0) {
      const bulletId = bulletEntities[0];
      context.fillText(`Bullet ID: ${bulletId}`, 10, yOffset);
      yOffset += 20;

      const team = this.world.getComponent(bulletId, Team);
      if (team) {
        context.fillText(`Team.id = ${team.id}`, 15, yOffset);
        yOffset += 20;
      }

      const collidable = this.world.getComponent(bulletId, Collidable);
      if (collidable) {
        context.fillText(`Collidable.group = ${collidable.group}`, 15, yOffset);
        yOffset += 20;
      }
    } else {
      context.fillText(`Bullet: NOT FOUND`, 10, yOffset);
    }
    
    // === Lifetimeコンポーネントの旧形式使用警告（中央右側） ===
    // _renderLifetimeWarnings は未定義のため、呼び出しをコメントアウトします
    // this._renderLifetimeWarnings(context);

    // === DebugVectorコンポーネントの描画処理 ===
    /*const debugVectorEntities = this.world.getEntities([Position, DebugVector]);
    if (debugVectorEntities.length > 0) {
      context.font = '11px monospace';
      
      for (const entityId of debugVectorEntities) {
        const pos = this.world.getComponent(entityId, Position);
        const debugInfo = this.world.getComponent(entityId, DebugVector);

        context.fillStyle = debugInfo.label === 'OLD' ? '#FF8C00' : '#00FFFF';
        const text = `[${debugInfo.label}] vx:${debugInfo.vx.toFixed(2)}, vy:${debugInfo.vy.toFixed(2)}`;
        context.fillText(text, pos.x + 10, pos.y - 10);
      }
    }*/
  }

  // _renderLifetimeWarnings(context) {
  //   // ... (このメソッドは未定義のため、全体をコメントアウト) ...
  // }
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
