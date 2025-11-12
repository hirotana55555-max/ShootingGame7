// game/components/Lifetime.ts

/**
 * エンティティの寿命を管理するコンポーネント。
 */
export class Lifetime {
  /**
   * 残りの寿命（秒）。システムによって毎フレーム減算される。
   * @type {number}
   */
  public remainingTime: number;

  /**
   * @param {object} config - コンポーネントの設定
   * @param {number} config.duration - エンティティが存在する秒数
   */
  constructor({ duration }: { duration: number }) {
    if (duration === undefined || duration < 0) {
      console.error("Lifetimeコンポーネント: 不正な'duration'が指定されたため、デフォルト値0を使用します。");
      this.remainingTime = 0;
      return;
    }
    this.remainingTime = duration;
  }

  /**
   * デバッグ用の文字列表現
   * @returns {string}
   */
  toString(): string {
    return `Lifetime(remainingTime=${this.remainingTime.toFixed(2)})`;
  }
}
