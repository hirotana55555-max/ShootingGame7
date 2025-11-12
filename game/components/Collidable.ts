/**
 * 物理的な当たり判定を持つことを示すコンポーネント。
 */
export class Collidable {
  /**
   * @param {object} config - コンポーネントの設定
   * @param {string} config.group - 衝突判定のグループ ('enemy', 'player_bullet'など)
   * @param {number} config.radius - 円形の当たり判定の半径
   */
  constructor({ group, radius }) {
    if (group === undefined || radius === undefined) {
      console.error("Collidableコンポーネントの生成に失敗: 'group'と'radius'プロパティは必須です。");
      this.group = 'unknown';
      this.radius = 0;
      return;
    }

    /**
     * 衝突判定のグループ
     * @type {string}
     */
    this.group = group;

    /**
     * 円形の当たり判定の半径
     * @type {number}
     */
    this.radius = radius;
  }

  /**
   * デバッグ用の文字列表現
   * @returns {string}
   */
  toString() {
    return `Collidable(group=${this.group}, radius=${this.radius})`;
  }
}
