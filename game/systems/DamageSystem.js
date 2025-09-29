import { Health } from '../components/index.js';

export class DamageSystem {
  constructor(world) {
    this.world = world;

    // ★★★ 変更点：コンストラクタでイベントを「購読」する ★★★
    // 'COLLISION'というタイプのイベントが発行されたら、
    // this.handleCollisionメソッドを呼び出すように世界に依頼する
    this.world.subscribe('COLLISION', this.handleCollision.bind(this));
  }

  // ★★★ 変更点：イベント処理を独立したメソッドに切り出す ★★★
  handleCollision(event) {
    // 1. イベントからエンティティIDとグループ情報を取得
    const [entityA, entityB] = event.entities;
    const [groupA, groupB] = event.groups;

    // --- 設計ルール適用: 存在確認 ---
    // イベントを処理する時点で、エンティティはもう存在しない可能性がある
    if (!this.world.entities.has(entityA) || !this.world.entities.has(entityB)) {
      return;
    }

    // 2. 衝突ペアのどちらが「弾」でどちらが「敵」かを判定する
    let bulletEntity, enemyEntity;

    if (groupA === 'player_bullet' && groupB === 'enemy') {
      bulletEntity = entityA;
      enemyEntity = entityB;
    } else if (groupB === 'player_bullet' && groupA === 'enemy') {
      bulletEntity = entityB;
      enemyEntity = entityA;
    } else {
      // このシステムが関心を持つペアでなければ、何もしない
      return;
    }

    // 3. 敵のHealthコンポーネントを取得
    const enemyHealth = this.world.getComponent(enemyEntity, Health);
    if (!enemyHealth) {
      return;
    }

    // 4. ダメージを与える！ (今回は弾のダメージを1と仮定)
    enemyHealth.current -= 1;
    console.log(`ダメージ！ 敵(${enemyEntity})の残りHP: ${enemyHealth.current}`);

    // 5. 役目を終えた弾を消す (削除予約する)
    this.world.markForRemoval(bulletEntity);
  }

  // ★★★ 変更点：updateメソッドは空になる ★★★
  // このシステムはイベント駆動なので、毎フレーム実行するロジックはない
  update(dt) {
    // 何もしない
  }
}
