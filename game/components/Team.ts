// game/components/Team.ts

/**
 * チームを識別するための具体的なID。
 * 'unknown'はフォールバック用の値。
 */
export type TeamId = 'player' | 'enemy' | 'unknown';

/**
 * エンティティの所属チームを管理するコンポーネント
 */
export class Team {
  /**
   * チームを識別するID
   */
  public readonly id: TeamId;

  /**
   * @param teamId - チームを識別するID（例: 'player', 'enemy'）
   */
  constructor(teamId: TeamId | undefined) {
    // teamIdが提供されていない、または不正な値の場合、'unknown'にフォールバックする
    if (!teamId || (teamId !== 'player' && teamId !== 'enemy')) {
      if (teamId !== undefined) { // 未定義以外の不正な値が来た場合に警告
         console.warn(`Teamコンポーネント: 不正なteamId '${teamId}' が指定されたため、'unknown'にフォールバックします。`);
      }
      this.id = 'unknown';
    } else {
      this.id = teamId;
    }
  }
}
