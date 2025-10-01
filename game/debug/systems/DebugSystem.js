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
