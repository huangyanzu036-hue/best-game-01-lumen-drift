// Enemies: five archetypes with distinct behaviors. Each enemy is a plain
// object with a `kind`, a position, health and behavior timers; `updateEnemy`
// moves it and tells the game when it wants to shoot, lunge or summon.

import { ARENA, ENEMIES } from './config.js';
import { angleTo, clamp, distance, moveToward, randomIn } from './utils.js';

let nextId = 1;

export function createEnemy(kind, x, y, waveScale, rng) {
  const def = ENEMIES[kind];
  const hp = Math.round(def.hp * waveScale);
  return {
    id: nextId++,
    kind,
    label: def.label,
    x,
    y,
    radius: def.radius,
    speed: def.speed * (0.9 + rng() * 0.2),
    hp,
    maxHp: hp,
    score: def.score,
    shards: def.shards,
    color: def.color,
    behavior: def.behavior,
    // Behavior state, used by whichever behavior the kind has.
    shotTimer: randomIn(rng, 0.5, def.shotInterval ?? 1),
    lungeState: 'chase', // chase -> windup -> lunging -> recover
    lungeTimer: 0,
    lungeDirX: 0,
    lungeDirY: 0,
    summonTimer: def.summonInterval ?? 0,
    burstCount: 0,
    flash: 0, // hit-flash timer for the renderer
    wobble: rng() * Math.PI * 2,
    spawnScale: 0, // grows from 0 to 1 as the enemy warps in
  };
}

// Boss radial burst: angles for a ring of orbs, rotating a little each time.
export function bossBurstAngles(count, offset) {
  const angles = [];
  for (let i = 0; i < count; i += 1) {
    angles.push(offset + (i / count) * Math.PI * 2);
  }
  return angles;
}

// Move one enemy for a frame. Returns an action for the game to carry out:
// { type: 'shoot', angle }, { type: 'burst' }, { type: 'summon' } or null.
export function updateEnemy(enemy, dt, player, rng, scale, worldWidth, worldHeight) {
  enemy.flash = Math.max(0, enemy.flash - dt);
  enemy.spawnScale = Math.min(1, enemy.spawnScale + dt * 2.2);
  enemy.wobble += dt * 3;
  const distToPlayer = distance(enemy.x, enemy.y, player.x, player.y);
  const def = ENEMIES[enemy.kind];
  const speed = enemy.speed * scale;

  switch (enemy.behavior) {
    case 'chase': {
      const step = speed * dt;
      const next = moveToward(enemy.x, enemy.y, player.x, player.y, step);
      enemy.x = next.x;
      enemy.y = next.y;
      break;
    }
    case 'lunge': {
      enemy.lungeTimer -= dt;
      if (enemy.lungeState === 'chase') {
        const next = moveToward(enemy.x, enemy.y, player.x, player.y, speed * dt);
        enemy.x = next.x;
        enemy.y = next.y;
        if (distToPlayer < def.lungeRange * scale && enemy.lungeTimer <= 0) {
          enemy.lungeState = 'windup';
          enemy.lungeTimer = def.lungeWindup;
        }
      } else if (enemy.lungeState === 'windup') {
        // Telegraph: hold still, flashing, aimed at the player.
        enemy.lungeDirX = (player.x - enemy.x) / (distToPlayer || 1);
        enemy.lungeDirY = (player.y - enemy.y) / (distToPlayer || 1);
        if (enemy.lungeTimer <= 0) {
          enemy.lungeState = 'lunging';
          enemy.lungeTimer = 0.32;
        }
      } else if (enemy.lungeState === 'lunging') {
        enemy.x += enemy.lungeDirX * def.lungeSpeed * scale * dt;
        enemy.y += enemy.lungeDirY * def.lungeSpeed * scale * dt;
        if (enemy.lungeTimer <= 0) {
          enemy.lungeState = 'chase';
          enemy.lungeTimer = def.lungeCooldown;
        }
      }
      break;
    }
    case 'shoot': {
      // Keep a preferred distance: drift closer when far, back off when close.
      const preferred = def.preferredRange * scale;
      const angle = angleTo(enemy.x, enemy.y, player.x, player.y);
      if (distToPlayer > preferred + 30) {
        enemy.x += Math.cos(angle) * speed * dt;
        enemy.y += Math.sin(angle) * speed * dt;
      } else if (distToPlayer < preferred - 60) {
        enemy.x -= Math.cos(angle) * speed * 0.8 * dt;
        enemy.y -= Math.sin(angle) * speed * 0.8 * dt;
      } else {
        // Strafe slowly so the player cannot sit still.
        enemy.x += Math.cos(angle + Math.PI / 2) * speed * 0.5 * dt * Math.sin(enemy.wobble);
        enemy.y += Math.sin(angle + Math.PI / 2) * speed * 0.5 * dt * Math.sin(enemy.wobble);
      }
      enemy.shotTimer -= dt;
      if (enemy.shotTimer <= 0 && enemy.spawnScale >= 1) {
        enemy.shotTimer = def.shotInterval * randomIn(rng, 0.85, 1.2);
        return { type: 'shoot', angle: angleTo(enemy.x, enemy.y, player.x, player.y) };
      }
      break;
    }
    case 'boss': {
      // The Sovereign drifts toward the player slowly and fires radial
      // bursts; every so often it summons wisps to crowd the arena.
      const next = moveToward(enemy.x, enemy.y, player.x, player.y, speed * dt);
      enemy.x = next.x;
      enemy.y = next.y;
      enemy.shotTimer -= dt;
      enemy.summonTimer -= dt;
      if (enemy.summonTimer <= 0) {
        enemy.summonTimer = def.summonInterval;
        return { type: 'summon' };
      }
      if (enemy.shotTimer <= 0 && enemy.spawnScale >= 1) {
        enemy.shotTimer = def.shotInterval;
        enemy.burstCount += 1;
        return { type: 'burst', offset: enemy.burstCount * 0.35 };
      }
      break;
    }
    default:
      break;
  }

  // Keep enemies inside the arena.
  const wall = ARENA.wall * scale;
  enemy.x = clamp(enemy.x, wall, worldWidth - wall);
  enemy.y = clamp(enemy.y, wall, worldHeight - wall);
  return null;
}
