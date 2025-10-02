import { InputState } from '../components/InputState.js';

export class InputSystem {
  constructor(world) {
    this.world = world;
    const inputEntity = world.createEntity();
    world.addComponent(inputEntity, new InputState());
    this.inputState = world.getComponent(inputEntity, InputState);
    this.registerEventListeners();
  }

  registerEventListeners() {
    const canvas = this.world.canvas;
    if (!canvas) return;

    // ★★★ ここが唯一かつ最後の修正点！ ★★★
    // イベントリスナーの登録対象を 'document' から 'canvas' に変更する。
    // これにより、canvasにフォーカスが当たっている時のキー入力を確実に捕捉する。
    canvas.addEventListener('keydown', (e) => {
      e.preventDefault(); // 矢印キーによる画面スクロールなどを防ぐ
      this.inputState.keys.add(e.key.toLowerCase());
    });
    canvas.addEventListener('keyup', (e) => {
      e.preventDefault();
      this.inputState.keys.delete(e.key.toLowerCase());
    });
    // ★★★ 修正ここまで ★★★

    // --- マウス/タッチ座標 (変更なし) ---
    const updateTarget = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      this.inputState.target.x = clientX - rect.left;
      this.inputState.target.y = clientY - rect.top;
    };
    const clearTarget = () => {
      this.inputState.target.x = null;
      this.inputState.target.y = null;
    };
    canvas.addEventListener('mousemove', (e) => updateTarget(e.clientX, e.clientY));
    canvas.addEventListener('mouseleave', clearTarget);
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      updateTarget(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvas.addEventListener('touchend', clearTarget);

    // --- マウスクリック/タッチ (変更なし) ---
    const handleMouseDown = (e) => {
      e.preventDefault();
      this.inputState.isMouseDown = true;
    };
    const handleMouseUp = () => {
      this.inputState.isMouseDown = false;
    };
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleMouseDown, { passive: false });
    canvas.addEventListener('touchend', handleMouseUp);
  }

  update(dt) {
    // InputSystemはイベント駆動なので何もしない
  }
}
