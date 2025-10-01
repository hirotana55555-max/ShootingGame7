/**
 * エンティティの寿命を管理するコンポーネント。
 */
export class Lifetime {
  /**
   * @param {object} config - コンポーネントの設定
   * @param {number} config.duration - エンティティが存在する秒数
   */
  constructor({ duration }) {
    if (duration === undefined) {
      console.error("Lifetimeコンポーネントの生成に失敗: 'duration'プロパティは必須です。");
      this.timer = 0;
      return;
    }

    /**
     * 残りの寿命（秒）。システムによって毎フレーム減算される。
     * @type {number}
     */
    this.timer = duration;
  }

  /**
   * デバッグ用の文字列表現
   * @returns {string}
   */
  toString() {
    return `Lifetime(timer=${this.timer})`;
  }
}
