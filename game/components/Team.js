/**
 * エンティティの所属チームを管理するコンポーネント
 */
export class Team {
  /**
   * @param {object} config - コンポーネントの設定
   * @param {string} config.id - チームを識別するID（例: 'player', 'enemy'）
   */
  constructor({ id }) {
    if (id === undefined) {
      console.error("Teamコンポーネントの生成に失敗: 'id'プロパティは必須です。");
      /**
       * チームを識別するID
       * @type {string}
       */
      this.id = 'unknown'; // フォールバック値
      return;
    }

    /**
     * チームを識別するID
     * @type {string}
     */
    this.id = id;
  }

  /**
   * デバッグ用の文字列表現
   * @returns {string}
   */
  toString() {
    return `Team(id=${this.id})`;
  }
}
