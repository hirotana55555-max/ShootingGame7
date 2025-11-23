/**
 * 2D座標を表すコンポーネント
 * Entity Component Systemにおける位置情報
 */
export class Position {
  public readonly x: number;
  public readonly y: number;

  constructor({ x = 0, y = 0 }: { x?: number; y?: number } = {}) {
    this.x = x;
    this.y = y;
  }
}
