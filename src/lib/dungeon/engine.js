import { dungeon, writeLog, clearLog } from "./store.svelte.js";
import { parseCommand } from "./parser.js";
import {
  generateDungeon,
  getConsoleForPlatform,
} from "./generation/generator.js";
import { saveGame, loadGame, clearSave } from "./persistence.js";
import { NPC_ROSTER } from "./content/npcs.js";
import { DUNGEON_GAMES } from "./content/games.js";
import { enterRealm, processRealmCommand } from "./realms/index.js";
import { handleUse } from "./commands/use.js";
import { handleTake } from "./commands/take.js";
import { handleOpen } from "./commands/open.js";
import { handleInventory } from "./commands/inventory.js";

// Init World
(async () => {
  // Try to load save first
  const loaded = await loadGame();
  if (!loaded) {
    initNewGame();
  } else {
    // Just show where we are
    setTimeout(() => handleLook(), 500);
  }
})();

function initNewGame(forceSeed = null) {
  clearLog();
  // Retrieve existing seed if soft reset, or genereate new if hard
  const seed = forceSeed || Date.now();

  const world = generateDungeon(seed);
  dungeon.world = world;
  dungeon.currentRoom = world.playerStart;
  dungeon.visited = new Set();
  dungeon.inventory = [];
  dungeon.relationships = {};
  dungeon.relationships = {};
  dungeon.quests = [];
  dungeon.flags = new Set();

  setTimeout(() => {
    writeLog(forceSeed ? "SYSTEM REBOOTED." : "UNIVERSE REGENERATED.", "info");
    handleLook();

    // Auto-Greet / Room Triggers
    checkRoomTriggers();

    saveGame();
  }, 100);
}

// Confirmation State
let pendingResetMode = null; // 'soft' or 'hard'

/**
 * Process a user input string
 * @param {string} input
 */
/**
 * Process a user input string
 * @param {string} input
 */
export async function handleInput(input) {
  writeLog(`> ${input}`, "command");

  // 1. Handle Reset Confirmation
  if (pendingResetMode) {
    if (["yes", "y", "confirm"].includes(input.toLowerCase())) {
      writeLog("Executing sequence...", "error");

      if (pendingResetMode === "hard") {
        await clearSave();
        initNewGame(null); // New Seed
      } else {
        // Soft Reset: Keep current seed
        const currentSeed = dungeon.world?.seed || Date.now();
        initNewGame(currentSeed);
      }
    } else {
      writeLog("Reset cancelled.", "info");
    }
    pendingResetMode = null;
    return;
  }

  // 2. Handle Active Realm
  if (dungeon.realm && dungeon.realm.active) {
    processRealmCommand(input);
    return;
  }

  const cmd = parseCommand(input);

  try {
    await executeCommand(cmd);
    // Auto-save after major actions (simple strategy: save after every command that isn't just 'help' or 'look')
    if (["TAKE", "DROP", "GO", "RESET", "OPEN"].includes(cmd.verb)) {
      saveGame();
    }
  } catch (e) {
    console.error(e);
    writeLog("CRITICAL ERROR: " + e.message, "error");
  }
}

function handleReset(cmd) {
  // Check if 'sudo' was used or target is 'hard'
  const isHard =
    cmd.target === "reset" || cmd.target === "hard" || cmd.target === "sudo";

  // Check if it's the CHEAT code
  if (cmd.target === "cheat") {
    handleCheat();
    return;
  }

  if (isHard) {
    writeLog(
      "WARNING: This will DESTROY the current universe and generate a new one.",
      "error"
    );
    writeLog("Are you sure? (type 'yes')", "info");
    pendingResetMode = "hard";
  } else {
    writeLog(
      "This will reset your position, inventory, and flags, but keep the world layout.",
      "info"
    );
    writeLog("To fully regenerate the world, use 'sudo reset'.", "dim");
    writeLog("Confirm respawn? (type 'yes')", "info");
    pendingResetMode = "soft";
  }
}

