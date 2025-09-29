/**
 * 物理的な当たり判定を持つことを示すコンポーネント。 
 */
export class Collidable {
    /**
     * @param {string} group - 衝突判定のグループ ('enemy', 'player_bullet'など)
     * @param {number} radius - 円形の当たり判定の半径
     */
    constructor(group, radius) {
      this.group = group;
      this.radius = radius;
    }
  }
  