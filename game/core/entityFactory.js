import { 
    Position, 
    Renderable, 
    Velocity, 
    Controllable, 
    Rotation, 
    Team, 
    Bullet, 
    Lifetime,
    Health,
    Collidable
  } from '../components/index.js';
  
  /**
   * プレイヤーエンティティを作成し返す 
   */
  export function createPlayer(world) {
    const canvas = world.canvas;
    if (!canvas) {
      throw new Error('Worldにcanvasが設定されていません。');
    }
  
    const player = world.createEntity();
    world.addComponent(player, new Position(canvas.width / 2, canvas.height - 100));
    world.addComponent(player, new Renderable('white', 20, 30, 'triangle'));
    world.addComponent(player, new Velocity(0, 0));
    world.addComponent(player, new Controllable());
    world.addComponent(player, new Rotation(0));
    world.addComponent(player, new Team('player'));
  
    console.log(`プレイヤーを作成しました (ID: ${player})`);
    return player;
  }
  
  /**
   * 弾丸エンティティを作成して返す
   */
  export function createBullet(world, ownerPosition, ownerRotation, ownerTeam) {
    const bullet = world.createEntity();
    const speed = 10.0;
    const vx = Math.sin(ownerRotation.angle) * speed;
    const vy = -Math.cos(ownerRotation.angle) * speed;
  
    world.addComponent(bullet, new Position(ownerPosition.x, ownerPosition.y));
    world.addComponent(bullet, new Velocity(vx, vy));
    world.addComponent(bullet, new Renderable('yellow', 5, 10, 'rectangle'));
    world.addComponent(bullet, new Bullet());
    world.addComponent(bullet, new Team(ownerTeam));
    world.addComponent(bullet, new Lifetime(0.8));
  
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★ ここに Collidable コンポーネントを追加します！
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    world.addComponent(bullet, new Collidable('player_bullet', 5)); // 半径5の当たり判定
  
    return bullet;
  }
  
  /**
   * 隕石エンティティを作成して返す
   * @param {World} world - ワールドオブジェクト
   * @param {number} x - 初期位置X
   * @param {number} y - 初期位置Y
   */
  export function createMeteor(world, x, y) {
    const meteor = world.createEntity();
  
    const speed = 1.0 + Math.random() * 0.5;
    const angle = (Math.random() - 0.5) * Math.PI / 4;
    const vx = Math.sin(angle) * speed;
    const vy = Math.cos(angle) * speed;
  
    world.addComponent(meteor, new Position(x, y));
    world.addComponent(meteor, new Velocity(vx, vy));
    world.addComponent(meteor, new Renderable('gray', 20, 20, 'rectangle'));
    world.addComponent(meteor, new Team('enemy'));
    world.addComponent(meteor, new Health(3));
    world.addComponent(meteor, new Collidable('enemy', 20));
  
    return meteor;
  }
  