export async function executeCommand(cmd) {
  if (cmd.verb === "EMPTY") return;

  switch (cmd.verb) {
    case "LOOK":
      return handleLook(cmd.target, true); // Force full description on manual look
    case "GO":
      return handleGo(cmd.target);
    case "HELP":
      return handleHelp();
    case "CLEAR":
      clearLog();
      return;
    case "INVENTORY":
      return handleInventory();
    case "TAKE":
      return handleTake(cmd.target);
    case "DROP":
      return handleDrop(cmd.target);
    case "TALK":
      return handleTalk(cmd.target);
    case "RESET":
      return handleReset(cmd);
    case "OPEN":
      return handleOpen(cmd.target);
    case "JOURNAL":
      return handleJournal();
    case "DROP":
      return handleDrop(cmd.target);
    case "PLAY":
      return handlePlay(cmd.target);
    case "USE":
      return handleUse(cmd.target);
    default:
      writeLog(`Unknown command sequence: "${cmd.raw}"`, "error");
      return;
  }
}

function handleCheat() {
  writeLog("SUDO MODE ENGAGED. OVERRIDING REALITY...", "error");

  // 1. Give all Consoles
  const allPlatforms = [
    ...new Set(DUNGEON_GAMES.map((g) => g.platform).filter(Boolean)),
  ];

  let consolesAdded = 0;
  allPlatforms.forEach((p) => {
    const consoleItem = getConsoleForPlatform(p);
    // Check if we already have it
    if (!dungeon.inventory.some((i) => i.id === consoleItem.id)) {
      dungeon.inventory.push(consoleItem);
      consolesAdded++;
    }
  });

  // 2. Give all Games
  let gamesAdded = 0;
  DUNGEON_GAMES.forEach((g) => {
    // Check if we already have it
    if (!dungeon.inventory.some((i) => i.id === g.id)) {
      // We need to create the ITEM structure, not just the raw game object
      dungeon.inventory.push({
        id: g.id,
        name: g.name,
        type: "GAME",
        description: g.description,
        metadata: g,
      });
      gamesAdded++;
    }
  });

  writeLog(
    `Spawned ${consolesAdded} Consoles and ${gamesAdded} Cartridges.`,
    "success"
  );
  writeLog("Inventory limit ignored.", "dim");
}

function handleJournal() {
  writeLog("--- QUEST LOG ---", "info");

  if (!dungeon.quests || dungeon.quests.length === 0) {
    writeLog("No active data entries.");
    return;
  }

  // Group by Status
  const active = dungeon.quests.filter((q) => q.status === "active");
  const completed = dungeon.quests.filter((q) => q.status === "completed");

  if (active.length > 0) {
    writeLog("ACTIVE:", "response");
    active.forEach((q) => {
      // We need to look up the quest title from NPC roster or store it
      // Current architecture stores ID. We need a lookup.
      // Simplification: We'll store title in quest object when starting it (in handleTalk)
      // OR iterating all NPCs to find it (slow but accurate).
      // Let's iterate NPCs for now.

      const npc = NPC_ROSTER.find((n) => n.id === q.npcId);
      if (npc) {
        const qDef = npc.quests.find((def) => def.id === q.questId);
        if (qDef) {
          writeLog(`[!] ${qDef.title} (${npc.name})`);
          writeLog(`    "${qDef.startText.substring(0, 50)}..."`, "dim");
        }
      }
    });
  }

  if (completed.length > 0) {
    writeLog("ARCHIVED:", "dim");
    completed.forEach((q) => {
      const npc = NPC_ROSTER.find((n) => n.id === q.npcId);
      if (npc) {
        const qDef = npc.quests.find((def) => def.id === q.questId);
        if (qDef) {
          writeLog(`[✔] ${qDef.title}`, "dim");
        }
      }
    });
  }
}

