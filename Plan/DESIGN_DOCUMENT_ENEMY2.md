```markdown
# 敵・衝突・AIに関する設計書 (DESIGN_DOCUMENT_ENEMY.md)

## 1. 基本思想

全てのゲーム内オブジェクトは「エンティティ」として統一して扱い、プロパティの組み合わせで多様な振る舞いを実現します。データとロジックを完全に分離し、中央集権的な設定管理によりAI開発の成功率を高めます。

## 2. エンティティ定義の基本構造

### 2.1. 中央設定管理システム

```javascript
// 全てのエンティティ定義はこの構造に従う
const EntityConfigs = {
  [entityType: string]: {
    // 必須コンポーネントリスト
    components: string[],
    
    // コンポーネント初期値
    health?: { value: number, max: number },
    position?: { x: number, y: number },
    velocity?: { x: number, y: number, speed: number },
    collidable?: { group: string, radius: number, offset?: {x: number, y: number} },
    
    // AIと状態管理
    aiState?: {
      initialState: string,
      states: {
        [stateName: string]: {
          behavior: string,
          transitions: { event: string, targetState: string, conditions?: any }[]
        }
      }
    },
    
    // 階層構造
    hierarchy?: {
      parent?: string, // 親エンティティタイプ
      children?: string[], // 子エンティティタイプ
      localOffset?: { x: number, y: number } // 親からの相対位置
    },
    
    // イベント駆動アクション
    onDeath?: { actions: { type: string, config: any }[] },
    onCollision?: { actions: { type: string, config: any }[] },
    
    // 材質と見た目
    material?: { type: string, properties: any },
    renderable?: { shape: string, color: string, size: number, layer: number }
  }
}
```

3. 具体的なエンティティ定義例

3.1. 基本敵タイプ

```javascript
// 隕石（現在の敵）
asteroid: {
  components: ['Position', 'Velocity', 'Health', 'Collidable', 'Renderable', 'Team'],
  health: { value: 3, max: 3 },
  velocity: { x: 0, y: 2, speed: 1.5 },
  collidable: { group: 'enemy', radius: 20 },
  team: { type: 'enemy' },
  renderable: { shape: 'circle', color: '#888', size: 20, layer: 1 },
  onDeath: {
    actions: [
      { type: 'SPAWN_ENTITY', config: { type: 'asteroid_fragment', count: 3 } },
      { type: 'PLAY_SOUND', config: { sound: 'explosion_large' } }
    ]
  }
},

// 戦闘機
fighter: {
  components: ['Position', 'Velocity', 'Health', 'Collidable', 'Renderable', 'Team', 'AIState'],
  health: { value: 5, max: 5 },
  velocity: { x: 0, y: 1, speed: 3 },
  collidable: { group: 'enemy', radius: 12 },
  team: { type: 'enemy' },
  renderable: { shape: 'triangle', color: '#f00', size: 15, layer: 1 },
  aiState: {
    initialState: 'patrol',
    states: {
      patrol: {
        behavior: 'move_sinusoidal',
        transitions: [
          { event: 'PLAYER_DETECTED', targetState: 'attack' },
          { event: 'DAMAGE_TAKEN', targetState: 'evade' }
        ]
      },
      attack: {
        behavior: 'charge_player',
        transitions: [
          { event: 'PLAYER_LOST', targetState: 'patrol' },
          { event: 'DAMAGE_TAKEN', targetState: 'evade' }
        ]
      }
    }
  }
},
```

3.2. 階層構造を持つ敵

```javascript
// 母艦（親エンティティ）
mothership: {
  components: ['Position', 'Velocity', 'Health', 'Collidable', 'Renderable', 'Team', 'Children'],
  health: { value: 100, max: 100 },
  velocity: { x: 0, y: 0.5, speed: 1 },
  collidable: { group: 'enemy', radius: 40 },
  team: { type: 'enemy' },
  renderable: { shape: 'rectangle', color: '#800', size: 35, layer: 1 },
  hierarchy: {
    children: ['gun_turret', 'shield_generator']
  },
  onDeath: {
    actions: [
      { type: 'SPAWN_ENTITY', config: { type: 'large_explosion', count: 1 } },
      { type: 'END_LEVEL', config: {} }
    ]
  }
},

