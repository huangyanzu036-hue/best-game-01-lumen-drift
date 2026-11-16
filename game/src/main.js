// Boot and DOM wiring: builds the UI hooks the game talks to (HUD, title,
// upgrade cards, pause, game over and victory screens), then starts the game
// and stages a screenshot scene when the URL asks for one.

import { Game, STATES } from './game.js';
import { readShotParams, stageShot } from './shots.js';
import { formatScore } from './utils.js';

function element(id) {
  return document.getElementById(id);
}

function buildUi() {
  const screens = {
    title: element('screen-title'),
    upgrade: element('screen-upgrade'),
    paused: element('screen-paused'),
    gameover: element('screen-gameover'),
    victory: element('screen-victory'),
  };
  const hud = element('hud');
  const banner = element('wave-banner');

  function showOnly(name) {
    for (const [key, screen] of Object.entries(screens)) {
      screen.classList.toggle('hidden', key !== name);
    }
    // The HUD belongs to play; title and end screens carry their own numbers.
    hud.classList.toggle('hidden', name === 'title' || name === 'gameover' || name === 'victory');
  }

  return {
    showTitle(highScore) {
      element('title-high-score').textContent = highScore > 0
        ? `Best score: ${formatScore(highScore)}`
        : 'No runs yet — be the first to light the forge.';
      showOnly('title');
    },

    showState(state, snapshot) {
      if (state === STATES.TITLE) {
        this.showTitle(snapshot.highScore);
      } else if (state === STATES.PLAYING) {
        showOnly(null);
      } else if (state === STATES.UPGRADE) {
        showOnly('upgrade');
      } else if (state === STATES.PAUSED) {
        showOnly('paused');
      } else if (state === STATES.GAMEOVER) {
        element('final-score-lost').textContent = formatScore(snapshot.score);
        element('final-wave-lost').textContent = `Wave ${snapshot.wave} of ${snapshot.wavesTotal}`;
        element('final-kills-lost').textContent = `${snapshot.kills} enemies down · ${snapshot.runTime}`;
        element('new-record-lost').classList.toggle('hidden', !snapshot.isNewHighScore);
        showOnly('gameover');
      } else if (state === STATES.VICTORY) {
        element('final-score-won').textContent = formatScore(snapshot.score);
        element('final-kills-won').textContent = `${snapshot.kills} enemies down · ${snapshot.runTime}`;
        element('final-shards-won').textContent = `${snapshot.shards} shards gathered`;
        element('new-record-won').classList.toggle('hidden', !snapshot.isNewHighScore);
        showOnly('victory');
      }
    },

    updateHud(snapshot) {
      element('hud-score').textContent = formatScore(snapshot.score);
      element('hud-wave').textContent = `Wave ${snapshot.wave}/${snapshot.wavesTotal}`;
      element('hud-shards').textContent = String(snapshot.shards);
      element('hud-hull-fill').style.width = `${(snapshot.hull / snapshot.maxHull) * 100}%`;
      element('hud-hull-text').textContent = `${snapshot.hull} / ${snapshot.maxHull}`;
      element('hud-hull-fill').classList.toggle('low', snapshot.hull / snapshot.maxHull < 0.3);
      element('hud-combo').textContent = snapshot.combo > 1 ? `x${snapshot.combo}` : '';
      element('hud-combo').classList.toggle('hidden', snapshot.combo <= 1);
      element('hud-dash-fill').style.width = `${snapshot.dashFraction * 100}%`;
      element('hud-dash').classList.toggle('ready', snapshot.dashReady);
      element('hud-overcharge').classList.toggle('hidden', !snapshot.overcharged);
      const bossBar = element('hud-boss');
      if (snapshot.boss) {
        bossBar.classList.remove('hidden');
        element('hud-boss-fill').style.width = `${(snapshot.boss.hp / snapshot.boss.maxHp) * 100}%`;
        element('hud-boss-name').textContent = snapshot.boss.label;
      } else {
        bossBar.classList.add('hidden');
      }
    },

    showUpgrades(upgrades) {
      const container = element('upgrade-cards');
      container.innerHTML = '';
      for (const upgrade of upgrades) {
        const card = document.createElement('button');
        card.className = 'upgrade-card';
        card.type = 'button';
        card.innerHTML = `<span class="upgrade-name">${upgrade.name}</span><span class="upgrade-desc">${upgrade.desc}</span>`;
        card.addEventListener('click', () => window.__lumenGame.chooseUpgrade(upgrade));
        container.appendChild(card);
      }
    },

    showWaveBanner(text) {
      banner.textContent = text;
      banner.classList.remove('hidden');
      banner.classList.remove('banner-pop');
      void banner.offsetWidth; // restart the pop animation
      banner.classList.add('banner-pop');
    },

    hideWaveBanner() {
      banner.classList.add('hidden');
    },

    setMuted(muted) {
      element('mute-button').textContent = muted ? '🔇 Sound off' : '🔊 Sound on';
    },
  };
}

function main() {
  const canvas = element('game-canvas');
  const ui = buildUi();
  const game = new Game(canvas, ui);
  window.__lumenGame = game;

  element('start-button').addEventListener('click', () => game.startRun());
  element('resume-button').addEventListener('click', () => game.resume());
  element('restart-button').addEventListener('click', () => game.startRun());
  element('play-again-button').addEventListener('click', () => game.startRun());
  element('quit-to-title-button').addEventListener('click', () => game.setState(STATES.TITLE));
  element('mute-button').addEventListener('click', () => {
    game.sound.ensure();
    game.sound.setMuted(!game.sound.muted);
    ui.setMuted(game.sound.muted);
  });
  element('pause-button').addEventListener('click', () => game.pause());

  game.start();

  const { shot, seed } = readShotParams();
  if (shot) {
    // Let the first frame lay out, then stage the scene.
    requestAnimationFrame(() => stageShot(game, shot, seed));
  }
}

main();