function handleLook(target, forceFull = false) {
  const room = dungeon.world.rooms[dungeon.currentRoom];

  if (!target) {
    const isFirstVisit = !dungeon.visited.has(room.id);

    // Header always shows
    writeLog(`[ ${room.name} ]`, "info");

    if (forceFull || isFirstVisit) {
      writeLog(room.description);
      // No extra narrative hints needed as they are baked into description now.

      // Show items/NPCs
      listRoomContents(room);
    } else {
      // Short description logic
      const shortDesc = room.description.split(/[.!?]/)[0] + ".";

      // Narrative Hints (Short) - Keep these for brevity on return visits
      let dirHint = "";
      if (room.exits) {
        const dirs = Object.keys(room.exits);
        if (dirs.length > 0) {
          dirHint = ` [${dirs.map((d) => d[0].toUpperCase()).join("/")}]`;
        }
      }

      writeLog(shortDesc + dirHint, "info-dim");

      listRoomContents(room);
    }

    // Mark as visited logic
    if (isFirstVisit) dungeon.visited.add(room.id);
  } else {
    // Look at specific item (Delegated to EXAMINE logic usually, but we keep this for legacy 'look at x')
    handleExamine(target);

    // Check for side effects (onLook)
    // Note: handleExamine likely iterates inventory/room again.
    // Optimization: handleExamine should return the item, or we can check here.
    // For now, let's keep it simple and just do a quick find.
    const lower = target.toLowerCase();
    const item =
      dungeon.inventory.find((i) => i.name.toLowerCase().includes(lower)) ||
      room.items.find((i) => i.name.toLowerCase().includes(lower));

    if (item && item.onLook) {
      if (item.onLook.msg) writeLog(item.onLook.msg, "info");
      // Could add other triggers like 'trigger: (dungeon) => ...'
    }
  }
}

function listRoomContents(room) {
  // List NPCs (Narrative)
  if (room.npcs && room.npcs.length > 0) {
    room.npcs.forEach((npc) => {
      // Determine if Known
      const known =
        dungeon.relationships &&
        dungeon.relationships[npc.id] &&
        dungeon.relationships[npc.id].known;

      const baseName = known
        ? npc.name
        : npc.shortDescription
        ? npc.shortDescription
        : "someone";

      // Capitalize first letter
      const subject = baseName.charAt(0).toUpperCase() + baseName.slice(1);

      // Determine Action
      let action = "is observing you quietly";
      if (npc.ambient && npc.ambient.length > 0) {
        action = npc.ambient[Math.floor(Math.random() * npc.ambient.length)];
      }

      writeLog(`${subject} ${action}`, "response");
    });
  }

  // List Items (Narrative)
  if (room.items && room.items.length > 0) {
    room.items.forEach((item) => {
      if (item.type === "GAME") {
        if (item.requires && item.requires.tool === "tool_broom") {
          writeLog(
            `A game cartridge is sitting on a high shelf, out of reach.`,
            "response"
          );
        } else if (item.requires && item.requires.tool === "tool_token") {
          writeLog(
            `A game cartridge is locked inside a display cabinet.`,
            "response"
          );
        } else if (item.isDusty) {
          writeLog(
            `A cartridge is lying in the dust. It looks filthy.`,
            "response"
          );
        } else {
          const suffix = item.metadata?.platform
            ? ` (${item.metadata.platform})`
            : "";
          writeLog(
            `You spot a cartridge for ${item.name}${suffix}.`,
            "response"
          );
        }
      } else if (item.type === "KEY") {
        writeLog(`A ${item.name} is shining on the ground.`, "response");
      } else {
        writeLog(`There is a ${item.name} here.`, "response");
      }
    });
  }
}

