/**
 * @file /game/debug/systems/DebugControlSystem.js
 * @description ゲームのポーズ、再開、コマ送りを管理するデバッグ専用システム。
 *              main.jsのゲームループを直接改変せず、デバッグ操作を分離する責務を持つ。
 */

import { InputState } from '../../components/index.js';
import { DebugConfig } from '../DebugConfig.js';

export class DebugControlSystem {
  constructor(world) {
    this.world = world;

    // Worldオブジェクトにポーズ状態を初期化する
    // これにより、他のシステム（特にmain.js）がこの状態を参照できる
    if (this.world.isPaused === undefined) {
      this.world.isPaused = false;
    }
    if (this.world.stepFrame === undefined) {
      this.world.stepFrame = false;
    }
  }

  update(dt) {
    // InputSystemによって更新されるグローバルな入力状態を取得
    const inputEntities = this.world.getEntities([InputState]);
    if (inputEntities.length === 0) return;
    const inputState = this.world.getComponent(inputEntities[0], InputState);

    // 1. ポーズ/再開の切り替え処理
    // -------------------------------------------------------------------------
    // DebugConfigからポーズ用のキーを取得し、そのキーが押されたかチェック
    if (inputState.keys.has(DebugConfig.KEYS.PAUSE_TOGGLE)) {
      // isPausedフラグを反転させる
      this.world.isPaused = !this.world.isPaused;
      
      // 誤作動防止のため、処理後にキー入力を消費する
      inputState.keys.delete(DebugConfig.KEYS.PAUSE_TOGGLE);
    }

    // 2. コマ送り処理
    // -------------------------------------------------------------------------
    // ゲームがポーズ中であること、かつコマ送りキーが押されたことをチェック
    if (this.world.isPaused && inputState.keys.has(DebugConfig.KEYS.FRAME_STEP)) {
      // main.jsのゲームループに「1フレームだけ進める」よう通知する
      this.world.stepFrame = true;

      // 誤作動防止のため、処理後にキー入力を消費する
      inputState.keys.delete(DebugConfig.KEYS.FRAME_STEP);
    }
  }
}
