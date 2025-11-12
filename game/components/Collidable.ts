// game/components/Collidable.ts
/**
 * 物理的な当たり判定を持つことを示すコンポーネント。
 */
export class Collidable {
  public readonly group: string;
  public readonly radius: number;

  /**
   * @param config - コンポーネントの設定
   * @param config.group - 衝突判定のグループ ('enemy', 'player_bullet'など)
   * @param config.radius - 円形の当たり判定の半径
   */
  constructor({ group, radius }: { group: string; radius: number }) {
    if (group === undefined || radius === undefined) {
      // TypeScript化により、コンパイル時にエラーになるため、このランタイムチェックは不要だが、
      // 既存のロジックを維持するために残す。
      console.error("Collidableコンポーネントの生成に失敗: 'group'と'radius'プロパティは必須です。");
      this.group = 'unknown';
      this.radius = 0;
      return;
    }

    /**
     * 衝突判定のグループ
     */
    this.group = group;

    /**
     * 円形の当たり判定の半径
     */
    this.radius = radius;
  }

  /**
   * デバッグ用の文字列表現
   */
  toString(): string {
    return `Collidable(group=${this.group}, radius=${this.radius})`;
  }
}
