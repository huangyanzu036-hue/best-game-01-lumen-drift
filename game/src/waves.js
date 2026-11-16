// The wave director: decides what each wave throws at the player and drips
// enemies into the arena from its edges. Waves 1-9 mix the four regular
// archetypes in growing numbers; wave 10 is the boss alone, with summons.

import { WAVES_TOTAL } from './config.js';
import { createEnemy } from './enemies.js';
import { pickRandom, randomIn, randomInt } from './utils.js';

// How many of each kind spawn in each wave (wave 10 is the boss, handled
// separately). Counts grow while the mix widens, so early waves teach one
// enemy at a time and late waves demand juggling all four.
const WAVE_TABLE = {
  1: { wisp: 5 },
  2: { wisp: 7, dart: 2 },
  3: { wisp: 8, dart: 4, spitter: 1 },
  4: { wisp: 8, dart: 5, spitter: 2, splitter: 1 },
  5: { wisp: 10, dart: 6, spitter: 3, splitter: 2 },
  6: { wisp: 12, dart: 7, spitter: 4, splitter: 2 },
  7: { wisp: 12, dart: 9, spitter: 5, splitter: 3 },
  8: { wisp: 14, dart: 10, spitter: 6, splitter: 4 },
  9: { wisp: 16, dart: 12, spitter: 7, splitter: 5 },
};

export class WaveDirector {
  constructor(rng) {
    this.rng = rng;
    this.wave = 0;
    this.queue = []; // kinds waiting to spawn
    this.spawnTimer = 0;
    this.spawnInterval = 0.9;
    this.betweenWaves = false;
    this.betweenTimer = 0;
    this.totalInWave = 0;
  }

  get isBossWave() {
    return this.wave === WAVES_TOTAL;
  }

  // Enemy health scales up a little each wave so late waves stay threatening
  // even as the player collects upgrades.
  get hpScale() {
    return 1 + (this.wave - 1) * 0.14;
  }

  startWave(wave) {
    this.wave = wave;
    this.queue = [];
    if (this.isBossWave) {
      this.queue.push('boss');
      this.totalInWave = 1;
      this.spawnInterval = 0.5;
    } else {
      const mix = WAVE_TABLE[wave] ?? WAVE_TABLE[9];
      for (const [kind, count] of Object.entries(mix)) {
        for (let i = 0; i < count; i += 1) this.queue.push(kind);
      }
      // Shuffle so the wave never arrives in kind order.
      for (let i = this.queue.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.rng() * (i + 1));
        [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
      }
      this.totalInWave = this.queue.length;
      this.spawnInterval = Math.max(0.35, 0.95 - wave * 0.06);
    }
    this.spawnTimer = 0.4;
    this.betweenWaves = false;
  }

  // Pick a spawn point on a random arena edge, away from the player.
  spawnPoint(player, scale, worldWidth, worldHeight) {
    const width = worldWidth;
    const height = worldHeight;
    const margin = 30 * scale;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const edge = randomInt(this.rng, 0, 3);
      let x;
      let y;
      if (edge === 0) { x = randomIn(this.rng, margin, width - margin); y = margin; }
      else if (edge === 1) { x = randomIn(this.rng, margin, width - margin); y = height - margin; }
      else if (edge === 2) { x = margin; y = randomIn(this.rng, margin, height - margin); }
      else { x = width - margin; y = randomIn(this.rng, margin, height - margin); }
      const dist = Math.hypot(x - player.x, y - player.y);
      if (dist > 200 * scale) return { x, y };
    }
    return { x: width / 2, y: margin };
  }

  // Drip the queue into the arena; returns newly spawned enemies.
  update(dt, player, scale, worldWidth, worldHeight) {
    const spawned = [];
    if (this.queue.length === 0) return spawned;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return spawned;
    this.spawnTimer = this.spawnInterval;
    // Later waves release enemies in small groups for pressure.
    const group = this.wave >= 6 && this.queue.length > 3 ? 2 : 1;
    for (let i = 0; i < group && this.queue.length > 0; i += 1) {
      const kind = this.queue.shift();
      const point = this.spawnPoint(player, scale, worldWidth, worldHeight);
      spawned.push(createEnemy(kind, point.x, point.y, this.hpScale, this.rng));
    }
    return spawned;
  }

  get remaining() {
    return this.queue.length;
  }

  // A wave is cleared when nothing is left to spawn and no enemies remain.
  isCleared(enemyCount) {
    return this.queue.length === 0 && enemyCount === 0;
  }

  // Boss summons: two wisps near the boss, scaled to the wave.
  summonMinions(boss) {
    const minions = [];
    for (let i = 0; i < 2; i += 1) {
      const angle = this.rng() * Math.PI * 2;
      minions.push(createEnemy(
        pickRandom(this.rng, ['wisp', 'wisp', 'dart']),
        boss.x + Math.cos(angle) * 70,
        boss.y + Math.sin(angle) * 70,
        this.hpScale,
        this.rng,
      ));
    }
    return minions;
  }
}
