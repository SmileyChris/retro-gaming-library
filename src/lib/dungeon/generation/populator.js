import { DUNGEON_GAMES } from "../content/games.js";

export function populateContent(world, topology, zone, games, mode) {
  // 1. Create Room Objects
  topology.nodes.forEach((node) => {
    // Map node.id to world.rooms[node.id]
    const room = createRoom(
      node.id,
      zone,
      `${zone.name} Sector ${node.id.split("_")[1]}`
    );

    // Inject Pre-Calculated Loot (Keys from Puzzle Phase)
    if (node.loot) {
      room.items.push(...node.loot);
    }

    world.rooms[room.id] = room;
  });

  // 2. Connect Rooms (Apply Edges & Locks)
  topology.edges.forEach((edge) => {
    const roomA = world.rooms[edge.from];
    const roomB = world.rooms[edge.to];

    if (roomA && roomB) {
      roomA.exits[edge.dir] = roomB.id;

      // Apply Lock if present
      if (edge.lock) {
        if (!roomA.locks) roomA.locks = {};
        roomA.locks[edge.dir] = edge.lock;
      }
    }
  });

  // 3. Distribute Content
  const rooms = Object.values(world.rooms).filter((r) => r.zoneId === zone.id);

  // 3a. Distribute Consoles
  const platforms = [...new Set(games.map((g) => g.platform).filter(Boolean))];

  platforms.forEach((p) => {
    const consoleItem = getConsoleForPlatform(p);
    if (consoleItem) {
      const idx = Math.floor(Math.random() * rooms.length);
      rooms[idx].items.push(consoleItem);
      rooms[idx].description += " A blinking console sits on a pedestal.";
    }
  });

  // 3b. Distribute Games
  games.forEach((game) => {
    const idx = Math.floor(Math.random() * rooms.length);
    const targetRoom = rooms[idx];
    targetRoom.items.push(createGameItem(game));
  });

  // 4. Flavor & Lore
  rooms.forEach((room) => {
    room.description = getRandomFlavor(zone);

    // Dynamic Description based on Exits
    const exits = Object.keys(room.exits);
    if (exits.length > 0) {
      room.description += ` Exits: ${exits.join(", ")}.`;
    }
  });

  // 5. Sensory Pass (Smells, Sounds)
  generateSensoryHints(world, rooms);

  // 6. Narrative Pass (Threats & Lore)
  applyNarrativeFlavor(world, rooms);
}

function applyNarrativeFlavor(world, rooms) {
  if (!world.narrative) return;
  const { threat } = world.narrative;

  rooms.forEach((room) => {
    // 20% Chance to be corrupted/influenced by the Threat
    if (Math.random() < 0.2) {
      const flavors = Object.values(threat.flavor);
      const flavor = flavors[Math.floor(Math.random() * flavors.length)];
      room.description += ` ${flavor}`;
    }
  });
}

function generateSensoryHints(world, rooms) {
  rooms.forEach((room) => {
    // Check neighbors for "Loud" or "Smelly" items
    Object.entries(room.exits).forEach(([dir, neighborId]) => {
      const neighbor = world.rooms[neighborId];
      if (!neighbor) return;

      // Check neighbor items
      neighbor.items.forEach((item) => {
        if (item.sensory) {
          const hint = `You catch ${
            item.sensory.msg
          } coming from the ${dir.toUpperCase()}.`;
          room.description += " " + hint;
        }
      });

      // Check neighbor specific features (e.g. if it's a Hub, maybe it hums?)
      if (neighbor.id.includes("hub")) {
        room.description += ` You hear a distant hum from the ${dir.toUpperCase()}.`;
      }
    });
  });
}

function createRoom(id, zone, name) {
  return {
    id,
    name,
    zoneId: zone.id,
    description: "A procedurally generated room.",
    exits: {},
    items: [],
  };
}

function createGameItem(g) {
  return {
    id: g.id,
    name: g.name,
    type: "GAME",
    description: g.notes || "A classic game cartridge.",
    metadata: g,
  };
}

function getRandomFlavor(zone) {
  if (!zone.flavor) return "A quiet room.";
  return zone.flavor[Math.floor(Math.random() * zone.flavor.length)];
}

export function getConsoleForPlatform(platform) {
  if (!platform) return null;
  const p = platform.toLowerCase();

  if (p.includes("nintendo entertainment") || p === "nes") {
    return {
      id: "console_nes",
      name: "NES Classic",
      type: "CONSOLE",
      supported: ["nes", "nintendo entertainment system"],
      games: [],
    };
  }
  if (p.includes("super") || p === "snes") {
    return {
      id: "console_snes",
      name: "Super Famicom",
      type: "CONSOLE",
      supported: ["snes", "super nintendo"],
      games: [],
    };
  }
  if (p.includes("advance") || p === "gba") {
    return {
      id: "console_gba",
      name: "Game Boy Advance",
      type: "CONSOLE",
      supported: ["gba", "game boy advance"],
      games: [],
    };
  }
  if (p.includes("genesis") || p.includes("mega")) {
    return {
      id: "console_genesis",
      name: "Sega Genesis",
      type: "CONSOLE",
      supported: ["genesis", "megadrive"],
      games: [],
    };
  }

  // Fallback generic
  return {
    id: "console_generic",
    name: "Universal Emulator",
    type: "CONSOLE",
    supported: [p],
    games: [],
  };
}
