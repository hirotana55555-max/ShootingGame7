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
