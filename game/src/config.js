// Lumen Drift — central tuning. Every number that shapes how the game feels
// lives here so balance can be changed in one place. Distances are in logical
// pixels of a 960 x 600 arena; the game scales them to the real canvas size.

export const ARENA = {
  width: 960,
  height: 600,
  wall: 14, // keep the player this far inside the arena edge
};

export const WAVES_TOTAL = 10; // wave 10 is the boss; beating it wins the game

export const PLAYER = {
  radius: 13,
  speed: 250,
  maxHull: 100,
  fireInterval: 0.22, // seconds between shots
  bulletSpeed: 560,
  bulletDamage: 12,
  bulletRadius: 4,
  dashSpeed: 720,
  dashTime: 0.16, // seconds of dashing (invulnerable while dashing)
  dashCooldown: 1.6,
  magnetRadius: 90, // shards drift toward the player inside this radius
  contactDamage: 18, // hull lost when an enemy touches the player
};

export const COMBO = {
  window: 3.0, // seconds to chain a kill before the multiplier resets
  maxMultiplier: 8,
};

// Enemy archetypes. hp, speed and score scale with the wave (see waves.js).
export const ENEMIES = {
  wisp: {
    label: 'Wisp',
    radius: 14,
    speed: 95,
    hp: 22,
    score: 50,
    shards: 2,
    color: '#ff5d8f',
    behavior: 'chase',
  },
  dart: {
    label: 'Dart',
    radius: 11,
    speed: 150,
    hp: 14,
    score: 80,
    shards: 2,
    color: '#ffb03a',
    behavior: 'lunge',
    lungeRange: 210,
    lungeSpeed: 430,
    lungeWindup: 0.45,
    lungeCooldown: 1.4,
  },
  spitter: {
    label: 'Spitter',
    radius: 15,
    speed: 62,
    hp: 34,
    score: 120,
    shards: 3,
    color: '#b678ff',
    behavior: 'shoot',
    preferredRange: 300,
    shotInterval: 2.1,
    bulletSpeed: 210,
    bulletDamage: 10,
  },
  splitter: {
    label: 'Splitter',
    radius: 20,
    speed: 70,
    hp: 46,
    score: 140,
    shards: 3,
    color: '#3affc8',
    behavior: 'chase',
    splitInto: 'wisp',
    splitCount: 2,
  },
  boss: {
    label: 'Umbral Sovereign',
    radius: 46,
    speed: 55,
    hp: 900,
    score: 5000,
    shards: 30,
    color: '#ff2e63',
    behavior: 'boss',
    shotInterval: 1.5,
    bulletSpeed: 190,
    bulletDamage: 12,
    summonInterval: 9,
  },
};

export const PICKUPS = {
  shardScore: 10, // score per shard collected (before combo)
  repairAmount: 25,
  repairDropChance: 0.06, // chance an enemy drops a hull cell
  overchargeDuration: 8, // seconds of doubled fire rate
  overchargeDropChance: 0.05,
};

// The upgrade cards offered between waves. Each has an id, a name, a short
// description and the maximum number of times it can be taken.
export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Coils',
    desc: '+25% fire rate',
    max: 4,
    apply: (p) => { p.fireInterval *= 0.8; },
  },
  {
    id: 'twin',
    name: 'Twin Lance',
    desc: 'Fire a second parallel bolt',
    max: 2,
    apply: (p) => { p.shots += 1; },
  },
  {
    id: 'pierce',
    name: 'Piercing Rounds',
    desc: 'Bolts pass through +1 enemy',
    max: 3,
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'heavy',
    name: 'Heavy Bolts',
    desc: '+40% bolt damage',
    max: 4,
    apply: (p) => { p.bulletDamage = Math.round(p.bulletDamage * 1.4); },
  },
  {
    id: 'swift',
    name: 'Swift Hull',
    desc: '+15% move speed',
    max: 3,
    apply: (p) => { p.speed *= 1.15; },
  },
  {
    id: 'plating',
    name: 'Star Plating',
    desc: '+25 max hull and repair 25',
    max: 3,
    apply: (p) => { p.maxHull += 25; p.hull = Math.min(p.maxHull, p.hull + 25); },
  },
  {
    id: 'magnet',
    name: 'Magnet Coil',
    desc: 'Shards fly to you from much further',
    max: 2,
    apply: (p) => { p.magnetRadius *= 1.8; },
  },
  {
    id: 'dashcell',
    name: 'Dash Cell',
    desc: 'Dash recharges 40% faster',
    max: 2,
    apply: (p) => { p.dashCooldown *= 0.6; },
  },
  {
    id: 'nova',
    name: 'Nova Pulse',
    desc: 'A shockwave blasts nearby enemies every 6s',
    max: 3,
    apply: (p) => { p.novaLevel += 1; },
  },
  {
    id: 'orb',
    name: 'Guardian Orb',
    desc: 'An orbiting orb that fires at enemies',
    max: 2,
    apply: (p) => { p.orbs += 1; },
  },
];

export const PALETTE = {
  background: '#070a1a',
  nebulaA: '#1b0f3b',
  nebulaB: '#062a33',
  grid: 'rgba(90, 120, 255, 0.10)',
  player: '#7df9ff',
  playerCore: '#ffffff',
  shard: '#ffe066',
  repair: '#4dff88',
  overcharge: '#ff9f1c',
  text: '#e8f0ff',
  dimText: '#9fb2d8',
  danger: '#ff2e63',
};

export const AUDIO = {
  masterVolume: 0.5,
  musicVolume: 0.16,
};
