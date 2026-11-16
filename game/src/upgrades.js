// Upgrades: the choices that shape a run. Between waves the player picks one
// of three offered cards; each upgrade can be taken only up to its `max`
// times, and the offer never repeats a maxed-out upgrade.

import { UPGRADES } from './config.js';
import { pickDistinct } from './utils.js';

export class UpgradeDeck {
  constructor(rng) {
    this.rng = rng;
    this.taken = new Map(); // upgrade id -> times taken
  }

  timesTaken(id) {
    return this.taken.get(id) ?? 0;
  }

  // Offer up to three upgrades the player can still take.
  offer(count = 3) {
    const available = UPGRADES.filter((u) => this.timesTaken(u.id) < u.max);
    if (available.length === 0) return [];
    return pickDistinct(this.rng, available, count);
  }

  apply(upgrade, player) {
    this.taken.set(upgrade.id, this.timesTaken(upgrade.id) + 1);
    upgrade.apply(player);
  }

  reset() {
    this.taken.clear();
  }
}
