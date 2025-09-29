// game/components/Lifetime.js 

/**
 * エンティティの寿命を管理するコンポーネント。
 */
export class Lifetime {
    /**
     * @param {number} duration - エンティティが存在する秒数
     */
    constructor(duration) {
      this.timer = duration;
    }
  }
  