import { Position, Renderable, Velocity, Controllable, Rotation, Team, Bullet, Lifetime, Health, Collidable } from '../components/index.js';

export function createPlayer(world) {
  const canvas = world.canvas;
  if (!canvas) throw new Error('Worldにcanvasが設定されていません。');
  
  const player = world.createEntity();

  world.addComponent(player, new Position({ x: canvas.width / 2, y: canvas.height - 100 }));
  world.addComponent(player, new Renderable({ color: 'white', width: 20, height: 30, shape: 'triangle' }));
  world.addComponent(player, new Velocity({ vx: 0, vy: 0 }));
  world.addComponent(player, new Rotation({ angle: 0 }));
  world.addComponent(player, new Team({ id: 'player' }));
  world.addComponent(player, new Controllable({}));

  return player;
}

// ★★★ ここからが変更ブロック ★★★
export function createBullet(world, { ownerPosition, ownerTeam, vx, vy }) {
  const bullet = world.createEntity();

  // 速度計算ロジックは削除され、引数で受け取るようになった
  world.addComponent(bullet, new Position({ x: ownerPosition.x, y: ownerPosition.y }));
  world.addComponent(bullet, new Velocity({ vx, vy })); // 引数の値をそのまま使用
  world.addComponent(bullet, new Renderable({ color: 'yellow', width: 5, height: 10, shape: 'rectangle' }));
  world.addComponent(bullet, new Team({ id: ownerTeam }));
  world.addComponent(bullet, new Collidable({ group: 'player_bullet', radius: 5 }));
  world.addComponent(bullet, new Lifetime({ duration: 0.8 }));
  world.addComponent(bullet, new Bullet({}));

  // 検証用のDebugVector追加コードは不要になったため削除

  return bullet;
}
// ★★★ 変更ブロックここまで ★★★

export function createMeteor(world, { x, y }) {
  const meteor = world.createEntity();
  const speed = 1.0 + Math.random() * 0.5;
  const angle = (Math.random() - 0.5) * Math.PI / 4;
  const vx = Math.sin(angle) * speed;
  const vy = Math.cos(angle) * speed;

  world.addComponent(meteor, new Position({ x, y }));
  world.addComponent(meteor, new Velocity({ vx, vy }));
  world.addComponent(meteor, new Renderable({ color: 'gray', width: 20, height: 20, shape: 'rectangle' }));
  world.addComponent(meteor, new Health({value: 3}));
  world.addComponent(meteor, new Team({ id: 'enemy' }));
  world.addComponent(meteor, new Collidable({ group: 'enemy', radius: 20 }));

  return meteor;
}
