// Screenshot staging: `?shot=<scene>&seed=<n>` puts the game into a fixed,
// photogenic state so the screenshots show the real game at its best. The
// scenes are the title screen, mid-game play, the boss fight and the victory
// screen. Normal play never passes these parameters.

import { STATES } from './game.js';
import { createEnemy } from './enemies.js';
import { mulberry32 } from './utils.js';

export function readShotParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    shot: params.get('shot'),
    seed: Number(params.get('seed') ?? 7) || 7,
  };
}

// Drive the game into a staged scene. Called once, right after boot, before
// the first frame the screenshot tool captures.
export function stageShot(game, shot, seed) {
  if (!shot) return;
  game.rng = mulberry32(seed);
  const scale = game.scale;
  const width = game.width;
  const height = game.height;

  if (shot === 'start') {
    // Title screen over a calm backdrop; nothing else to stage.
    return;
  }

  if (shot === 'play' || shot === 'boss') {
    game.startRun();
    // Silence the music in staged shots; the browser has no gesture anyway.
    game.sound.stopMusic();
    // Staged scenes are for the camera, not for play: the player cannot die
    // while the screenshot is being taken.
    game.player.invulnerableTimer = 60;
    // The run's "Wave 1" banner would lie over a later wave; hide it.
    game.waveBannerTimer = 0;
    game.ui.hideWaveBanner();
    if (shot === 'play') {
      // Wave 3 in full swing: a mixed pack, some bolts in the air, shards
      // scattered and a combo running so the HUD reads alive.
      game.waves.startWave(3);
      game.waves.queue = [];
      game.score = 12450;
      game.shards = 38;
      game.kills = 41;
      game.combo = 4;
      game.comboTimer = 30;
      game.runTime = 187;
      game.player.hull = 78;
      game.player.x = width * 0.42;
      game.player.y = height * 0.55;
      game.player.aimAngle = -0.6;
      const placements = [
        ['wisp', 0.68, 0.3], ['wisp', 0.78, 0.62], ['dart', 0.55, 0.2],
        ['spitter', 0.85, 0.42], ['splitter', 0.3, 0.25], ['wisp', 0.18, 0.72],
        ['dart', 0.62, 0.85],
      ];
      for (const [kind, fx, fy] of placements) {
        const enemy = createEnemy(kind, width * fx, height * fy, game.waves.hpScale, game.rng);
        enemy.spawnScale = 1;
        game.enemies.push(enemy);
      }
      for (let i = 0; i < 3; i += 1) {
        game.projectiles.firePlayerBolt(
          game.player.x + 30 + i * 26, game.player.y - 12 - i * 16,
          -0.6, 560 * scale, 12, 0,
        );
      }
      // A second volley just before the screenshot, so bolts are visible
      // mid-flight instead of already off the top of the frame.
      window.setTimeout(() => {
        for (let i = 0; i < 3; i += 1) {
          game.projectiles.firePlayerBolt(
            game.player.x + 30 + i * 26, game.player.y - 12 - i * 16,
            -0.6, 560 * scale, 12, 0,
          );
        }
      }, 650);
      game.projectiles.fireEnemyOrb(width * 0.8, height * 0.45, 2.6, 210 * scale, 10);
      game.pickups.dropShards(width * 0.5, height * 0.4, 4, game.rng);
      game.pickups.dropShards(width * 0.62, height * 0.68, 3, game.rng);
      game.particles.burst(width * 0.7, height * 0.35, '#ff5d8f', 14, 180, 4);
      game.setState(STATES.PLAYING);
    } else {
      // The boss fight: the Sovereign mid-arena, minions around it, the
      // boss health bar up and the player low on hull for drama.
      game.waves.startWave(10);
      game.waves.queue = [];
      game.score = 48900;
      game.shards = 121;
      game.kills = 148;
      game.combo = 2;
      game.comboTimer = 30;
      game.runTime = 542;
      game.player.hull = 34;
      game.player.x = width * 0.3;
      game.player.y = height * 0.62;
      game.player.aimAngle = -0.5;
      game.player.orbs = 1;
      const boss = createEnemy('boss', width * 0.68, height * 0.38, game.waves.hpScale, game.rng);
      boss.spawnScale = 1;
      boss.hp = Math.round(boss.maxHp * 0.55);
      game.enemies.push(boss);
      for (const [kind, fx, fy] of [['wisp', 0.5, 0.25], ['dart', 0.78, 0.6]]) {
        const minion = createEnemy(kind, width * fx, height * fy, game.waves.hpScale, game.rng);
        minion.spawnScale = 1;
        game.enemies.push(minion);
      }
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2;
        game.projectiles.fireEnemyOrb(boss.x, boss.y, angle, 190 * scale, 12);
      }
      game.projectiles.firePlayerBolt(game.player.x + 40, game.player.y - 20, -0.5, 560 * scale, 12, 0);
      game.setState(STATES.PLAYING);
    }
    return;
  }

  if (shot === 'victory') {
    // A finished run: the victory screen with a strong final score.
    game.score = 62400;
    game.kills = 203;
    game.shards = 164;
    game.runTime = 618;
    game.waves.wave = 10;
    game.player.hull = 45;
    game.particles.burst(width * 0.5, height * 0.4, '#ffe066', 40, 260, 5);
    game.particles.burst(width * 0.3, height * 0.6, '#7df9ff', 30, 220, 4);
    game.finishRun(true);
  }
}
