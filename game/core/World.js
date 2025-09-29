export class World {
    constructor() {
      this.entities = new Set();
      this.components = new Map();
      this.systems = [];
      this.nextEntityId = 0;
      this.pendingRemovals = new Set();
  
      // --- イベントシステム関連プロパティ ---
      this.eventQueue = [];
      this.eventListeners = new Map(); // イベントタイプ => リスナー(関数)の配列
    }
  
    // --- エンティティ・コンポーネント管理 (変更なし) ---
    createEntity() {
      const entityId = this.nextEntityId++;
      this.entities.add(entityId);
      return entityId;
    }
  
    addComponent(entityId, component) {
      const componentName = component.constructor.name;
      if (!this.components.has(componentName)) {
        this.components.set(componentName, new Map());
      }
      this.components.get(componentName).set(entityId, component);
    }
  
    removeEntity(entityId) {
      this.entities.delete(entityId);
      for (const componentMap of this.components.values()) {
        componentMap.delete(entityId);
      }
    }
  
    markForRemoval(entityId) {
      if (!this.entities.has(entityId)) return;
      this.pendingRemovals.add(entityId);
    }
  
    flushRemovals() {
      for (const entityId of this.pendingRemovals) {
        this.removeEntity(entityId);
      }
      this.pendingRemovals.clear();
    }
  
    getEntities(componentClasses) {
      const entities = [];
      for (const entityId of this.entities) {
        if (componentClasses.every(cls => this.hasComponent(entityId, cls))) {
          entities.push(entityId);
        }
      }
      return entities;
    }
  
    hasComponent(entityId, componentClass) {
      const componentName = componentClass.name;
      return this.components.has(componentName) && this.components.get(componentName).has(entityId);
    }
  
    getComponent(entityId, componentClass) {
      const componentName = componentClass.name;
      if (!this.hasComponent(entityId, componentClass)) {
        return undefined;
      }
      return this.components.get(componentName).get(entityId);
    }
  
    addSystem(system) {
      this.systems.push(system);
    }
  
    // --- ★★★ ここからが新しいイベントシステム ★★★ ---
  
    /**
     * 指定したイベントタイプに関心のあるリスナー（関数）を登録する
     * @param {string} eventType - イベントのタイプ (例: 'COLLISION')
     * @param {Function} listener - イベント発生時に呼び出されるコールバック関数
     */
    subscribe(eventType, listener) {
      if (!this.eventListeners.has(eventType)) {
        this.eventListeners.set(eventType, []);
      }
      this.eventListeners.get(eventType).push(listener);
    }
  
    /**
     * イベントを発行（キューに追加）する
     * @param {object} event - イベントオブジェクト (例: { type: 'COLLISION', ... })
     */
    publish(event) {
      this.eventQueue.push(event);
    }
  
    /**
     * キューに溜まったすべてのイベントを処理し、購読者にディスパッチする
     * このメソッドは、通常フレームの最後に一度だけ呼び出される
     */
    processEvents() {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift(); // 先頭からイベントを取り出す
        const listeners = this.eventListeners.get(event.type);
  
        if (listeners) {
          for (const listener of listeners) {
            listener(event); // 登録されたリスナーをすべて実行
          }
        }
      }
    }
  
    // --- ★★★ ゲームループの更新処理 ★★★ ---
  
    update(dt) {
      // 1. 各システムのロジックを更新
      for (const system of this.systems) {
        system.update(dt);
      }
  
      // 2. 削除予定のエンティティをクリーンアップ
      this.flushRemovals();
  
      // 3. このフレームで発行されたすべてのイベントを処理
      this.processEvents();
    }
  }
  