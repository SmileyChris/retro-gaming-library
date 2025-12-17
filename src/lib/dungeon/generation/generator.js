import { ZONES } from "./templates.js";
import { distributeGamesToZones } from "./distribution.js";
import { validateConnectivity } from "./validator.js";
import { DUNGEON_GAMES } from "../content/games.js";
import { NPC_ROSTER } from "../content/npcs.js";
import { pickDirectorMode } from "./director.js";
import { generateZoneTopology } from "./topology.js";
import { injectPuzzles } from "./puzzles.js";
import { populateContent } from "./populator.js";

export function generateDungeon(seed = Date.now()) {
  console.log("Generating Dungeon with seed (Pipeline):", seed);

  // 1. Director Setup
  const mode = pickDirectorMode(seed);
  console.log(`Director Mode: ${mode.name}`);

  // 2. Distribute Content
  const zoneContents = distributeGamesToZones(DUNGEON_GAMES, seed);
  const zoneList = Object.values(ZONES);

  // 3. Initialize World
  const world = {
    seed,
    mode: mode.name,
    rooms: {},
    playerStart: "start_gate", // Will link to first hub
  };

  // 4. Create Start Gate
  const startRoom = {
    id: "start_gate",
    name: "The Grand Entrance",
    zoneId: "START",
    description: "You stand before the towering gates of the Retro Library.",
    exits: {},
    items: [],
  };
  world.rooms[startRoom.id] = startRoom;

  let previousHubId = "start_gate";

  // 5. Generate Each Zone
  zoneList.forEach((zone, i) => {
    let games = zoneContents[zone.id] || [];

    // A. Topology
    // Tutorial Zone (Arcade) uses clearer structure?
    const algo = i === 0 ? "HUB" : "VINE"; // Alternating?
    // Size proportional to games?
    const size = Math.max(5, Math.ceil(games.length / 2));

    const topology = generateZoneTopology(algo, size);

    // Fix IDs to be unique per zone
    const originalStart = topology.startNode;
    topology.nodes.forEach((n) => {
      if (n.id === originalStart) {
        n.id = `hub_${zone.id.toLowerCase()}`;
      } else {
        n.id = `${zone.id.toLowerCase()}_${n.id}`;
      }
    });
    topology.edges.forEach((e) => {
      e.from =
        e.from === originalStart
          ? `hub_${zone.id.toLowerCase()}`
          : `${zone.id.toLowerCase()}_${e.from}`;
      e.to =
        e.to === originalStart
          ? `hub_${zone.id.toLowerCase()}`
          : `${zone.id.toLowerCase()}_${e.to}`;
    });
    topology.startNode = `hub_${zone.id.toLowerCase()}`;

    // B. Puzzles
    const difficulty = i + 1;
    injectPuzzles(world, topology, difficulty);

    // C. Populate
    populateContent(world, topology, zone, games, mode);

    // D. Connect to Previous Zone (Vertical Stacking)
    const currentHub = world.rooms[topology.startNode];
    const previousRoom = world.rooms[previousHubId];

    // Connect UP/DOWN
    // Lock check for zone transition
    let lockConfig = null;
    if (i > 0) {
      // No lock on start gate -> Arcade
      lockConfig = {
        keyId: `key_level_${i}`,
        msg: `Level ${i + 1} Access Required.`,
      };
      // Give key in previous zone?
      // Previous Logic: "Archivist gives Level 1 Key".
      // We can put key in previous zone's loot.
      // Or in starting inventory for tutorial?
      // Let's stick to placing it in the previous hub for now.
      previousRoom.items.push({
        id: `key_level_${i}`,
        name: `Level ${i + 1} Pass`,
        type: "KEY",
      });
    }

    connectRooms(world, previousRoom, currentHub, "north", "south", lockConfig);
    // Using North/South for "Vertical" metaphor in flat map,
    // or actually use "up"/"down"?
    // User liked "up"/"down".
    if (i > 0) {
      // Re-link using up/down
      delete previousRoom.exits.north;
      delete currentHub.exits.south;
      connectRooms(world, previousRoom, currentHub, "up", "down", lockConfig);
    }

    previousHubId = currentHub.id;
  });

  // 6. Spawn NPCs (Simple)
  NPC_ROSTER.forEach((npc) => {
    // Find a room in target zone
    const rooms = Object.values(world.rooms).filter(
      (r) => r.zoneId === npc.zoneId
    );
    if (rooms.length > 0) {
      // Prefer Start Node/Hub?
      const hub = rooms.find((r) => r.id.includes("node_0")); // node_0 is always start
      const target = hub || rooms[0];
      if (!target.npcs) target.npcs = [];
      target.npcs.push(npc);
    }
  });

  // 7. Validate
  const isValid = validateConnectivity(world);
  console.log("Dungeon Connectivity Valid:", isValid);

  return world;
}

// Obsolete code removed.

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
