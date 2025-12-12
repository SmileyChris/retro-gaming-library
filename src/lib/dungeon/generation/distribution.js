import { ZONES } from "./templates.js";

/**
 * Distributes games into zones based on their genres.
 * Implements the 70/30 algorithm from the PRD.
 * @param {Array} games - List of all games
 * @param {number} seed - Random seed
 */
export function distributeGamesToZones(games, seed = 12345) {
  const distribution = {};
  const unassigned = [];

  // Init buckets
  Object.values(ZONES).forEach((z) => (distribution[z.id] = []));

  // 1. Primary Assignment (Best Fit)
  games.forEach((game) => {
    let assigned = false;

    // Find best matching zone for game genres
    // We iterate specifically to prioritize certain mappings
    for (const [zoneKey, zoneDef] of Object.entries(ZONES)) {
      // Check if game shares ANY genre with zone
      const match = game.genres.some((g) => zoneDef.genres.includes(g));
      if (match) {
        // simple deterministic "random" using string hash of ID + seed
        // If hash % 10 < 7, we assign it (70% chance)
        if (simpleHash(game.id + seed) % 10 < 7) {
          distribution[zoneDef.id].push(game);
          assigned = true;
          break;
        }
      }
    }

    if (!assigned) {
      unassigned.push(game);
    }
  });

  // 2. Secondary Assignment (Spread remaining 30 + misfits)
  const zoneKeys = Object.keys(ZONES);
  unassigned.forEach((game, index) => {
    // Round robin distribution for now to ensure evenness
    // Or pseudo-random placement
    const targetZoneKey = zoneKeys[index % zoneKeys.length];
    const targetZoneId = ZONES[targetZoneKey].id;
    distribution[targetZoneId].push(game);
  });

  return distribution;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
