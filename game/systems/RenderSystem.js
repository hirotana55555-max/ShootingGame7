import { Position, Renderable, Rotation, Collidable } from '../components/index.js'; // ← ★Collidableをインポート

export class RenderSystem {
  constructor(world) {
    this.world = world;
    this.query = [Position, Renderable]; 
  }

  update(dt) {
    const context = this.world.context;
    const entities = this.world.getEntities(this.query);

    for (const entityId of entities) {
      const position = this.world.getComponent(entityId, Position);
      const renderable = this.world.getComponent(entityId, Renderable);
      const rotation = this.world.getComponent(entityId, Rotation);

      context.save(); 
      context.translate(position.x, position.y);
      
      if (rotation) {
        context.rotate(rotation.angle);
      }

      context.fillStyle = renderable.color;

      if (renderable.shape === 'triangle') {
        context.beginPath();
        context.moveTo(0, -renderable.height / 2);
        context.lineTo(-renderable.width / 2, renderable.height / 2);
        context.lineTo(renderable.width / 2, renderable.height / 2);
        context.closePath();
        context.fill();
      } else {
        context.fillRect(
          -renderable.width / 2, 
          -renderable.height / 2, 
          renderable.width, 
          renderable.height
        );
      }

      context.restore();

      // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
      // ★ ここからが当たり判定を可視化するデバッグコードです
      
      // 1. もしこのエンティティがCollidableコンポーネントを持っていたら...
      const collidable = this.world.getComponent(entityId, Collidable);
      if (collidable) {
        context.save();
        context.translate(position.x, position.y); // 再びエンティティの中心へ

        // 2. 半透明の赤い円を描画設定
        context.strokeStyle = 'red';
        context.lineWidth = 1;
        context.globalAlpha = 0.5; // 半透明にする

        // 3. Collidableの半径を使って円を描画
        context.beginPath();
        context.arc(0, 0, collidable.radius, 0, Math.PI * 2);
        context.stroke();

        context.restore();
      }
      // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    }
  }
}
