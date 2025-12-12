import { ZONES, ROOM_TEMPLATES } from "./templates.js";
import { distributeGamesToZones } from "./distribution.js";
import { validateConnectivity } from "./validator.js";
import { DUNGEON_GAMES } from "../content/games.js";
import { NPC_ROSTER } from "../content/npcs.js";
import { pickDirectorMode } from "./director.js";
import { applyTopology } from "./topology.js";

export function generateDungeon(seed = Date.now()) {
  console.log("Generating Dungeon with seed:", seed);

  // 1. Director Setup
  const mode = pickDirectorMode(seed);
  console.log(`Director Mode: ${mode.name}`);

  // 2. Distribute Content
  const zoneContents = distributeGamesToZones(DUNGEON_GAMES, seed);
  const zones = Object.values(ZONES);

  // 3. Initialize World
  const world = {
    seed,
    mode: mode.name,
    rooms: {},
    playerStart: "start_gate",
  };

  // 4. Create Start Room
  const startRoom = createRoom(
    "start_gate",
    ZONES.ARCADE_ATRIUM,
    "The Grand Entrance"
  );
  startRoom.description =
    "You stand before the towering gates of the Retro Library. The hum of a thousand consoles beckons you. You can hear someone muttering about 'data rot' to the NORTH.";
  world.rooms[startRoom.id] = startRoom;

  // 5. Generate Zone Clusters (Vertical Tower Structure)
  const clusters = [];

  // START (Level 0) -> ARCADE (Level 1) -> OTHERS (Level 2+)

  let previousHub = startRoom;

  zones.forEach((zone, i) => {
    let games = zoneContents[zone.id] || [];

    // CUSTOM LOGIC: Arcade Atrium (Level 1)
    // "So have the arcade atrium as a small area with some simple puzzles to get these first 5 carts."
    // "ensure one of teh first 5 carts is a realm game"
    if (i === 0) {
      // 1. Find Realm Game
      const realmGame = DUNGEON_GAMES.find((g) => g.dungeonProps?.hasRealm);

      // 2. Find Gem Game (for Retro Rob's quest in Zone 2)
      const gemGame = games.find(
        (g) => g.gem && g.id !== (realmGame ? realmGame.id : null)
      );

      // 3. Filter others
      let candidates = games.filter(
        (g) =>
          g.id !== (realmGame ? realmGame.id : null) &&
          g.id !== (gemGame ? gemGame.id : null)
      );

      const selected = [];
      if (realmGame) selected.push(realmGame);
      if (gemGame) selected.push(gemGame);

      // Fill rest to 5
      while (selected.length < 5 && candidates.length > 0) {
        selected.push(candidates.shift()); // Deterministic enough given input order
      }

      games = selected;
    }

    // Director Logic Per Floor could go here
    // For now, we apply global mode, but in future, 'mode' could be recalculated per floor.

    const hub = generateZoneCluster(world, zone, games, i, mode);
    clusters.push(hub);

    // Connect Vertical "Elevator" / Stairs
    if (i === 0) {
      // First zone (Arcade) connects to Start Gate
      connectRooms(world, startRoom, hub, "north", "south");
    } else {
      // Successive zones stack UP
      // Previous Hub (UP) -> Current Hub
      // Current Hub (DOWN) -> Previous HUB

      let lockConfig = null;
      if (Math.random() < mode.lockChance) {
        const keyId = `key_level_${i}`;
        const keyName = `Level ${i + 1} Pass`;
        const keyItem = {
          id: keyId,
          name: keyName,
          type: "KEY",
          description: `Access card for the ${zone.name} floor.`,
          metadata: { gem: true },
        };
        // Place key in previous floor logic...
        // Simple: Place in previous hub for now
        previousHub.items.push(keyItem);

        lockConfig = { keyId, msg: `Elevator Locked. Insert '${keyName}'.` };
      }

      connectRooms(world, previousHub, hub, "up", "down", lockConfig);
    }

    // Apply topology ONLY within the floor (horizontal expansion)
    // We modify applyTopology to take a single cluster and expand it,
    // rather than connecting multiple clusters together.
    // Wait, applyTopology currently connects clusters *to each other*.
    // We need to change that paradigm.
    // ACTUALLY: generateZoneCluster ALREADY creates the internal room structure (linear strip).
    // specific 'topology' logic usually implies how rooms *within* a zone connect.
    // Let's rely on generateZoneCluster for internal structure for now,
    // and just stack the HUBS vertically.

    previousHub = hub;
  });

  // 6. Internal Topology (Refining the strips into graphs)
  // iterate all clusters and potentially scramble their internal connections?
  // Current generateZoneCluster makes a straight line.
  // Let's leave as is for this step: Vertical Hubs, Horizontal Strips.

  // 7. Spawn NPCs
  NPC_ROSTER.forEach((npc) => {
    const targetZone = zones.find((z) => z.id === npc.zoneId);
    if (targetZone) {
      const hubId = `hub_${targetZone.id.toLowerCase()}`;
      const room = world.rooms[hubId];
      if (room) {
        if (!room.npcs) room.npcs = [];
        room.npcs.push({ ...npc });
      }
    }
  });

  // 8. Bake Rich Descriptions (Dynamic directions)
  bakeDescriptions(world);

  const isValid = validateConnectivity(world);
  console.log("Dungeon Connectivity Valid:", isValid);

  return world;
}