function handleGo(target) {
  if (!target) {
    writeLog("Usage: go [direction]");
    return;
  }

  const room = dungeon.world.rooms[dungeon.currentRoom];
  // Simple alias matching for 'n', 'north', etc. logic is in parser mostly,
  // but target comes in as 'north'.

  const nextRoomId = room.exits[target.toLowerCase()];

  // INTERCEPT: Archivist Check - MOVED to Backpack check on 'UP' or Elevator usage
  // The original north block is removed to allow free exploration of the Atrium

  // Check for Lock
  if (room.locks && room.locks[target.toLowerCase()]) {
    const lock = room.locks[target.toLowerCase()];
    const hasKey = dungeon.inventory.some((i) => i.id === lock.keyId);

    if (hasKey) {
      // Find key name
      const keyItem = dungeon.inventory.find((i) => i.id === lock.keyId);

      // CHECK BACKPACK REQUIREMENT
      const hasBackpack = dungeon.inventory.some(
        (i) => i.id === "backpack_starter" || i.type === "PACK"
      );

      if (!hasBackpack && target.toLowerCase() === "up") {
        writeLog(
          "The elevator door opens, but you realize you have too many loose cartridges to carry to the next sector efficiently.",
          "error"
        );
        writeLog("You should speak to the Archivist about a container.", "dim");
        return;
      }

      writeLog(`*CLICK* The ${keyItem ? keyItem.name : "key"} turns!`, "info");
      // Remove lock permanently?
      // In a real DB we would updates state.
      // For now, let's just allow passage this one time or delete the lock property.
      delete room.locks[target.toLowerCase()];
      // We should also unlock the other side for consistency, but that requires finding the nextRoom object first.
      // It's fine, we can verify next time too.
    } else {
      writeLog(lock.msg, "error");
      return; // STOP
    }
  }

  if (nextRoomId) {
    dungeon.currentRoom = nextRoomId;
    handleLook(null, false); // Auto-look (short if visited)

    // Check for NPC triggers (auto-talk)
    checkRoomTriggers();
  } else {
    writeLog(`You cannot go '${target}' from here.`);
  }
}

function handleExamine(target) {
  if (!target) {
    writeLog("Examine what?");
    return;
  }

  const room = dungeon.world.rooms[dungeon.currentRoom];

  // Check Inventory First, then Room
  let item = dungeon.inventory.find((i) =>
    i.name.toLowerCase().includes(target.toLowerCase())
  );

  if (!item) {
    item = room.items.find((i) =>
      i.name.toLowerCase().includes(target.toLowerCase())
    );
  }

  if (!item) {
    writeLog(`You don't see '${target}' here.`);
    return;
  }

  // Render Detail
  writeLog(`[ ${item.name} ]`, "info");
  writeLog(item.description);

  if (item.type === "GAME") {
    if (item.metadata) {
      if (item.metadata.genres)
        writeLog(`Genre: ${item.metadata.genres.join(", ")}`, "dim");
      if (item.metadata.notes) writeLog(`Notes: ${item.metadata.notes}`, "dim");
    }
    writeLog("Type 'play' to launch this cartridge.", "info-dim");
  }

  if (item.type === "PACK") {
    writeLog("It appears to be sealed. You could OPEN it to see the contents.");
    if (item.contents) {
      writeLog(`It feels heavy with ${item.contents.length} cartridges.`);
    }
  }

  if (item.type === "CONSOLE") {
    writeLog(`System Status: ONLINE`);
    writeLog(`Loaded Games: ${item.games ? item.games.length : 0}`);
    if (item.games && item.games.length > 0) {
      writeLog("LIBRARY:", "info");
      item.games.forEach((g) => writeLog(`- ${g.name}`));
    } else {
      writeLog("Memory Empty.", "dim");
    }
  }
}

function handleDrop(target) {
  if (!target) {
    writeLog("Drop what?");
    return;
  }

  const itemIndex = dungeon.inventory.findIndex((i) =>
    i.name.toLowerCase().includes(target.toLowerCase())
  );

  if (itemIndex > -1) {
    const item = dungeon.inventory[itemIndex];
    // Move item
    dungeon.inventory.splice(itemIndex, 1);

    const room = dungeon.world.rooms[dungeon.currentRoom];
    room.items.push(item);

    writeLog(`You drop the ${item.name}.`);
  } else {
    writeLog(`You aren't carrying a '${target}'.`);
  }
}

