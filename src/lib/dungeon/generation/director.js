/**
 * The Director decides the vibe and parameters of the world generation.
 */
// Topologies
export const TOPOLOGIES = {
  LINEAR: "linear", // A -> B -> C -> D
  BRANCHING: "branching", // A -> B, A -> C, B -> D
  HUB: "hub", // Center -> All
  GRID: "grid", // Grid mesh (complex)
};

export const DIRECTOR_MODES = {
  STANDARD: {
    name: "Standard Simulation",
    description: "A balanced experience of exploration and discovery.",
    lockChance: 0.3,
    npcDensity: 0.2, // 20% of rooms have an NPC
    packChance: 0.3,
    topology: TOPOLOGIES.BRANCHING,
  },
  HEIST: {
    name: "The Data Heist",
    description: "High security. Many locks. High rewards.",
    lockChance: 0.7,
    npcDensity: 0.1,
    packChance: 0.5, // Lots of loot bunched up
    topology: TOPOLOGIES.LINEAR, // Linear gauntlet
  },
  SOCIAL: {
    name: "The Gala",
    description: "The constructs are populated and chatty.",
    lockChance: 0.1,
    npcDensity: 0.6,
    packChance: 0.2,
    topology: TOPOLOGIES.HUB, // Easy access to everyone
  },
  CHAOS: {
    name: "Glitch Storm",
    description: "Entropy is increasing. Expect the unexpected.",
    lockChance: 0.1,
    npcDensity: 0.1,
    packChance: 0.1,
    chaos: true, // Random connections?
    topology: TOPOLOGIES.GRID, // Maze-like
  },
};

export function pickDirectorMode(seed) {
  // For now deterministic based on day? Or random.
  // Let's bias towards Standard for now unless specified.
  return DIRECTOR_MODES.STANDARD;
}
