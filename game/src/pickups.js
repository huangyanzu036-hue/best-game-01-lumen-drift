// Pickups dropped by defeated enemies: light shards (score), hull cells
// (repair) and overcharge cores (temporary rapid fire). Shards drift toward
// the player once inside the magnet radius, so collecting feels generous.

import { PICKUPS } from './config.js';
import { distance, moveToward, randomIn } from './utils.js';

export class Pickups {
  constructor() {
    this.items = []; // { kind, x, y, vx, vy, life, value }
  }

  dropShards(x, y, count, rng) {
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * Math.PI * 2;
      const speed = randomIn(rng, 40, 140);
      this.items.push({
        kind: 'shard',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        value: PICKUPS.shardScore,
      });
    }
  }

  dropSpecial(x, y, kind) {
    this.items.push({ kind, x, y, vx: 0, vy: -30, life: 0, value: 0 });
  }

  update(dt, player, width, height, scale) {
    for (const item of this.items) {
      item.life += dt;
      // Scatter slows down quickly, then shards home in on the player.
      item.vx *= 0.92;
      item.vy *= 0.92;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      const dist = distance(item.x, item.y, player.x, player.y);
      if (item.kind === 'shard' && dist < player.magnetRadius * scale) {
        const pull = moveToward(item.x, item.y, player.x, player.y, 420 * scale * dt);
        item.x = pull.x;
        item.y = pull.y;
      }
      item.x = Math.max(10, Math.min(width - 10, item.x));
      item.y = Math.max(10, Math.min(height - 10, item.y));
    }
    // Pickups fade after a while so the arena never clutters up.
    this.items = this.items.filter((item) => item.life < 14);
  }

  // Collect every item touching the player; returns the collected items.
  collect(player, scale) {
    const collected = [];
    const reach = (player.radius + 12) * scale;
    this.items = this.items.filter((item) => {
      const touch = distance(item.x, item.y, player.x, player.y) < reach;
      if (touch) collected.push(item);
      return !touch;
    });
    return collected;
  }

  clear() {
    this.items = [];
  }
}
