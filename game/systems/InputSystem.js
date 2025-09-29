// game/systems/InputSystem.js
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

    // --- キーボード ---
    document.addEventListener('keydown', (e) => this.inputState.keys.add(e.key));
    document.addEventListener('keyup', (e) => this.inputState.keys.delete(e.key));

    // --- マウス/タッチ座標 ---
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
    // touchendでは座標のみクリアする
    canvas.addEventListener('touchend', clearTarget);

    // ★★★ ここからが改造部分 ★★★
    // --- マウスクリック/タッチ ---
    const handleMouseDown = (e) => {
      e.preventDefault(); // ダブルタップでのズームなどを防ぐ
      this.inputState.isMouseDown = true;
    };

    const handleMouseUp = () => {
      this.inputState.isMouseDown = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleMouseDown, { passive: false });
    // touchendは座標クリアのリスナーが既にあるので、mouseupの処理を共通化
    canvas.addEventListener('touchend', handleMouseUp);
    // ★★★ ここまでが改造部分 ★★★
  }

  update(dt) {
    // InputSystemはイベント駆動なので何もしない
  }
}
