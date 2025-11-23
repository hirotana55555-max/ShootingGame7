/**
 * エンティティの角度を管理するコンポーネント
 */
export class Rotation {
  /**
   * 回転角度（ラジアン）
   * @public
   * @readonly
   * @type {number}
   */
  public readonly angle: number;

  /**
   * @param {object} config - コンポーネントの設定
   * @param {number} [config.angle=0] - 初期の角度
   */
  constructor({ angle = 0 }: { angle?: number } = {}) {
    this.angle = angle;
  }
}
