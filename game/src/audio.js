// Synthesized sound: every effect and the ambient music loop are built with
// the Web Audio API from oscillators and filtered noise, so the game ships no
// audio files at all. Audio starts only after the player's first gesture.

import { AUDIO } from './config.js';

const NOTE_FREQUENCIES = {
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
};

export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  // Create the AudioContext on a user gesture; safe to call repeatedly.
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : AUDIO.masterVolume;
    this.master.connect(this.context.destination);
    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = AUDIO.musicVolume;
    this.musicGain.connect(this.master);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : AUDIO.masterVolume, this.context.currentTime, 0.02);
    }
  }

  tone({ type = 'sine', from = 440, to = null, duration = 0.15, volume = 0.3, when = 0, destination = null }) {
    if (!this.context) return;
    const start = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(destination ?? this.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  noise({ duration = 0.2, volume = 0.3, filterFrom = 1200, filterTo = 200, when = 0 }) {
    if (!this.context) return;
    const start = this.context.currentTime + when;
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFrom, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterTo), start + duration);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
  }

  shoot() {
    this.tone({ type: 'square', from: 880, to: 520, duration: 0.07, volume: 0.08 });
  }

  enemyShoot() {
    this.tone({ type: 'sawtooth', from: 320, to: 180, duration: 0.12, volume: 0.06 });
  }

  hit() {
    this.noise({ duration: 0.06, volume: 0.12, filterFrom: 2400, filterTo: 900 });
  }

  explosion(big = false) {
    this.noise({ duration: big ? 0.5 : 0.25, volume: big ? 0.5 : 0.28, filterFrom: 900, filterTo: 60 });
    this.tone({ type: 'sine', from: big ? 160 : 220, to: 40, duration: big ? 0.45 : 0.22, volume: 0.35 });
  }

  pickup(comboStep = 0) {
    const base = 660 * Math.pow(1.059, Math.min(comboStep, 12));
    this.tone({ type: 'sine', from: base, to: base * 1.5, duration: 0.1, volume: 0.16 });
  }

  dash() {
    this.noise({ duration: 0.18, volume: 0.2, filterFrom: 400, filterTo: 3200 });
  }

  hurt() {
    this.tone({ type: 'sawtooth', from: 220, to: 60, duration: 0.25, volume: 0.35 });
    this.noise({ duration: 0.2, volume: 0.25, filterFrom: 800, filterTo: 100 });
  }

  heal() {
    this.tone({ type: 'sine', from: 520, to: 780, duration: 0.18, volume: 0.2 });
    this.tone({ type: 'sine', from: 780, to: 1040, duration: 0.18, volume: 0.15, when: 0.09 });
  }

  upgrade() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.tone({ type: 'triangle', from: freq, duration: 0.22, volume: 0.18, when: i * 0.07 });
    });
  }

  waveStart() {
    this.tone({ type: 'triangle', from: 196, to: 392, duration: 0.35, volume: 0.25 });
    this.tone({ type: 'triangle', from: 294, to: 588, duration: 0.35, volume: 0.18, when: 0.08 });
  }

  bossRoar() {
    this.tone({ type: 'sawtooth', from: 90, to: 45, duration: 0.9, volume: 0.4 });
    this.noise({ duration: 0.8, volume: 0.3, filterFrom: 300, filterTo: 60 });
  }

  nova() {
    this.tone({ type: 'sine', from: 120, to: 900, duration: 0.3, volume: 0.25 });
  }

  gameOver() {
    [392, 329.63, 261.63, 196].forEach((freq, i) => {
      this.tone({ type: 'triangle', from: freq, duration: 0.4, volume: 0.22, when: i * 0.22 });
    });
  }

  victory() {
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((freq, i) => {
      this.tone({ type: 'triangle', from: freq, duration: 0.3, volume: 0.22, when: i * 0.13 });
    });
  }

  // A slow, quiet arpeggio loop: two detuned triangle pads and a soft bass
  // note, stepped on a timer so it costs almost nothing.
  startMusic() {
    if (!this.context || this.musicTimer) return;
    const melody = ['C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'E4'];
    const bass = ['C4', 'C4', 'G4', 'A4'];
    this.musicStep = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.context || this.muted) return;
      const note = melody[this.musicStep % melody.length];
      this.tone({
        type: 'triangle',
        from: NOTE_FREQUENCIES[note],
        duration: 0.9,
        volume: 0.1,
        destination: this.musicGain,
      });
      if (this.musicStep % 2 === 0) {
        this.tone({
          type: 'sine',
          from: NOTE_FREQUENCIES[bass[(this.musicStep / 2) % bass.length]] / 2,
          duration: 1.6,
          volume: 0.14,
          destination: this.musicGain,
        });
      }
      this.musicStep += 1;
    }, 620);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