function handleTalk(target) {
  const room = dungeon.world.rooms[dungeon.currentRoom];

  // Auto-target if only one NPC
  if (!target) {
    if (room.npcs && room.npcs.length === 1) {
      target = room.npcs[0].name; // Use full name for matching
    } else {
      writeLog("Talk to whom?");
      return;
    }
  }

  if (!room.npcs || room.npcs.length === 0) {
    writeLog("There is no one here to talk to.");
    return;
  }

  // Clean target (remove "to " prefix)
  let search = target.toLowerCase();
  if (search.startsWith("to ")) search = search.substring(3).trim();

  // Fuzzy match NPC
  const npc = room.npcs.find((n) => {
    // 1. Name Match
    if (n.name.toLowerCase().includes(search)) return true;

    // 2. Alias Match (Partial)
    if (n.aliases.some((a) => a.toLowerCase().includes(search))) return true;

    // 3. Short Description Match
    if (n.shortDescription && n.shortDescription.toLowerCase().includes(search))
      return true;

    return false;
  });

  if (npc) {
    writeLog(`[ ${npc.name} ]`, "info");

    // SPECIAL EVENTS (Archivist Backpack)
    if (npc.id === "archivist") {
      const hasKey = dungeon.inventory.find((i) => i.id === "key_level_1");
      const hasBackpack = dungeon.inventory.find(
        (i) => i.id === "backpack_starter"
      );

      // If we have Key (quest done) but no pack
      if (hasKey && !hasBackpack) {
        writeLog(`"I see you have the elevator key," says the Archivist.`);
        writeLog(
          `"But you cannot travel the zones with your hands full. Take this."`,
          "info"
        );

        const pack = {
          id: "backpack_starter",
          name: "Infinite Backpack",
          type: "PACK",
          description: "It's bigger on the inside.",
          contents: [],
        };
        dungeon.inventory.push(pack);
        writeLog(`The Archivist gives you an ${pack.name}.`, "success");
        return;
      }
    }

    // 1. Initialize Relationship
    if (!dungeon.relationships) dungeon.relationships = {};
    if (!dungeon.relationships[npc.id]) {
      dungeon.relationships[npc.id] = { trust: 0, known: true };
    }
    const rel = dungeon.relationships[npc.id];

    // 2. Check Active Quests (Completion)
    // Is there a quest we are tracking for this NPC?
    if (!dungeon.quests) dungeon.quests = [];
    const activeQuestIdx = dungeon.quests.findIndex(
      (q) => q.npcId === npc.id && q.status === "active"
    );

    if (activeQuestIdx > -1) {
      const questMeta = dungeon.quests[activeQuestIdx];
      const questDef = npc.quests.find((q) => q.id === questMeta.questId);

      if (questDef) {
        // Check Condition
        const item = questDef.condition(dungeon.inventory);
        if (item) {
          // COMPLETE QUEST
          writeLog(`"${questDef.endText}"`, "response");
          dungeon.quests[activeQuestIdx].status = "completed";
          rel.trust += 10;

          // Reward
          if (questDef.reward) {
            if (questDef.reward.type === "KEY") {
              // Spawn key
              const key = {
                id: "skeleton_key",
                name: "Skeleton Key",
                type: "KEY",
                description: "Opens any generic lock.",
              };
              dungeon.inventory.push(key);
              writeLog(`${npc.name} gives you a ${key.name}.`, "info");
            }
          }

          // Consume Item? Usually yes for fetch quests.
          const idx = dungeon.inventory.indexOf(item);
          dungeon.inventory.splice(idx, 1);
          writeLog(`You handed over ${item.name}.`, "dim");

          return;
        } else {
          writeLog(`"Don't forget, I need that item we talked about."`);
          return;
        }
      }
    }

    // 3. Check New Quests
    if (npc.quests) {
      const availableQuest = npc.quests.find((q) => {
        // Check if not already started/completed
        const status = dungeon.quests.find((uq) => uq.questId === q.id);
        if (status) return false;
        return rel.trust >= q.req.trust;
      });

      if (availableQuest) {
        writeLog(`"${availableQuest.startText}"`, "response");
        writeLog(`[QUEST STARTED: ${availableQuest.title}]`, "info");
        dungeon.quests.push({
          questId: availableQuest.id,
          npcId: npc.id,
          status: "active",
        });
        return;
      }
    }

    // Archivist Special Logic
    if (npc.id === "archivist") {
      if (!dungeon.world.flags) dungeon.world.flags = {};

      // Stage 1: Intro (Met)
      if (!dungeon.world.flags.archivistMet) {
        dungeon.world.flags.archivistMet = true;
        writeLog(`"Welcome to the constructs, user. I am the Archivist."`);
        writeLog(
          `"The data in this sector is fragmenting. We are losing history every cycle."`,
          "dim"
        );
        writeLog(
          `"If you are here to help preserve our digital heritage, speak to me again."`
        );
        return;
      }

      // Stage 2: Gear + Quest Assignment
      if (!dungeon.world.flags.receivedStarterGear) {
        dungeon.world.flags.receivedStarterGear = true;
        writeLog(`"Excellent. You will need the proper equipment."`);
        writeLog(
          `"Take this backpack. It looks simple, but it can hold a surprising amount of data."`
        );

        const backpackItem = {
          id: "backpack_starter",
          name: "Traveler's Backpack",
          type: "DECK",
          description: "A sturdy canvas bag. It looks bigger on the inside.",
          games: [],
        };
        dungeon.inventory.push(backpackItem);
        writeLog(`The Archivist hands you a ${backpackItem.name}.`, "response");

        // Assign First Quest
        writeLog(
          `"Now, prove your worth. Proceed deeper into the Arcade and retrieve 5 Generic Game Cartridges."`
        );
        dungeon.world.flags.starterQuestActive = true;

        // Add to formal quest log
        dungeon.quests.push({
          questId: "archivist_starter",
          npcId: "archivist",
          status: "active",
        });

        // We'll rely on the existing journal lookup which fetches title from NPC_ROSTER
        // So we need to ensure the Archivist has this quest defined in NPC_ROSTER or handle it manually here.
        // Problem: Archivist doesn't have a 'quests' array in NPC_ROSTER matching "archivist_starter" yet.
        // It's cleaner to just log it here and maybe update handleJournal to handle this special one,
        // OR add a dummy quest definition to NPC_ROSTER?
        // Let's create a special entry in Journal for this since it's hardcoded logic.

        writeLog(`[QUEST STARTED: The Preservationist]`, "info");
        return;
      }

      // Stage 3: Quest Check
      if (
        dungeon.world.flags.starterQuestActive &&
        !dungeon.world.flags.starterQuestComplete
      ) {
        // Check quest status for Journal Logic is messy if not using standard system.
        // Let's standardise it. I will update NPC_ROSTER in a separate step or just mock it here?
        // No, I can't edit NPC_ROSTER in this call easily.
        // I will manually handle this Quest in handleJournal IF it's active.

        const gameCount = dungeon.inventory.filter(
          (i) => i.type === "GAME" && !i.metadata.gem
        ).length;

        if (gameCount >= 5) {
          writeLog(
            `"Splendid! You have successfully salvaged these artifacts."`
          );
          writeLog(
            `"Keep them safe. You may need them to access other realms."`
          );
          writeLog(`[QUEST COMPLETE: The Preservationist]`, "success");
          dungeon.world.flags.starterQuestComplete = true;

          // Mark journal as complete
          const qIdx = dungeon.quests.findIndex(
            (q) => q.questId === "archivist_starter"
          );
          if (qIdx > -1) dungeon.quests[qIdx].status = "completed";

          // Reward? Maybe a key?
          writeLog(
            `"Here is a key to the upper levels. The Corruption spreads there as well."`
          );
          const key = {
            id: "key_level_1",
            name: "Level 2 Pass", // Level 1 is Arcade, Level 2 is next
            type: "KEY",
            description: "Access card for the upper floors.",
          };
          dungeon.inventory.push(key);
          writeLog(`Received: ${key.name}`, "info");
        } else {
          writeLog(
            `"You only have ${gameCount} cartridges. I need 5 to verify your aptitude."`
          );
          writeLog(`"Search the rooms to the North."`, "dim");
        }
        return;
      }
    }

    // Pick random default line
    const lines = npc.dialogue.default;
    const line = lines[Math.floor(Math.random() * lines.length)];
    writeLog(`"${line}"`);
  } else {
    writeLog(`You don't see '${target}' here.`);
  }
}

