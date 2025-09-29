/**
 * 新しいエンティティを動的に生成する「スポナー」の定義を持つコンポーネント。 
 */
export class Generator {
    /**
     * @param {object} config - 生成設定
     */
    constructor(config) {
      this.config = config;
      this.timer = config.trigger.initialDelay || 0; // 生成までのタイマー
    }
  }
  