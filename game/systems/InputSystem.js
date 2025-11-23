// game/systems/InputSystem.js

import { InputState } from '../components/index.js'; // 注: このインポートパスは後で修正されます

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

    canvas.addEventListener('keydown', (e) => {
      e.preventDefault();
      this.inputState.keys.add(e.key.toLowerCase());
    });
    canvas.addEventListener('keyup', (e) => {
      e.preventDefault();
      this.inputState.keys.delete(e.key.toLowerCase());
    });

    // --- マウス/タッチ座標 ---
    const updateTarget = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      // ▼▼▼ ここを変更 ▼▼▼
      this.inputState.pointerPosition.x = clientX - rect.left;
      this.inputState.pointerPosition.y = clientY - rect.top;
      // ▲▲▲ ここまで ▲▲▲
    };
    const clearTarget = () => {
      // ▼▼▼ ここを変更 ▼▼▼
      this.inputState.pointerPosition.x = null;
      this.inputState.pointerPosition.y = null;
      // ▲▲▲ ここまで ▲▲▲
    };
    canvas.addEventListener('mousemove', (e) => updateTarget(e.clientX, e.clientY));
    canvas.addEventListener('mouseleave', clearTarget);
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      updateTarget(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvas.addEventListener('touchend', clearTarget);

    // --- マウスクリック/タッチ ---
    const handleMouseDown = (e) => {
      e.preventDefault();
      // ▼▼▼ ここを変更 ▼▼▼
      this.inputState.isPointerDown = true;
      // ▲▲▲ ここまで ▲▲▲
    };
    const handleMouseUp = () => {
      // ▼▼▼ ここを変更 ▼▼▼
      this.inputState.isPointerDown = false;
      // ▲▲▲ ここまで ▲▲▲
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
