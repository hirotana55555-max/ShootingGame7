// game/components/InputState.js 

/**
 * ユーザーの入力状態を保持するコンポーネント。
 * このコンポーネントは、通常ワールドに一つだけ存在する。
 */
export class InputState {
    constructor() {
      // マウス/タッチのターゲット座標
      this.target = { x: null, y: null };
      // 押されているキーのセット
      this.keys = new Set();
      // マウスボタンが押されているか
      this.isMouseDown = false;
    }
  }
  