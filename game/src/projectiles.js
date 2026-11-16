// Projectiles: the player's bolts and the enemies' orbs. Kept in two flat
// arrays with a simple update that moves them, ages them and drops the ones
// that leave the arena. Collision is resolved by the game, not here.

export class Projectiles {
  constructor() {
    this.playerBolts = []; // { x, y, vx, vy, damage, pierce, radius, life }
    this.enemyOrbs = []; // { x, y, vx, vy, damage, radius, life }
  }

  firePlayerBolt(x, y, angle, speed, damage, pierce) {
    this.playerBolts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      pierce,
      radius: 4,
      life: 0,
      hitIds: new Set(),
    });
  }

  fireEnemyOrb(x, y, angle, speed, damage) {
    this.enemyOrbs.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      radius: 6,
      life: 0,
    });
  }

  update(dt, width, height) {
    const margin = 60;
    for (const bolt of this.playerBolts) {
      bolt.life += dt;
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
    }
    for (const orb of this.enemyOrbs) {
      orb.life += dt;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
    }
    const inside = (p) => p.x > -margin && p.x < width + margin && p.y > -margin && p.y < height + margin && p.life < 4;
    this.playerBolts = this.playerBolts.filter(inside);
    this.enemyOrbs = this.enemyOrbs.filter(inside);
  }

  clear() {
    this.playerBolts = [];
    this.enemyOrbs = [];
  }
}
