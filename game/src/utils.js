// Small math and random helpers shared by every system. The game uses a
// seeded generator (mulberry32) so screenshot staging can replay the same
// layout, while normal play seeds from the clock.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Move from (x, y) toward (tx, ty) by at most `step` pixels.
export function moveToward(x, y, tx, ty, step) {
  const dx = tx - x;
  const dy = ty - y;
  const d = Math.hypot(dx, dy);
  if (d <= step || d === 0) return { x: tx, y: ty };
  return { x: x + (dx / d) * step, y: y + (dy / d) * step };
}

export function randomIn(rng, min, max) {
  return min + rng() * (max - min);
}

export function randomInt(rng, min, max) {
  return Math.floor(randomIn(rng, min, max + 1));
}

export function pickRandom(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

// Pick `count` distinct items from an array (shuffled copy, first `count`).
export function pickDistinct(rng, array, count) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatScore(score) {
  return score.toLocaleString('en-US');
}
