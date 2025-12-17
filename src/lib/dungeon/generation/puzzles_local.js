/**
 * Injects local, room-contained puzzles.
 * These do NOT block the main path (topology handles that),
 * but act as side content or localized blockers for loot.
 */

export function injectLocalPuzzles(world) {
  Object.values(world.rooms).forEach((room) => {
    // Simple random chance for puzzle per room
    // Avoid puzzle if room already has complex stuff (Bosses, etc)?
    // Let's just do it for 10% of rooms in "Puzzle Palace" or general zones

    // Skip Start Gate
    if (room.id === "start_gate") return;

    const rand = Math.random();

    // Prioritize Puzzle Zone?
    const isPuzzleZone = room.zoneId === "PALACE";
    const chance = isPuzzleZone ? 0.4 : 0.05;

    if (rand < chance) {
      const type = Math.random() > 0.5 ? "SOKOBAN" : "RIDDLE";
      if (type === "SOKOBAN") injectSokoban(room);
      else injectRiddle(room);
    }
  });
}

function injectSokoban(room) {
  if (room.items.length > 0) return; // Only empty rooms for now to avoid clutter

  // Check exits to determine target
  const exits = Object.keys(room.exits);
  if (exits.length === 0) return;

  const targetDir = exits[0]; // Pick first exit to block
  const targetRoomId = room.exits[targetDir];

  // Add Crate Item
  room.items.push({
    id: `crate_${room.id}`,
    name: "Heavy Crate",
    type: "OBSTACLE",
    description: "A heavy wooden crate. It looks pushable.",
    interactions: {
      push: {
        msg: `You shove the crate ${targetDir.toUpperCase()}. It slides onto a pressure plate!`,
        onPush: (system, r, item) => {
          // Check if already solved?
          if (r.flags && r.flags["sokoban_solved"]) return;

          system.writeLog("CLICK! A secret compartment opens.", "success");

          // Spawn Reward
          // Or unlock the door if we actually locked it?
          // Let's make it a reward puzzle for now to avoid breaking topology reachability.
          // The plan says "Localized blockers for loot".

          if (!r.flags) r.flags = {};
          r.flags["sokoban_solved"] = true;

          r.items.push({
            id: `gem_${r.id}`,
            name: "Puzzle Gem",
            type: "TREASURE",
            description: "A shiny gem revealed by moving the crate.",
            value: 50,
          });

          // Update crate desc
          item.description = "A heavy crate sitting on a pressure plate.";
        },
      },
    },
  });

  room.description +=
    " A large crate sits in the center of the room. There are scratch marks on the floor.";
}

function injectRiddle(room) {
  const RIDDLES = [
    {
      q: "I have keys but no locks. I have a space but no room. You can enter, but never go outside. What am I?",
      a: "keyboard",
    },
    {
      q: "I am not alive, but I grow; I have no lungs, but I need air; I have no mouth, but water kills me. What am I?",
      a: "fire",
    },
    {
      q: "What comes once in a minute, twice in a moment, but never in a thousand years?",
      a: "m",
    },
  ];

  const riddle = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];

  room.puzzle = {
    type: "RIDDLE",
    question: riddle.q,
    answer: riddle.a,
    successMsg: "The Sphynx statue nods. 'Correct.' A treasure materializes.",
    rewardType: "SPAWN_ITEM",
  };

  room.description +=
    " A small statue of a Sphynx sits on a pedestal. It seems to be waiting for you to SAY something.";

  // Add logic to spawn item on success?
  // handleSay.js handles the successMsg.
  // We update handleSay to handle generic rewards or define it in room.puzzle logic.
  // My handleSay implementation had `rewardType === 'UNLOCK'`.
  // I should update handleSay to be more flexible or just handle it here in a callback?
  // But data can't easily have callbacks if serialized (not an issue here yet).
  // Let's stick to simple types for now and update handleSay to support 'SPAWN_ITEM'.
}
