/**
 * エンティティの耐久値を管理するコンポーネント
 */
export class Health {
  /**
   * @param {object} config - コンポーネントの設定
   * @param {number} config.value - 現在の耐久値
   * @param {number} [config.max] - 最大耐久値。省略時はvalueと同じ値が設定される。
   */
  constructor({ value, max }) {
    if (value === undefined) {
      // 万が一 value が指定されなかった場合のフォールバック処理
      this.current = 1;
      this.max = 1;
      return;
    }

    /**
     * 現在の耐久値
     * @type {number}
     */
    this.current = value;

    /**
     * 最大耐久値
     * @type {number}
     */
    this.max = max !== undefined ? max : value;
  }
}
