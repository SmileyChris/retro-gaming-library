/**
 * Puzzle Injector using Frontier Expansion
 * Ensures solvability by placing keys only in reachable areas.
 */
export function injectPuzzles(world, topology, difficulty = 1) {
  // 1. Initialize State
  const startParam = topology.startNode;
  const reachable = new Set([startParam]);
  const frontier = new Set();

  // Find initial frontier (exits from start)
  const startNode = topology.nodes.find((n) => n.id === startParam);
  // Using topology edges to find frontier
  topology.edges.forEach((e) => {
    if (e.from === startParam && !reachable.has(e.to)) {
      frontier.add(e);
    }
  });

  // 2. Loop until frontier empty (all rooms accessible)
  // We process 'edges' as the things we potential lock.
  const processedEdges = new Set();

  let keyCount = 0;

  while (frontier.size > 0) {
    // Pick random edge from frontier
    const edgesArray = Array.from(frontier);
    const edge = edgesArray[Math.floor(Math.random() * edgesArray.length)];
    frontier.delete(edge);
    processedEdges.add(edge);

    // If destination already reachable (via another path?), skip locking logic but check reachability
    if (reachable.has(edge.to)) continue;

    // Decision: Lock or Open?
    // Higher difficulty = higher chance, but limit total keys?
    const shouldLock =
      Math.random() < 0.3 * difficulty && keyCount < 3 * difficulty;

    if (shouldLock) {
      // LOCK IT
      const puzzle = createPuzzle(keyCount, difficulty);
      keyCount++;

      // 1. Apply Lock to Edge (in World/Topology?)
      // We need modification instructions for the Generator to apply later,
      // OR we modify a 'puzzles' map?
      // Let's modify the node's 'lock' property directly if we have room objects,
      // but here we have topology nodes.
      // We'll return a list of "Mutations" to apply to the world.

      // Place Key in Reachable Area
      const roomIds = Array.from(reachable);
      const keyRoomId = roomIds[Math.floor(Math.random() * roomIds.length)];

      // Apply !
      applyPuzzleToEdge(topology, edge, puzzle, keyRoomId);
    }

    // Add 'to' node to reachable
    reachable.add(edge.to);

    // Add new frontier edges
    topology.edges.forEach((e) => {
      if (
        e.from === edge.to &&
        !reachable.has(e.to) &&
        !processedEdges.has(e)
      ) {
        frontier.add(e);
      }
    });
  }
}

function createPuzzle(index, difficulty) {
  if (Math.random() < 0.3) {
    return PUZZLE_LIBRARY.FUNNY[
      Math.floor(Math.random() * PUZZLE_LIBRARY.FUNNY.length)
    ];
  }
  return {
    keyName: `Key Card ${index + 1}`,
    keyId: `key_gen_${index}`,
    lockMsg: `Security Level ${index + 1} Required.`,
  };
}

function applyPuzzleToEdge(topology, edge, puzzle, keyRoomId) {
  // We attach the puzzle data to the edge object itself in the topology
  // The generator will read this when converting topology -> world rooms
  edge.lock = {
    keyId: puzzle.keyId,
    msg: puzzle.lockMsg,
  };

  // Reverse edge too?
  const reverse = topology.edges.find(
    (e) => e.from === edge.to && e.to === edge.from
  );
  if (reverse) {
    reverse.lock = {
      keyId: puzzle.keyId,
      msg: puzzle.lockMsg,
    };
  }

  // Store Key Placement instruction
  // We attach it to the node
  const keyNode = topology.nodes.find((n) => n.id === keyRoomId);
  if (!keyNode.loot) keyNode.loot = [];

  keyNode.loot.push({
    id: puzzle.keyId,
    name: puzzle.keyName || puzzle.keyId,
    type: puzzle.type || "KEY",
    description: puzzle.keyDesc || "A generated key.",
    interactions: puzzle.interactions, // For funny items
    sensory: puzzle.sensory,
  });
}

const PUZZLE_LIBRARY = {
  FUNNY: [
    {
      keyId: "item_gum",
      keyName: "Chewing Gum",
      type: "TOOL",
      keyDesc: "A sticky wad of gum.",
      lockMsg: "The pipe is leaking! You need to plug it to cross.",
      // Logic: Use Gum on Pipe -> Walkable
      // This requires 'Environmental' lock simulation.
      // For now, simpler: "Leaking Pipe blocks way. Use Gum."
      sensory: { msg: "a sweet synthetic smell" },
    },
    {
      keyId: "item_coffee",
      keyName: "Hot Coffee",
      type: "TOOL",
      keyDesc: "Steaming hot espresso.",
      lockMsg: "A sleepy guard blocks the path. 'Zzz... coffee...'",
      sensory: { msg: "the rich aroma of roasted beans" },
    },
    {
      keyId: "item_magnet",
      keyName: "Big Magnet",
      type: "TOOL",
      keyDesc: "A cartoonishly large horseshoe magnet.",
      lockMsg: "A heavy metal grate blocks the vent.",
      // Implies lifting it?
    },
  ],
  TERMINALS: [
    {
      type: "LORE",
      keyDesc: "A specific cartridge metadata is required.",
      lockMsg: "TERMINAL LOCKED. ENTER RELEASE YEAR OF 'CHRONO TRIGGER'.",
      terminalId: "term_chrono",
      requiredGameId: "game_chrono", // Generator must ensure this game exists/is placed?
      // Or we pick a random game from the zone's list?
      // "Puzzle" object here describes the mechanism.
      // The Injector needs to bind it to a specific game.
      requiresGameBinding: true,
    },
  ],
  SCANNERS: [
    {
      type: "ITEM_SCAN",
      keyDesc: "A specific item must be scanned.",
      lockMsg: "SCANNER LOCKED. REQUIRED: 'ANCIENT ARTIFACT'.",
      scannerId: "scan_artifact",
      requiredItemId: "item_artifact", // Generator must ensure this item exists/is placed.
      requiresItemBinding: true,
    },
  ],
};
