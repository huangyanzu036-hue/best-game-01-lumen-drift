// All canvas drawing: the starfield arena, the player, enemies, bolts,
// pickups and particles. The renderer owns no game logic; it reads the game
// state and paints it, with a neon glow style drawn from simple shapes.

import { ARENA, PALETTE } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.shake = 0; // screen-shake magnitude, decays each frame
    this.stars = [];
    for (let i = 0; i < 120; i += 1) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.5 + Math.random() * 1.6,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  addShake(amount) {
    this.shake = Math.min(18, this.shake + amount);
  }

  resize(width, height, dpr) {
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  drawBackground(width, height, time, scale) {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 60,
      width / 2, height / 2, Math.max(width, height) * 0.75,
    );
    gradient.addColorStop(0, PALETTE.nebulaA);
    gradient.addColorStop(0.55, PALETTE.nebulaB);
    gradient.addColorStop(1, PALETTE.background);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Faint grid so motion reads clearly.
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    const step = 48;
    ctx.beginPath();
    for (let x = step; x < width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = step; y < height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Twinkling stars.
    for (const star of this.stars) {
      const alpha = 0.35 + 0.35 * Math.sin(time * 1.5 + star.twinkle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#cfe4ff';
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Arena border.
    const wall = ARENA.wall * scale;
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(wall / 2, wall / 2, width - wall, height - wall);
  }

  drawPlayer(player, time, scale) {
    const ctx = this.ctx;
    const radius = player.radius * scale;
    // Blink only during the short grace period after a hit; long
    // invulnerability (dash or a staged scene) never hides the player.
    const flicker = player.invulnerableTimer > 0 && player.invulnerableTimer < 5
      && !player.isDashing && Math.floor(time * 18) % 2 === 0;
    if (flicker) return; // blink while briefly invulnerable after a hit

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = 18 * scale;

    // Hull ring.
    ctx.strokeStyle = player.overcharged ? '#ff9f1c' : PALETTE.player;
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Core.
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Aim needle.
    ctx.rotate(player.aimAngle);
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.moveTo(radius + 8 * scale, 0);
    ctx.lineTo(radius - 2 * scale, -5 * scale);
    ctx.lineTo(radius - 2 * scale, 5 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Guardian orbs circle the player.
    for (let i = 0; i < player.orbs; i += 1) {
      const angle = player.orbAngle + (i * Math.PI * 2) / player.orbs;
      const ox = player.x + Math.cos(angle) * (radius + 16 * scale);
      const oy = player.y + Math.sin(angle) * (radius + 16 * scale);
      ctx.save();
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 12 * scale;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(ox, oy, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawEnemy(enemy, time, scale) {
    const ctx = this.ctx;
    const grow = enemy.spawnScale;
    const radius = enemy.radius * grow * scale;
    if (radius <= 0) return;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 16 * scale;
    const flashing = enemy.flash > 0 || (enemy.lungeState === 'windup' && Math.floor(time * 14) % 2 === 0);
    ctx.fillStyle = flashing ? '#ffffff' : enemy.color;

    if (enemy.kind === 'wisp') {
      // Spiked orb.
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + enemy.wobble * 0.4;
        const r = i % 2 === 0 ? radius : radius * 0.6;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === 'dart') {
      ctx.rotate(Math.atan2(enemy.lungeDirY, enemy.lungeDirX) || 0);
      ctx.beginPath();
      ctx.moveTo(radius + 4, 0);
      ctx.lineTo(-radius, -radius * 0.7);
      ctx.lineTo(-radius * 0.5, 0);
      ctx.lineTo(-radius, radius * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === 'spitter') {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(7, 10, 26, 0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'splitter') {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + enemy.wobble * 0.3;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (enemy.kind === 'boss') {
      // Crowned sovereign: big ringed orb with orbiting shards.
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i += 1) {
        const a = enemy.wobble * 0.8 + (i / 5) * Math.PI * 2;
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (radius + 14), Math.sin(a) * (radius + 14), 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Health bar for tough enemies; the boss has its own bar in the HUD.
    if (enemy.kind !== 'boss' && enemy.maxHp > 40 && enemy.hp < enemy.maxHp) {
      const barWidth = enemy.radius * 2 * scale;
      const ratio = enemy.hp / enemy.maxHp;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - radius - 12 * scale, barWidth, 5 * scale);
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - radius - 12 * scale, barWidth * ratio, 5 * scale);
    }
  }

  drawProjectiles(projectiles, scale) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = '#7df9ff';
    ctx.shadowBlur = 10 * scale;
    ctx.fillStyle = '#bffbff';
    for (const bolt of projectiles.playerBolts) {
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = '#ff2e63';
    ctx.fillStyle = '#ff7aa2';
    for (const orb of projectiles.enemyOrbs) {
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 0.4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7aa2';
    }
    ctx.restore();
  }

  drawPickups(pickups, time, scale) {
    const ctx = this.ctx;
    for (const item of pickups.items) {
      const bob = Math.sin(time * 4 + item.x) * 2;
      const blink = item.life > 11 && Math.floor(time * 8) % 2 === 0;
      if (blink) continue;
      ctx.save();
      ctx.translate(item.x, item.y + bob);
      ctx.scale(scale, scale);
      if (item.kind === 'shard') {
        ctx.shadowColor = PALETTE.shard;
        ctx.shadowBlur = 10;
        ctx.fillStyle = PALETTE.shard;
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
      } else if (item.kind === 'repair') {
        ctx.shadowColor = PALETTE.repair;
        ctx.shadowBlur = 12;
        ctx.fillStyle = PALETTE.repair;
        ctx.fillRect(-2.5, -7, 5, 14);
        ctx.fillRect(-7, -2.5, 14, 5);
      } else if (item.kind === 'overcharge') {
        ctx.shadowColor = PALETTE.overcharge;
        ctx.shadowBlur = 12;
        ctx.fillStyle = PALETTE.overcharge;
        ctx.beginPath();
        ctx.moveTo(2, -8);
        ctx.lineTo(-5, 1);
        ctx.lineTo(0, 1);
        ctx.lineTo(-2, 8);
        ctx.lineTo(6, -2);
        ctx.lineTo(1, -2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Draw one full frame. `state` carries everything visible; the game owns
  // the numbers, this method only paints them.
  draw(state, time) {
    const ctx = this.ctx;
    const { width, height, scale } = state;
    this.shake *= 0.88;
    if (this.shake < 0.2) this.shake = 0;
    const shakeX = (Math.random() - 0.5) * this.shake;
    const shakeY = (Math.random() - 0.5) * this.shake;

    ctx.save();
    ctx.translate(shakeX, shakeY);
    this.drawBackground(width, height, time, scale);
    this.drawPickups(state.pickups, time, scale);
    for (const enemy of state.enemies) this.drawEnemy(enemy, time, scale);
    this.drawProjectiles(state.projectiles, scale);
    if (state.player.alive) this.drawPlayer(state.player, time, scale);
    state.particles.draw(ctx, scale);
    ctx.restore();
  }
}