// 砲台（子エンティティ）
gun_turret: {
  components: ['Position', 'Parent', 'Rotation', 'Health', 'Collidable', 'Renderable', 'Team', 'AIState'],
  health: { value: 10, max: 10 },
  collidable: { group: 'enemy', radius: 8, offset: { x: 15, y: 0 } },
  team: { type: 'enemy' },
  renderable: { shape: 'circle', color: '#aaa', size: 8, layer: 2 },
  hierarchy: {
    parent: 'mothership',
    localOffset: { x: 15, y: 0 }
  },
  aiState: {
    initialState: 'aiming',
    states: {
      aiming: {
        behavior: 'track_player',
        transitions: [
          { event: 'IN_RANGE', targetState: 'firing' }
        ]
      },
      firing: {
        behavior: 'shoot_at_player',
        transitions: [
          { event: 'OUT_OF_RANGE', targetState: 'aiming' }
        ]
      }
    }
  }
},
```

3.3. 部位破壊システム

```javascript
// 装甲部位
armor_segment: {
  components: ['Position', 'Parent', 'Health', 'Collidable', 'Renderable', 'Team', 'Material'],
  health: { value: 15, max: 15 },
  collidable: { group: 'armor', radius: 10 },
  team: { type: 'enemy' },
  renderable: { shape: 'rectangle', color: '#333', size: 12, layer: 3 },
  material: { type: 'heavy_armor', durability: 0.8 },
  onDeath: {
    actions: [
      { type: 'DAMAGE_PARENT', config: { damage: 5 } },
      { type: 'SPAWN_ENTITY', config: { type: 'armor_fragment', count: 2 } }
    ]
  }
},
```

4. コンポーネント詳細仕様

4.1. コアコンポーネント

· Position: { x: number, y: number, prevX: number, prevY: number }
· Velocity: { x: number, y: number, speed: number, maxSpeed: number }
· Health: { value: number, max: number, invulnerable: boolean }
· Collidable: { group: string, radius: number, offset: {x, y}, enabled: boolean }
· Team: { type: string, faction: string }

4.2. AIコンポーネント

· AIState: { currentState: string, states: Object, timer: number }
· Behavior: { type: string, parameters: any, target: string }

4.3. 階層コンポーネント

· Parent: { entityId: string, offset: {x, y}, rotationOffset: number }
· Children: { entityIds: string[] }

4.4. イベントコンポーネント

· OnDeath: { actions: Array<{type, config}> }
· OnCollision: { actions: Array<{type, config}> }

5. システム実装ガイド

5.1. AIシステム実装ルール

```javascript
// AIシステムは状態マシンに基づき振る舞いを決定
class AISystem {
  update(world) {
    const aiEntities = world.getEntitiesWith('AIState');
    
    aiEntities.forEach(entity => {
      const aiState = entity.getComponent('AIState');
      const currentStateDef = EntityConfigs[entity.type].aiState.states[aiState.currentState];
      
      // 状態に応じた振る舞いを実行
      this.executeBehavior(entity, currentStateDef.behavior);
      
      // 状態遷移条件をチェック
      this.checkTransitions(entity, currentStateDef.transitions);
    });
  }
}
```

5.2. 衝突システム実装ルール

```javascript
// 衝突システムは検出のみ、処理は別システム
class CollisionSystem {
  update(world) {
    const collidables = world.getEntitiesWith('Collidable');
    
    // 簡易的な衝突検出（円形）
    for (let i = 0; i < collidables.length; i++) {
      for (let j = i + 1; j < collidables.length; j++) {
        if (this.checkCircleCollision(collidables[i], collidables[j])) {
          world.publishEvent('COLLISION', {
            entityA: collidables[i].id,
            entityB: collidables[j].id,
            groups: [collidables[i].collidable.group, collidables[j].collidable.group]
          });
        }
      }
    }
  }
}
```

6. イベント駆動アーキテクチャ

6.1. 主要イベントタイプ

· COLLISION: 衝突検出時
· DAMAGE_TAKEN: ダメージを受けた時
· DEATH: 体力が0になった時
· STATE_CHANGE: AI状態が変化した時
· SPAWN_ENTITY: 新しいエンティティ生成要求
· PLAY_SOUND: 効果音再生要求

6.2. イベント処理の流れ

1. システムがイベントを発行
2. 関連システムがイベントを購読
3. イベントデータに基づき処理実行
4. 必要に応じて新たなイベントを発行

7. 実装優先順位

Phase 1: 基盤構築

· 中央設定ファイルの作成
· 基本的な敵タイプの移行
· イベントシステムの強化

Phase 2: AI拡張

· 状態マシンの実装
· 基本的な振る舞いパターン
· 階層構造のサポート

Phase 3: 高度な機能

· 部位破壊システム
· 材質ベースのエフェクト
· 動的スポーンシステム

8. AI開発ガイドライン

8.1. 新しい敵の追加手順

1. EntityConfigsに敵定義を追加
2. 必要なコンポーネントが存在することを確認
3. 必要なら新しい振る舞いパターンを実装
4. スポーン条件をSpawningSystemに追加

8.2. 既存敵の変更手順

1. EntityConfigsの該当定義を修正
2. 影響を受けるシステムを特定
3. 必要に応じてイベントハンドラを更新

この設計に基づき、全てのエンティティ管理を中央集権化し、AIが明確に理解・変更できる構造を実現します。

```