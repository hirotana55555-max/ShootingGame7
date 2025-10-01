/**
 * @file /game/debug/components/DebugVector.js
 * @description リファクタリング中のベクトル値を画面に表示するための、一時的なデバッグ用コンポーネント。
 *              このコンポーネントを持つエンティティは、DebugSystemによってその情報が描画される。
 *              リファクタリング完了後は、このファイルごと削除されるべきである。
 */

export class DebugVector {
    /**
     * @param {object} p - プロパティ
     * @param {number} p.vx - 表示したいベクトルのx成分
     * @param {number} p.vy - 表示したいベクトルのy成分
     * @param {string} p.label - 'OLD'や'NEW'など、値の識別ラベル
     * @param {string} [p.color='yellow'] - 表示するテキストの色
     */
    constructor({ vx, vy, label, color = 'yellow' }) {
      this.vx = vx;
      this.vy = vy;
      this.label = label;
      this.color = color;
    }
  }
  