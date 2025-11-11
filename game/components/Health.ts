/**
 * エンティティの耐久値を管理するコンポーネント
 */
export class Health {
  /**
   * 現在の耐久値
   * @type {number}
   */
  public readonly current: number;

  /**
   * 最大耐久値
   * @type {number}
   */
  public readonly max: number;

  /**
   * @param {object} config - コンポーネントの設定
   * @param {number} config.current - 現在の耐久値。必須。
   * @param {number} [config.max] - 最大耐久値。省略時はcurrentと同じ値が設定される。
   */
  constructor({ current, max }: { current: number; max?: number }) {
    this.current = current;
    this.max = max ?? current; // null合体演算子で、より簡潔に
  }
}
