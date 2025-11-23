/**
 * 速度を表すコンポーネント。
 * x方向の速度(vx)とy方向の速度(vy)を保持します。
 */
export class Velocity {
  public readonly vx: number;
  public readonly vy: number;

  constructor({ vx = 0, vy = 0 }: { vx?: number; vy?: number } = {}) {
    this.vx = vx;
    this.vy = vy;
  }
}
