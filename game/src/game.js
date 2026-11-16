// The game: owns the state machine (title, playing, upgrade choice, paused,
// game over, victory), the fixed-step update loop, collisions, scoring and
// the combo. Systems (player, enemies, waves, particles, audio) plug in here
// and stay ignorant of each other.

import { ARENA, COMBO, ENEMIES, PALETTE, PICKUPS, PLAYER, WAVES_TOTAL } from './config.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { Particles } from './particles.js';
import { Player } from './player.js';
import { Projectiles } from './projectiles.js';
import { Pickups } from './pickups.js';
import { WaveDirector } from './waves.js';
import { UpgradeDeck } from './upgrades.js';
import { Renderer } from './render.js';
import { bossBurstAngles, createEnemy, updateEnemy } from './enemies.js';
import { clamp, distance, formatScore, formatTime, mulberry32 } from './utils.js';

export const STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  UPGRADE: 'upgrade',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  VICTORY: 'victory',
};

const HIGH_SCORE_KEY = 'lumen-drift-high-score';

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui; // DOM hooks: HUD elements and overlay screens
    this.input = new Input(canvas);
    this.sound = new SoundEngine();
    this.renderer = new Renderer(canvas);
    this.particles = new Particles();
    this.projectiles = new Projectiles();
    this.pickups = new Pickups();
    this.rng = mulberry32((Date.now() % 2147483647) || 1);
    this.waves = new WaveDirector(this.rng);
    this.deck = new UpgradeDeck(this.rng);

    this.state = STATES.TITLE;
    this.scale = 1;
    this.width = ARENA.width;
    this.height = ARENA.height;
    this.time = 0;
    this.runTime = 0;
    this.score = 0;
    this.shards = 0;
    this.kills = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.enemies = [];
    this.player = new Player(ARENA.width / 2, ARENA.height / 2);
    this.offeredUpgrades = [];
    this.waveBannerTimer = 0;
    this.waveBannerText = '';
    this.highScore = Number(window.localStorage.getItem(HIGH_SCORE_KEY) ?? 0) || 0;
    this.lastTimestamp = 0;
    this.rafId = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  // The canvas fills its container; the logical arena stays 960x600 and the
  // game scales positions and speeds to match the real size.
  resize() {
    const container = this.canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.resize(width, height, dpr);
    this.width = width;
    this.height = height;
    this.scale = Math.min(width / ARENA.width, height / ARENA.height);
    // Keep the player inside the arena after a resize.
    if (this.player) {
      this.player.x = clamp(this.player.x, 0, this.width);
      this.player.y = clamp(this.player.y, 0, this.height);
    }
  }

  start() {
    this.ui.showTitle(this.highScore);
    this.lastTimestamp = performance.now();
    const loop = (timestamp) => {
      const dt = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000);
      this.lastTimestamp = timestamp;
      this.time += dt;
      this.frame(dt);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  startRun() {
    this.sound.ensure();
    this.sound.startMusic();
    this.rng = mulberry32((Date.now() % 2147483647) || 1);
    this.waves = new WaveDirector(this.rng);
    this.deck = new UpgradeDeck(this.rng);
    this.player = new Player(this.width / 2, this.height / 2);
    this.enemies = [];
    this.projectiles.clear();
    this.pickups.clear();
    this.particles.clear();
    this.score = 0;
    this.shards = 0;
    this.kills = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.runTime = 0;
    this.waves.startWave(1);
    this.showWaveBanner('Wave 1');
    this.sound.waveStart();
    this.setState(STATES.PLAYING);
  }

  setState(next) {
    this.state = next;
    this.ui.showState(next, this.snapshot());
  }

  snapshot() {
    return {
      score: this.score,
      highScore: this.highScore,
      wave: this.waves.wave,
      wavesTotal: WAVES_TOTAL,
      hull: Math.ceil(this.player.hull),
      maxHull: this.player.maxHull,
      shards: this.shards,
      combo: this.combo,
      dashReady: this.player.dashReady,
      dashFraction: 1 - clamp(this.player.dashTimer / this.player.dashCooldown, 0, 1),
      overcharged: this.player.overcharged,
      kills: this.kills,
      runTime: formatTime(this.runTime),
      boss: this.enemies.find((e) => e.kind === 'boss') ?? null,
      isNewHighScore: this.score > 0 && this.score >= this.highScore,
    };
  }

  showWaveBanner(text) {
    this.waveBannerText = text;
    this.waveBannerTimer = 2.2;
    this.ui.showWaveBanner(text);
  }

  frame(dt) {
    if (this.state === STATES.TITLE) {
      this.updateTitleBackdrop(dt);
    } else if (this.state === STATES.PLAYING) {
      this.updatePlaying(dt);
    } else if (this.state === STATES.UPGRADE) {
      this.particles.update(dt);
    }
    // Paused, game over and victory freeze the world but keep rendering it.

    if (this.input.wasPressed('KeyM')) {
      this.sound.setMuted(!this.sound.muted);
      this.ui.setMuted(this.sound.muted);
    }
    if (this.state === STATES.PLAYING && this.input.wasPressed('KeyP')) {
      this.setState(STATES.PAUSED);
    } else if (this.state === STATES.PAUSED && (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape'))) {
      this.setState(STATES.PLAYING);
    }
    if ((this.state === STATES.GAMEOVER || this.state === STATES.VICTORY) && this.input.wasPressed('KeyR')) {
      this.startRun();
    }
    if (this.state === STATES.TITLE && this.input.wasPressed('Enter')) {
      this.startRun();
    }

    this.renderer.draw(
      {
        width: this.width,
        height: this.height,
        scale: this.scale,
        player: this.player,
        enemies: this.enemies,
        projectiles: this.projectiles,
        pickups: this.pickups,
        particles: this.particles,
      },
      this.time,
    );
    if (this.state === STATES.PLAYING || this.state === STATES.UPGRADE || this.state === STATES.PAUSED) {
      this.ui.updateHud(this.snapshot());
    }
    if (this.waveBannerTimer > 0) {
      this.waveBannerTimer -= dt;
      if (this.waveBannerTimer <= 0) this.ui.hideWaveBanner();
    }
    this.input.endFrame();
  }

  // The title screen shows a calm, drifting scene behind the menu.
  updateTitleBackdrop(dt) {
    this.particles.update(dt);
    if (Math.random() < dt * 2) {
      this.particles.burst(
        Math.random() * this.width,
        Math.random() * this.height,
        '#7df9ff',
        1,
        20,
        2,
      );
    }
  }

  updatePlaying(dt) {
    this.runTime += dt;
    const player = this.player;
    const move = this.input.moveVector();
    player.aimAt(this.input.mouseX, this.input.mouseY);

    if (this.input.wasPressed('Space') || this.input.wasPressed('ShiftLeft') || this.input.wasPressed('ShiftRight')) {
      if (player.tryDash(move.x, move.y)) {
        this.sound.dash();
        this.particles.ring(player.x, player.y, PALETTE.player, 46);
      }
    }
    if (player.isDashing) {
      this.particles.trail(player.x, player.y, PALETTE.player, 7);
    }
    player.update(dt, move.x, move.y, this.scale, this.width, this.height);

    // Firing: hold the mouse button (or hold Space-free auto-fire is off by
    // design — aiming and firing stay one deliberate action).
    if (this.input.mouseDown && player.fireTimer <= 0) {
      this.firePlayerVolley();
    }

    // Guardian orbs fire on their own at the nearest enemy.
    if (player.orbs > 0 && player.orbFireTimer <= 0 && this.enemies.length > 0) {
      const nearest = this.nearestEnemy(player.x, player.y);
      if (nearest) {
        player.orbFireTimer = 0.7;
        const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
        this.projectiles.firePlayerBolt(player.x, player.y, angle, PLAYER.bulletSpeed, 8, 0);
        this.sound.shoot();
      }
    }

    // Nova pulse: a radial blast on its own timer.
    if (player.novaDue()) {
      this.sound.nova();
      this.particles.ring(player.x, player.y, '#bffbff', player.novaRadius * this.scale);
      this.renderer.addShake(4);
      for (const enemy of this.enemies) {
        if (distance(enemy.x, enemy.y, player.x, player.y) < player.novaRadius * this.scale) {
          this.damageEnemy(enemy, player.novaDamage);
        }
      }
    }

    // Spawn the wave's drip feed.
    for (const enemy of this.waves.update(dt, player, this.scale, this.width, this.height)) {
      this.enemies.push(enemy);
      this.particles.ring(enemy.x, enemy.y, enemy.color, 40);
    }

    // Enemies act.
    for (const enemy of this.enemies) {
      const action = updateEnemy(enemy, dt, player, this.rng, this.scale, this.width, this.height);
      if (!action) continue;
      if (action.type === 'shoot') {
        const def = ENEMIES[enemy.kind];
        this.projectiles.fireEnemyOrb(enemy.x, enemy.y, action.angle, def.bulletSpeed * this.scale, def.bulletDamage);
        this.sound.enemyShoot();
      } else if (action.type === 'burst') {
        const def = ENEMIES.boss;
        const count = 10 + this.waves.wave;
        for (const angle of bossBurstAngles(count, action.offset)) {
          this.projectiles.fireEnemyOrb(enemy.x, enemy.y, angle, def.bulletSpeed * this.scale, def.bulletDamage);
        }
        this.sound.enemyShoot();
      } else if (action.type === 'summon') {
        for (const minion of this.waves.summonMinions(enemy)) {
          this.enemies.push(minion);
          this.particles.ring(minion.x, minion.y, minion.color, 36);
        }
      }
    }

    this.projectiles.update(dt, this.width, this.height);
    this.pickups.update(dt, player, this.width, this.height, this.scale);
    this.particles.update(dt);

    this.resolveBoltHits();
    this.resolveEnemyContact();
    this.resolveOrbHits();
    this.resolvePickups();

    // Combo decay.
    if (this.combo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
      }
    }

    // Wave cleared: upgrade choice, or the next wave, or victory.
    if (this.waves.isCleared(this.enemies.length)) {
      if (this.waves.isBossWave) {
        this.finishRun(true);
      } else if (this.waves.wave >= WAVES_TOTAL) {
        this.finishRun(true);
      } else {
        this.offeredUpgrades = this.deck.offer(3);
        this.setState(STATES.UPGRADE);
        this.ui.showUpgrades(this.offeredUpgrades, this.snapshot());
      }
    }
  }

  firePlayerVolley() {
    const player = this.player;
    const interval = player.overcharged ? player.fireInterval * 0.5 : player.fireInterval;
    player.fireTimer = interval;
    const spread = 0.06;
    for (let i = 0; i < player.shots; i += 1) {
      const offset = (i - (player.shots - 1) / 2) * spread;
      const side = (i - (player.shots - 1) / 2) * 10 * this.scale;
      const px = player.x + Math.cos(player.aimAngle + Math.PI / 2) * side;
      const py = player.y + Math.sin(player.aimAngle + Math.PI / 2) * side;
      this.projectiles.firePlayerBolt(
        px,
        py,
        player.aimAngle + offset,
        player.bulletSpeed * this.scale,
        player.bulletDamage,
        player.pierce,
      );
    }
    this.sound.shoot();
  }

  nearestEnemy(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const enemy of this.enemies) {
      const d = distance(x, y, enemy.x, enemy.y);
      if (d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    }
    return best;
  }

  damageEnemy(enemy, amount) {
    enemy.hp -= amount;
    enemy.flash = 0.08;
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    enemy.hp = 0;
    this.kills += 1;
    this.combo = Math.min(COMBO.maxMultiplier, this.combo + 1);
    this.comboTimer = COMBO.window;
    const gained = enemy.score * this.combo;
    this.score += gained;
    this.particles.burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 60 : 18, 220, 4);
    this.particles.floatText(enemy.x, enemy.y - 10, `+${formatScore(gained)}`, '#ffffff', 15);
    if (this.combo >= 3) {
      this.particles.floatText(enemy.x, enemy.y - 30, `x${this.combo} COMBO`, '#ffe066', 13);
    }
    this.sound.explosion(enemy.kind === 'boss');
    this.renderer.addShake(enemy.kind === 'boss' ? 14 : 3);
    this.pickups.dropShards(enemy.x, enemy.y, enemy.shards, this.rng);
    // Splitters burst into wisps.
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < ENEMIES.splitter.splitCount; i += 1) {
        const angle = this.rng() * Math.PI * 2;
        const child = createEnemy(
          'wisp',
          enemy.x + Math.cos(angle) * 24,
          enemy.y + Math.sin(angle) * 24,
          this.waves.hpScale,
          this.rng,
        );
        this.enemies.push(child);
      }
    }
    // Rare bonus drops.
    const roll = this.rng();
    if (roll < PICKUPS.repairDropChance) {
      this.pickups.dropSpecial(enemy.x, enemy.y, 'repair');
    } else if (roll < PICKUPS.repairDropChance + PICKUPS.overchargeDropChance) {
      this.pickups.dropSpecial(enemy.x, enemy.y, 'overcharge');
    }
    this.enemies = this.enemies.filter((e) => e !== enemy);
  }

  resolveBoltHits() {
    for (const bolt of this.projectiles.playerBolts) {
      for (const enemy of this.enemies) {
        if (bolt.hitIds.has(enemy.id)) continue;
        const hitDist = (bolt.radius + enemy.radius * enemy.spawnScale) * this.scale;
        if (distance(bolt.x, bolt.y, enemy.x, enemy.y) < hitDist) {
          bolt.hitIds.add(enemy.id);
          this.damageEnemy(enemy, bolt.damage);
          this.particles.burst(bolt.x, bolt.y, '#bffbff', 4, 120, 2.5);
          this.sound.hit();
          if (bolt.pierce > 0) {
            bolt.pierce -= 1;
          } else {
            bolt.life = 99; // spent; filtered out next update
            break;
          }
        }
      }
    }
    this.projectiles.playerBolts = this.projectiles.playerBolts.filter((b) => b.life < 4);
  }

  resolveEnemyContact() {
    const player = this.player;
    for (const enemy of this.enemies) {
      if (enemy.spawnScale < 0.7) continue; // still warping in, cannot touch
      if (distance(enemy.x, enemy.y, player.x, player.y) < (enemy.radius + player.radius) * this.scale) {
        if (player.takeDamage(PLAYER.contactDamage)) {
          this.sound.hurt();
          this.renderer.addShake(10);
          this.particles.burst(player.x, player.y, PALETTE.danger, 16, 200, 4);
          this.particles.floatText(player.x, player.y - 24, `-${PLAYER.contactDamage}`, PALETTE.danger, 16);
          // The enemy also takes a hit from the collision.
          this.damageEnemy(enemy, 10);
          if (!player.alive) {
            this.finishRun(false);
            return;
          }
        }
      }
    }
  }

  resolveOrbHits() {
    const player = this.player;
    for (const orb of this.projectiles.enemyOrbs) {
      if (distance(orb.x, orb.y, player.x, player.y) < (orb.radius + player.radius) * this.scale) {
        orb.life = 99;
        if (player.takeDamage(orb.damage)) {
          this.sound.hurt();
          this.renderer.addShake(8);
          this.particles.burst(player.x, player.y, PALETTE.danger, 12, 180, 4);
          if (!player.alive) {
            this.finishRun(false);
            return;
          }
        }
      }
    }
    this.projectiles.enemyOrbs = this.projectiles.enemyOrbs.filter((o) => o.life < 4);
  }

  resolvePickups() {
    const collected = this.pickups.collect(this.player, this.scale);
    for (const item of collected) {
      if (item.kind === 'shard') {
        this.shards += 1;
        this.score += item.value * this.combo;
        this.sound.pickup(this.combo);
      } else if (item.kind === 'repair') {
        this.player.heal(PICKUPS.repairAmount);
        this.particles.floatText(this.player.x, this.player.y - 24, `+${PICKUPS.repairAmount} HULL`, '#4dff88', 15);
        this.sound.heal();
      } else if (item.kind === 'overcharge') {
        this.player.overchargeTimer = PICKUPS.overchargeDuration;
        this.particles.floatText(this.player.x, this.player.y - 24, 'OVERCHARGE!', '#ff9f1c', 16);
        this.sound.upgrade();
      }
    }
  }

  chooseUpgrade(upgrade) {
    this.deck.apply(upgrade, this.player);
    this.sound.upgrade();
    this.particles.ring(this.player.x, this.player.y, '#ffe066', 70);
    const nextWave = this.waves.wave + 1;
    this.waves.startWave(nextWave);
    if (this.waves.isBossWave) {
      this.showWaveBanner('The Umbral Sovereign');
      this.sound.bossRoar();
    } else {
      this.showWaveBanner(`Wave ${nextWave}`);
      this.sound.waveStart();
    }
    this.setState(STATES.PLAYING);
  }

  resume() {
    if (this.state === STATES.PAUSED) this.setState(STATES.PLAYING);
  }

  pause() {
    if (this.state === STATES.PLAYING) this.setState(STATES.PAUSED);
  }

  finishRun(won) {
    const isRecord = this.score > this.highScore;
    if (isRecord) {
      this.highScore = this.score;
      window.localStorage.setItem(HIGH_SCORE_KEY, String(this.highScore));
    }
    if (won) {
      this.sound.victory();
      this.particles.burst(this.player.x, this.player.y, '#ffe066', 80, 320, 5);
      this.setState(STATES.VICTORY);
    } else {
      this.sound.gameOver();
      this.sound.stopMusic();
      this.particles.burst(this.player.x, this.player.y, PALETTE.player, 60, 300, 5);
      this.setState(STATES.GAMEOVER);
    }
  }
}
