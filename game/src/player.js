// The player: a Lumen Warden spark. Movement, dashing with brief
// invulnerability, aiming at the mouse and firing bolts. Upgrades mutate the
// stats on this object (see upgrades.js), so the player is the single place
// that owns what the warden can do.

import { ARENA, PLAYER } from './config.js';
import { clamp } from './utils.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER.radius;
    this.speed = PLAYER.speed;
    this.maxHull = PLAYER.maxHull;
    this.hull = PLAYER.maxHull;
    this.fireInterval = PLAYER.fireInterval;
    this.fireTimer = 0;
    this.bulletSpeed = PLAYER.bulletSpeed;
    this.bulletDamage = PLAYER.bulletDamage;
    this.magnetRadius = PLAYER.magnetRadius;
    this.dashCooldown = PLAYER.dashCooldown;
    this.dashTimer = 0; // time until the next dash is ready
    this.dashTimeLeft = 0; // time remaining in the current dash
    this.dashDirX = 0;
    this.dashDirY = 0;
    this.aimAngle = -Math.PI / 2;
    this.shots = 1; // parallel bolts per volley
    this.pierce = 0; // extra enemies each bolt can pass through
    this.novaLevel = 0; // 0 = no nova pulse
    this.novaTimer = 0;
    this.orbs = 0; // guardian orbs circling the player
    this.orbAngle = 0;
    this.orbFireTimer = 0;
    this.overchargeTimer = 0; // doubled fire rate while this runs
    this.invulnerableTimer = 0; // brief grace after taking a hit
    this.alive = true;
  }

  get dashReady() {
    return this.dashTimer <= 0;
  }

  get isDashing() {
    return this.dashTimeLeft > 0;
  }

  get isInvulnerable() {
    return this.isDashing || this.invulnerableTimer > 0;
  }

  get overcharged() {
    return this.overchargeTimer > 0;
  }

  aimAt(mouseX, mouseY) {
    this.aimAngle = Math.atan2(mouseY - this.y, mouseX - this.x);
  }

  tryDash(moveX, moveY) {
    if (!this.dashReady || this.isDashing) return false;
    const hasDirection = moveX !== 0 || moveY !== 0;
    this.dashDirX = hasDirection ? moveX : Math.cos(this.aimAngle);
    this.dashDirY = hasDirection ? moveY : Math.sin(this.aimAngle);
    this.dashTimeLeft = PLAYER.dashTime;
    this.dashTimer = this.dashCooldown;
    return true;
  }

  takeDamage(amount) {
    if (this.isInvulnerable || !this.alive) return false;
    this.hull -= amount;
    this.invulnerableTimer = 0.6;
    if (this.hull <= 0) {
      this.hull = 0;
      this.alive = false;
    }
    return true;
  }

  heal(amount) {
    this.hull = Math.min(this.maxHull, this.hull + amount);
  }

  update(dt, moveX, moveY, scale, worldWidth, worldHeight) {
    this.fireTimer -= dt;
    this.dashTimer -= dt;
    this.invulnerableTimer -= dt;
    this.overchargeTimer -= dt;
    this.orbAngle += dt * 2.4;

    if (this.isDashing) {
      this.dashTimeLeft -= dt;
      this.x += this.dashDirX * PLAYER.dashSpeed * scale * dt;
      this.y += this.dashDirY * PLAYER.dashSpeed * scale * dt;
    } else {
      this.x += moveX * this.speed * scale * dt;
      this.y += moveY * this.speed * scale * dt;
    }
    const wall = ARENA.wall * scale;
    const radius = this.radius * scale;
    this.x = clamp(this.x, wall + radius, worldWidth - wall - radius);
    this.y = clamp(this.y, wall + radius, worldHeight - wall - radius);

    if (this.novaLevel > 0) this.novaTimer -= dt;
    this.orbFireTimer -= dt;
  }

  // Nova pulses fire on their own timer; the game asks whether one is due.
  novaDue() {
    if (this.novaLevel === 0) return false;
    if (this.novaTimer <= 0) {
      this.novaTimer = 6;
      return true;
    }
    return false;
  }

  get novaRadius() {
    return 110 + this.novaLevel * 30;
  }

  get novaDamage() {
    return 20 + this.novaLevel * 15;
  }
}
