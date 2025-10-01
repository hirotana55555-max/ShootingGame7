/**
 * デバッグ機能の有効・無効、および関連設定を管理するファイル。
 * 
 * 開発中: ENABLED = true
 * リリース時: ENABLED = false に変更することで、
 * デバッグ関連の全機能を無効化し、パフォーマンス負荷をゼロにする。
 */
export const DebugConfig = {
  /**
   * @property {boolean} ENABLED - デバッグ機能全体の有効/無効フラグ。
   */
  ENABLED: true,

  /**
   * @property {object} KEYS - デバッグ操作に使用するキーのマッピング。
   *                          InputSystemがこの設定を読み込んで使用する。
   */
  KEYS: {
    /**
     * @property {string} PAUSE_TOGGLE - ゲームのポーズ/再開を切り替えるキー。
     */
    PAUSE_TOGGLE: 'f8',

    /**
     * @property {string} FRAME_STEP - ポーズ中に1フレームだけ進める（コマ送り）キー。
     */
    FRAME_STEP: 'f9'
  }
};
