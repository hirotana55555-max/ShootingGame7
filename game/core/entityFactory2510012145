// game/core/entityFactory.js 【このコードで全文を置き換えてください】
import { Position, Renderable, Velocity, Controllable, Rotation, Team, Bullet, Lifetime, Health, Collidable } from '../components/index.js';

export function createPlayer(world) {
  const canvas = world.canvas;
  if (!canvas) throw new Error('Worldにcanvasが設定されていません。');
  
  const player = world.createEntity();
  
  // ★★★ モダン化済みの4コンポーネントの呼び出し方を修正 ★★★
  world.addComponent(player, new Position({ x: canvas.width / 2, y: canvas.height - 100 }));
  world.addComponent(player, new Renderable({ color: 'white', width: 20, height: 30, shape: 'triangle' }));
  world.addComponent(player, new Velocity({ vx: 0, vy: 0 }));
  world.addComponent(player, new Rotation({ angle: 0 }));
  
  // --- 未修正のコンポーネントは、あえて古いままにしておく ---
  world.addComponent(player, new Controllable());
  world.addComponent(player, new Team('player'));

  return player;
}

export function createBullet(world, { ownerPosition, ownerRotation, ownerTeam }) {
  const bullet = world.createEntity();
  const speed = 10.0;
  const angle = ownerRotation ? ownerRotation.angle : 0;
  const vx = Math.sin(angle) * speed;
  const vy = -Math.cos(angle) * speed;

  // ★★★ モダン化済みのコンポーネントの呼び出し方を修正 ★★★
  world.addComponent(bullet, new Position({ x: ownerPosition.x, y: ownerPosition.y }));
  world.addComponent(bullet, new Velocity({ vx, vy }));
  world.addComponent(bullet, new Renderable({ color: 'yellow', width: 5, height: 10, shape: 'rectangle' }));
  
  // --- 未修正のコンポーネントは、あえて古いままにしておく ---
  world.addComponent(bullet, new Bullet());
  world.addComponent(bullet, new Team(ownerTeam));
  world.addComponent(bullet, new Lifetime(0.8));
  world.addComponent(bullet, new Collidable('player_bullet', 5));

  return bullet;
}

export function createMeteor(world, { x, y }) {
  const meteor = world.createEntity();
  const speed = 1.0 + Math.random() * 0.5;
  const angle = (Math.random() - 0.5) * Math.PI / 4;
  const vx = Math.sin(angle) * speed;
  const vy = Math.cos(angle) * speed;

  // ★★★ モダン化済みのコンポーネントの呼び出し方を修正 ★★★
  world.addComponent(meteor, new Position({ x, y }));
  world.addComponent(meteor, new Velocity({ vx, vy }));
  world.addComponent(meteor, new Renderable({ color: 'gray', width: 20, height: 20, shape: 'rectangle' }));

  // --- 未修正のコンポーネントは、あえて古いままにしておく ---
  world.addComponent(meteor, new Team('enemy'));
  world.addComponent(meteor, new Health(3));
  world.addComponent(meteor, new Collidable('enemy', 20));

  return meteor;
}
