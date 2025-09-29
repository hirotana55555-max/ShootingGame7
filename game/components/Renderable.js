// game/components/Renderable.js

/**
 * エンティティの描画情報を保持するコンポーネント
 */
export class Renderable {
    /**
     * @param {string} color 描画色
     * @param {number} width 横幅
     * @param {number} height 高さ
     * @param {'rectangle' | 'triangle'} shape 形状
     */
    constructor(color, width, height, shape = 'rectangle') {
      this.color = color;
      this.width = width;
      this.height = height;
      this.shape = shape;
    }
  }
  