function handleHelp() {
  writeLog("AVAILABLE COMMANDS:", "info");
  writeLog("- LOOK: Scan area");
  writeLog("- GO [N/S/E/W]: Navigate");
  writeLog("- TAKE [item]: Pick up object");
  writeLog("- DROP [item]: Drop object");
  writeLog("- INVENTORY (or I): Check pockets");
  writeLog("- TALK [npc]: Chat with host");
  writeLog("- EXAMINE [game]: Read details");
  writeLog("- USE [item]: Interact with object");
  writeLog("- PLAY [game]: Enter the game world");
}

function handlePlay(target) {
  if (!target) {
    writeLog(
      "Play what? You probably need to put a cartridge in a console first."
    );
    return;
  }

  // 1. Check Inventory (Backpack) for Game
  const game = dungeon.inventory.find(
    (g) =>
      g.type === "GAME" && g.name.toLowerCase().includes(target.toLowerCase())
  );

  if (game) {
    // We have the game. Do we have the console?
    const platform = game.metadata?.platform?.toLowerCase();
    const consoleItem = dungeon.inventory.find(
      (inv) =>
        inv.type === "CONSOLE" &&
        inv.supported &&
        inv.supported.some((s) => platform.includes(s))
    );

    if (consoleItem) {
      writeLog(`You insert ${game.name} into the ${consoleItem.name}...`);
      const success = enterRealm(game.id);
      if (!success) {
        writeLog(
          "The screen remains black. (Realm not implemented for this ID)."
        );
      }
      return;
    } else {
      writeLog(`You have the cartridge, but no console to play it on.`);
      writeLog(`Requires: ${game.metadata.platform}`, "dim");
      return;
    }
  }

  // 2. Legacy Check (Inside Console Item storage - deprecated but kept for safety)
  const consoleItem = dungeon.inventory.find(
    (i) =>
      i.type === "CONSOLE" &&
      i.games &&
      i.games.some((g) => g.name.toLowerCase().includes(target.toLowerCase()))
  );

  if (consoleItem) {
    const game = consoleItem.games.find((g) =>
      g.name.toLowerCase().includes(target.toLowerCase())
    );
    // Trigger Realm Entry
    writeLog(`Running ${game.name} from ${consoleItem.name} memory...`);
    const success = enterRealm(game.id);
    if (!success) {
      writeLog(
        "The game boots up, but nothing happens. (Realm not implemented for this ID yet)."
      );
    }
    return;
  }

  // 2. Loose Cartridge Check (Inventory/Room) - usually can't play without console, but maybe "Play Console" is the command
  // Let's assume user types "Play Sonic 2"

  writeLog("You need to load that game into a compatible console first.");
}

function checkRoomTriggers() {
  const room = dungeon.world.rooms[dungeon.currentRoom];
  if (room.npcs) {
    room.npcs.forEach((npc) => {
      // Logic from NPCs.js 'trigger' property
      if (npc.trigger && typeof npc.trigger === "function") {
        if (npc.trigger(dungeon)) {
          setTimeout(() => handleTalk(npc.name || npc.id), 500);
        }
      }
    });
  }
}
