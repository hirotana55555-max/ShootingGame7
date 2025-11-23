// コピー＆ペースト用：entityFactory.js の完成形コード
import { Position, Renderable, Velocity, Controllable, Rotation, Team, Bullet, Lifetime, Health, Collidable } from '../components/index.js';

export function createPlayer(world) {
  const canvas = world.canvas;
  if (!canvas) throw new Error('Worldにcanvasが設定されていません。');
  
  const player = world.createEntity();

  world.addComponent(player, new Position({ x: canvas.width / 2, y: canvas.height - 100 }));
  world.addComponent(player, new Renderable({ color: 'white', width: 20, height: 30, shape: 'triangle' }));
  world.addComponent(player, new Velocity({ vx: 0, vy: 0 }));
  world.addComponent(player, new Rotation({ angle: 0 }));
  world.addComponent(player, new Controllable({}));
  
  // 【統一後】文字列を直接渡す
  world.addComponent(player, new Team('player'));

  return player;
}

export function createBullet(world, { ownerPosition, ownerTeam, vx, vy }) {
  const bullet = world.createEntity();

  world.addComponent(bullet, new Position({ x: ownerPosition.x, y: ownerPosition.y }));
  world.addComponent(bullet, new Velocity({ vx, vy }));
  world.addComponent(bullet, new Renderable({ color: 'yellow', width: 5, height: 10, shape: 'rectangle' }));
  world.addComponent(bullet, new Collidable({ group: 'player_bullet', radius: 5 }));
  world.addComponent(bullet, new Lifetime({ duration: 0.8 }));
  world.addComponent(bullet, new Bullet({}));

  // 【統一後】文字列を直接渡す。万が一に備えたフォールバックも維持。
  world.addComponent(bullet, new Team(ownerTeam || 'unknown'));

  return bullet;
}

export function createMeteor(world, { x, y }) {
  const meteor = world.createEntity();
  const speed = 1.0 + Math.random() * 0.5;
  const angle = (Math.random() - 0.5) * Math.PI / 4;
  const vx = Math.sin(angle) * speed;
  const vy = Math.cos(angle) * speed;

  world.addComponent(meteor, new Position({ x, y }));
  world.addComponent(meteor, new Velocity({ vx, vy }));
  world.addComponent(meteor, new Renderable({ color: 'gray', width: 20, height: 20, shape: 'rectangle' }));
  world.addComponent(meteor, new Health({current: 3}));
  world.addComponent(meteor, new Collidable({ group: 'enemy', radius: 20 }));

  // 【統一後】文字列を直接渡す
  world.addComponent(meteor, new Team('enemy'));

  return meteor;
}