export function getConsoleForPlatform(platform) {
  // Map raw platform strings to Console Items
  // Examples in data: 'Nintendo Entertainment System', 'Super Nintendo', 'Game Boy Advance'
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

function generateZoneCluster(world, zone, games, uniqueOffset, mode) {
  const hubId = `hub_${zone.id.toLowerCase()}`;

  // Create Hub
  const hub = createRoom(hubId, zone, `${zone.name} Hub`);
  hub.description = getRandomFlavor(zone) + " " + (zone.flavor[0] || "");
  world.rooms[hubId] = hub;

  // CONSOLE SPAWING PLAN
  // Find unique platforms in this zone's games
  const platforms = [...new Set(games.map((g) => g.platform).filter(Boolean))];

  // CUSTOM LEVEL 1 LOGIC (Arcade Atrium)
  // "star" topology: Hub -> North, East, West rooms. No Consoles.
  if (zone.id === "ARCADE") {
    // 1. Setup Rooms
    const directions = [
      { dir: "north", return: "south", name: "Main Gallery" },
      { dir: "east", return: "west", name: "Side Arcade" },
      { dir: "west", return: "east", name: "Maintenance Alley" },
    ];

    // Create room objects first
    const roomMap = {};
    directions.forEach((d) => {
      const roomId = `room_${zone.id.toLowerCase()}_${d.dir}`;
      const room = createRoom(roomId, zone, d.name);

      if (d.dir === "north")
        room.description =
          "Rows of cabinets stretch out. You notice a high shelf above the machines.";
      if (d.dir === "east")
        room.description =
          "A dimly lit corner. One cabinet has a 'Privilege Mode' lock on the coin slot.";
      if (d.dir === "west")
        room.description =
          "Piles of spare parts and loose wires line the walls. It's a mess.";

      connectRooms(world, hub, room, d.dir, d.return);
      world.rooms[roomId] = room;
      roomMap[d.dir] = room;
    });

    // 2. Distribute Games with Puzzles
    // Need 5 games: 3 Easy, 1 High Shelf (North), 1 Locked (East)
    // Tools: Broom (West), Token (West)

    // A. Place Tools
    const broom = {
      id: "tool_broom",
      name: "Broom",
      type: "TOOL",
      description: "A long-handled broom with stiff bristles.",
    };
    roomMap["west"].items.push(broom);

    const token = {
      id: "tool_token",
      name: "Arcade Token",
      type: "TOOL",
      description: "A heavy golden token with a star stamped on it.",
      metadata: { gem: true }, // Make it sparkle slightly
    };
    roomMap["west"].items.push(token);

    // B. Place Games
    // Game 1 (High Shelf) -> North
    if (games.length > 0) {
      const g = games.shift();
      const item = createGameItem(g);
      item.requires = {
        tool: "tool_broom",
        msg: "It's too high to reach. You need something long to knock it down.",
      };
      item.description += " It's perched precariously on a high shelf.";
      roomMap["north"].items.push(item);
    }

    // Game 2 (Locked Cabinet) -> East
    if (games.length > 0) {
      const g = games.shift();
      const item = createGameItem(g);
      item.requires = {
        tool: "tool_token",
        msg: "It's locked inside the cabinet glass. The coin slot is blinking.",
      };
      item.description += " It's locked inside a display case.";
      roomMap["east"].items.push(item);
    }

    // Game 3, 4, 5 (Easy) -> Distributed
    const locs = ["north", "east", "west"];
    let idx = 0;
    while (games.length > 0) {
      const g = games.shift();
      const item = createGameItem(g);
      roomMap[locs[idx % 3]].items.push(item);
      idx++;
    }

    return hub;
  }

  // STANDARD LOGIC
  const roomCount = Math.ceil(games.length / 5) || 1;

  // Decide which console goes in Hub (Primary one for the zone?)
  if (platforms.length > 0) {
    const p = platforms.shift();
    const consoleItem = getConsoleForPlatform(p);
    if (consoleItem) hub.items.push(consoleItem);
  }

  let previousRoom = hub;

  // Create sub-rooms
  for (let i = 0; i < roomCount; i++) {
    const chunk = games.slice(i * 5, (i + 1) * 5);
    if (chunk.length === 0) continue;

    const roomId = `room_${zone.id.toLowerCase()}_${i}`;

    // Naming variation
    const suffix = i === roomCount - 1 ? "Archive" : "Gallery";
    const roomName = `${zone.name} ${suffix} ${i + 1}`;

    const room = createRoom(roomId, zone, roomName);

    // Distribute remaining consoles
    if (platforms.length > 0) {
      // Place one console per room if available
      const p = platforms.shift();
      const consoleItem = getConsoleForPlatform(p);
      if (consoleItem) {
        room.items.push(consoleItem);
        room.description += " A blinking console sits on a pedestal.";
      }
    }

    const usePack = Math.random() < mode.packChance;

    if (usePack && chunk.length > 2) {
      const packItem = {
        id: `pack_${roomId}`,
        name: "Sealed " + (zone.genres[0] || "Retro") + " Bundle",
        type: "PACK",
        description: "A bundle of games from the " + zone.name + ".",
        contents: chunk.map((g) => createGameItem(g)),
      };
      room.items.push(packItem);
    } else {
      chunk
        .map((g) => createGameItem(g))
        .forEach((item) => room.items.push(item));
    }

    world.rooms[roomId] = room;

    connectRooms(world, previousRoom, room, "north", "south");
    previousRoom = room;
  }

  // Dump any remaining platforms in the final room if we ran out of space
  while (platforms.length > 0) {
    const p = platforms.shift();
    const consoleItem = getConsoleForPlatform(p);
    if (
      consoleItem &&
      !previousRoom.items.some((i) => i.id === consoleItem.id)
    ) {
      // Avoid dupe in same room
      previousRoom.items.push(consoleItem);
    }
  }

  return hub;
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

function createRoom(id, zone, name) {
  return {
    id,
    name,
    zoneId: zone.id,
    description: getRandomFlavor(zone),
    exits: {},
    items: [],
  };
}

function connectRooms(world, roomA, roomB, dirA, dirB, lockConfig = null) {
  if (!roomA || !roomB) return;

  roomA.exits[dirA] = roomB.id;
  roomB.exits[dirB] = roomA.id;

  if (lockConfig) {
    if (!roomA.locks) roomA.locks = {};
    if (!roomB.locks) roomB.locks = {};

    roomA.locks[dirA] = lockConfig;
    roomB.locks[dirB] = lockConfig;
  }
}

function getRandomFlavor(zone) {
  const list = zone.flavor;
  return list[Math.floor(Math.random() * list.length)];
}

function bakeDescriptions(world) {
  Object.values(world.rooms).forEach((room) => {
    // Skip Start Gate as it has custom description
    if (room.id === "start_gate") return;

    const exits = Object.keys(room.exits);
    let directionText = "";

    if (exits.length > 0) {
      if (exits.includes("north") && exits.includes("south")) {
        directionText =
          " The path stretches endlessly to the NORTH, while the safety of the previous area lies SOUTH.";
      } else if (exits.includes("north")) {
        directionText = " A corridor extends further NORTH into the maze.";
      } else if (exits.includes("south")) {
        directionText = " The only way out is back SOUTH.";
      } else if (exits.includes("up") || exits.includes("down")) {
        directionText =
          " An elevator shaft connects this level to others vertically.";
      } else {
        const dirStr = exits.join(" and ");
        directionText = ` Passages lead ${dirStr}.`;
      }
    }

    // Ensure flavor doesn't repeat if it was just random selection
    // Actually, let's regenerate flavor to be sure or just append?
    // Current createRoom picks one random flavor.
    // Let's mix it up to be longer as requested.
    const zone = Object.values(ZONES).find((z) => z.id === room.zoneId);
    if (zone) {
      const f1 = getRandomFlavor(zone);
      let f2 = getRandomFlavor(zone);
      while (f1 === f2 && zone.flavor.length > 1) {
        f2 = getRandomFlavor(zone);
      }

      // Combined simple description
      room.description = `${f1} ${f2}${directionText}`;
    }
  });
}
