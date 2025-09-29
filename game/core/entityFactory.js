// game/core/entityFactory.js 【このコードで全文を置き換えてください】

import * as Components from '../components/index.js';

/**
 * プレイヤーエンティティを作成し返す 
 */
export function createPlayer(world) {
  const canvas = world.canvas;
  if (!canvas) {
    throw new Error('Worldにcanvasが設定されていません。');
  }

  const player = world.createEntity();
  world.addComponent(player, new Components.Position({ x: canvas.width / 2, y: canvas.height - 100 }));
  world.addComponent(player, new Components.Renderable({ color: 'white', width: 20, height: 30, shape: 'triangle' }));
  world.addComponent(player, new Components.Velocity({ vx: 0, vy: 0 }));
  world.addComponent(player, new Components.Controllable({}));
  world.addComponent(player, new Components.Rotation({ angle: 0 }));
  world.addComponent(player, new Components.Team({ id: 'player' }));

  console.log(`プレイヤーを作成しました (ID: ${player})`);
  return player;
}

/**
 * 弾丸エンティティを作成して返す
 */
export function createBullet(world, { ownerPosition, ownerRotation, ownerTeam }) {
  const bullet = world.createEntity();
  const speed = 10.0;
  const vx = Math.sin(ownerRotation.angle) * speed;
  const vy = -Math.cos(ownerRotation.angle) * speed;

  world.addComponent(bullet, new Components.Position({ x: ownerPosition.x, y: ownerPosition.y }));
  world.addComponent(bullet, new Components.Velocity({ vx, vy }));
  world.addComponent(bullet, new Components.Renderable({ color: 'yellow', width: 5, height: 10, shape: 'rectangle' }));
  world.addComponent(bullet, new Components.Bullet({}));
  world.addComponent(bullet, new Components.Team({ id: ownerTeam }));
  world.addComponent(bullet, new Components.Lifetime({ duration: 0.8 }));
  world.addComponent(bullet, new Components.Collidable({ group: 'player_bullet', radius: 5 }));

  return bullet;
}

/**
 * 隕石エンティティを作成して返す
 */
export function createMeteor(world, { x, y }) {
  const meteor = world.createEntity();

  const speed = 1.0 + Math.random() * 0.5;
  const angle = (Math.random() - 0.5) * Math.PI / 4;
  const vx = Math.sin(angle) * speed;
  const vy = Math.cos(angle) * speed;

  world.addComponent(meteor, new Components.Position({ x, y }));
  world.addComponent(meteor, new Components.Velocity({ vx, vy }));
  world.addComponent(meteor, new Components.Renderable({ color: 'gray', width: 20, height: 20, shape: 'rectangle' }));
  world.addComponent(meteor, new Components.Team({ id: 'enemy' }));
  world.addComponent(meteor, new Components.Health({ value: 3 }));
  world.addComponent(meteor, new Components.Collidable({ group: 'enemy', radius: 20 }));

  return meteor;
}
