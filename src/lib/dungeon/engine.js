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
  dungeon.quests = [];

  setTimeout(() => {
    writeLog(forceSeed ? "SYSTEM REBOOTED." : "UNIVERSE REGENERATED.", "info");
    handleLook();
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

async function executeCommand(cmd) {
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
        const suffix = item.metadata?.platform
          ? ` (${item.metadata.platform})`
          : "";
        writeLog(`You spot a cartridge for ${item.name}${suffix}.`, "response");
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
  } else {
    writeLog(`You cannot go '${target}' from here.`);
  }
}

function handleInventory() {
  if (dungeon.inventory.length === 0) {
    writeLog("Your pockets are empty.", "info");
  } else {
    writeLog("YOU ARE CARRYING:", "info");

    const games = dungeon.inventory.filter((i) => i.type === "GAME");
    const others = dungeon.inventory.filter((i) => i.type !== "GAME");

    others.forEach((item) => {
      writeLog(`- ${item.name}`);
    });

    if (games.length > 0) {
      const hasBackpack = dungeon.inventory.some(
        (i) =>
          i.id === "backpack_starter" ||
          i.name.toLowerCase().includes("backpack")
      );
      const containerName = hasBackpack ? "Backpack" : "Bundle";
      writeLog(`- [${games.length} Cartridges in ${containerName}]`, "dim");
      writeLog(`  (Type 'use backpack' to view list)`, "dim");
    }
  }
}

function handleTake(target) {
  if (!target) {
    writeLog("Take what?");
    return;
  }

  const room = dungeon.world.rooms[dungeon.currentRoom];
  const lowerTarget = target.toLowerCase();

  // BULK TAKE LOGIC
  let itemsToTake = [];

  if (lowerTarget === "all" || lowerTarget === "everything") {
    itemsToTake = [...room.items];
  } else if (lowerTarget === "games" || lowerTarget === "all games") {
    itemsToTake = room.items.filter((i) => i.type === "GAME");
  } else if (lowerTarget.endsWith(" games")) {
    // e.g. "snes games"
    const query = lowerTarget.replace(" games", "").trim();
    itemsToTake = room.items.filter(
      (i) =>
        i.type === "GAME" &&
        !i.requires && // Cannot bulk take puzzle items
        (i.metadata?.platform?.toLowerCase().includes(query) ||
          i.name.toLowerCase().includes(query))
    );
  }

  // Execute Bulk Take if matched
  if (itemsToTake.length > 0) {
    let count = 0;
    // iterating backwards or using filter to avoid index issues if we splice one by one
    // Actually simpler: remove them from room.items in one go, add to inventory

    const newRoomItems = room.items.filter((i) => !itemsToTake.includes(i));
    // Verify bag exists? (Assuming yes if they are here)
    const hasBackpack =
      dungeon.world.flags && dungeon.world.flags.receivedStarterGear;

    itemsToTake.forEach((item) => {
      dungeon.inventory.push(item);

      if (item.type === "GAME") {
        if (hasBackpack) {
          writeLog(`You stash ${item.name} in your backpack.`);
        } else {
          // Should be unreachable if north is blocked, but fallback
          writeLog(`You take ${item.name}.`);
        }
      } else {
        writeLog(`You take the ${item.name}.`);
      }

      if (item.metadata && item.metadata.gem) {
        writeLog("It sparkles with a hidden energy!", "info");
      }
      count++;
    });

    room.items = newRoomItems; // Update room
    if (count > 0) writeLog(`Collected ${count} items.`, "info-dim");
    return;
  }

  // SINGULAR TAKE LOGIC (Fallthrough)
  const itemIndex = room.items.findIndex((i) =>
    i.name.toLowerCase().includes(lowerTarget)
  );

  if (itemIndex > -1) {
    const item = room.items[itemIndex];

    // GAMIFICATION: Game Pickup Logic
    if (item.type === "GAME") {
      // Check Puzzle Requirement
      if (item.requires) {
        writeLog(item.requires.msg, "error");
        return;
      }

      // Just take it into inventory (Backpack)
      room.items.splice(itemIndex, 1);
      dungeon.inventory.push(item);

      const platform = item.metadata?.platform || "Unknown";
      writeLog(`You stash the ${item.name} (${platform}) in your backpack.`);

      // Hint if console exists
      const hasConsole = dungeon.inventory.find(
        (inv) =>
          inv.type === "CONSOLE" &&
          inv.supported &&
          inv.supported.some((s) => platform.toLowerCase().includes(s))
      );

      if (hasConsole) {
        writeLog(`(Compatible with your ${hasConsole.name})`, "dim");
      } else {
        writeLog("(You need a compatible console to play this.)", "dim");
      }
      return;
    }

    // Normal Take for Non-Games (Keys, Consoles, Packs)
    room.items.splice(itemIndex, 1);
    dungeon.inventory.push(item);

    writeLog(`You take the ${item.name}.`);
    // Slight gamification
    if (item.metadata?.gem) {
      writeLog("It sparkles with a hidden energy!", "info");
    }
  } else {
    // If we tried specific parsing earlier and failed, we end up here.
    if (lowerTarget.includes(" games")) {
      writeLog(`You don't see any matching games here.`);
    } else {
      writeLog(`You don't see a '${target}' here.`);
    }
  }
}
function handleUse(target) {
  if (!target) {
    writeLog("Use what?");
    return;
  }

  // PARSE: "use [item] on [target]" or just "use [item]"
  // Simple heuristic: "use broom" -> find item requiring broom.

  const toolName = target.toLowerCase().replace("use ", "").trim();

  // 1. Check Player Inventory for Tool
  const tool = dungeon.inventory.find((i) =>
    i.name.toLowerCase().includes(toolName)
  );
  const room = dungeon.world.rooms[dungeon.currentRoom];

  if (tool) {
    // We have the tool. Check room for puzzle requirements matching this tool.
    const puzzleItem = room.items.find(
      (i) => i.requires && i.requires.tool === tool.id
    );

    if (puzzleItem) {
      writeLog(`You use the ${tool.name}...`);
      writeLog("Success!", "success");

      // Resolve Puzzle
      delete puzzleItem.requires;
      // Optionally update description?
      // puzzleItem.description = puzzleItem.description.replace(...)

      if (tool.id === "tool_broom") {
        writeLog(
          "You knock the cartridge off the high shelf. It clatters to the floor."
        );
      } else if (tool.id === "tool_token") {
        writeLog("You insert the token. The cabinet unlocks with a click.");
        // Consume token
        const idx = dungeon.inventory.indexOf(tool);
        dungeon.inventory.splice(idx, 1);
      }
      return;
    } else {
      writeLog(`You can't find a use for the ${tool.name} here.`);
      return;
    }
  }

  // 2. Check if user is trying to "use/open" the puzzle source directly?
  // e.g. "use cabinet" -> "You need a token."
  // But our items are the games themselves effectively.
  // Legacy Backpack logic
  if (["backpack", "pack", "bag"].includes(toolName)) {
    // ... exisiting backpack logic ...
    // We can just call handleOpen for backpack specifically
    return handleOpen("backpack");
  }

  writeLog(`You don't have a '${target}'.`);
}

function handleOpen(target) {
  if (!target) {
    writeLog("Open what?");
    return;
  }

  // Alias Open Backpack -> Use Backpack logic (which we routed weirdly, let's keep simple)
  if (["backpack", "pack", "bag"].includes(target.toLowerCase())) {
    // Copied/Refactored Backpack Logic from previous handleOpen
    const item =
      dungeon.inventory.find((i) => i.id === "backpack_starter") ||
      dungeon.inventory.find((i) => i.type === "PACK");

    if (!item) {
      writeLog("You don't have a backpack.");
      return;
    }
    writeLog(`You check your ${item.name}...`);
    if (item.contents && item.contents.length > 0) {
      writeLog("A collection of cartridges spills out!", "info");
      const room = dungeon.world.rooms[dungeon.currentRoom];
      item.contents.forEach((game) => {
        room.items.push(game);
        writeLog(`- ${game.name}`);
      });
      // Empty bag? Or keep bag?
      // Previous logic destroyed bag if it was a "PACK" item type found in dungeon.
      // "backpack_starter" is permanent.
      if (item.id !== "backpack_starter") {
        const idx = dungeon.inventory.indexOf(item);
        dungeon.inventory.splice(idx, 1);
      } else {
        item.contents = []; // Clear contents
      }
    } else {
      writeLog("It's empty.");
    }
    return;
  }

  // ... (Standard Open Logic) ...
  const room = dungeon.world.rooms[dungeon.currentRoom];
  // Check if opening a locked game display?
  // We don't have a separate container object for these puzzles, the 'game' item is the interaction point.
  // So if they type "open game", it might be weird.
  // If they type "open cabinet", we don't have a cabinet item.
  // This is a limitation of not having scenery items.
  // For now, assume they interact via "take [game]" or "use [tool]".

  writeLog(`You can't open that.`);
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

function handleUse(target) {
  if (!target) {
    writeLog("Use what?");
    return;
  }

  // Handle "Backpack" check implicitly via Inventory
  // Check for "backpack <number>" or just "backpack"
  // Target might be "backpack 2" or "pocket 2"
  let page = 1;
  let isBackpack = false;

  if (
    target.toLowerCase().startsWith("backpack") ||
    target.toLowerCase().startsWith("pack") ||
    target.toLowerCase().startsWith("bag")
  ) {
    isBackpack = true;
    const parts = target.split(" ");
    if (parts[1] && !isNaN(parts[1])) page = parseInt(parts[1]);
  } else if (target.toLowerCase().startsWith("pocket")) {
    isBackpack = true;
    const parts = target.split(" ");
    if (parts[1] && !isNaN(parts[1])) page = parseInt(parts[1]);
  }

  if (isBackpack) {
    writeLog(`[ BACKPACK ] - STORAGE INTERFACE`, "info");

    const games = dungeon.inventory.filter((i) => i.type === "GAME");
    const pageSize = 15;
    const totalPages = Math.ceil(games.length / pageSize);

    // Clamp page
    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;

    if (games.length === 0) {
      writeLog("No cartridges found.", "dim");
    } else {
      writeLog(`Capacity: ${games.length} Cartridges detected.`);

      if (totalPages > 1) {
        writeLog(`Viewing Pocket ${page}/${totalPages}`, "info-dim");
      }

      writeLog("----------------------------------------", "dim");

      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const slice = games.slice(start, end);

      slice.forEach((game) => {
        const platform = game.metadata?.platform || "Unknown";
        // Shorten platform for display
        let pShort = platform.split(" ")[0].substring(0, 8);
        if (platform.includes("Nintendo Entertainment")) pShort = "NES";
        if (platform.includes("Super")) pShort = "SNES";
        if (platform.includes("Genesis")) pShort = "GEN";
        if (platform.includes("Boy")) pShort = "GB";

        writeLog(`[${pShort.padEnd(5)}] ${game.name}`);
      });
      writeLog("----------------------------------------", "dim");

      if (page < totalPages) {
        writeLog(
          `(Type 'use backpack ${page + 1}' to check next pocket)`,
          "dim"
        );
      }
    }

    // Also show other items? Only on page 1
    if (page === 1) {
      const others = dungeon.inventory.filter((i) => i.type !== "GAME");
      if (others.length > 0) {
        writeLog(
          `\nSide Pockets: ${others.map((i) => i.name).join(", ")}`,
          "dim"
        );
      }
    }
    return;
  }

  // Check specific item usage (e.g. opening a specific pack item)
  const item = dungeon.inventory.find((i) =>
    i.name.toLowerCase().includes(target.toLowerCase())
  );

  if (!item) {
    writeLog(`You aren't carrying a '${target}'.`);
    return;
  }

  if (item.type === "PACK" || item.type === "DECK") {
    // Legacy support for DECK type if existing
    // ... existing pack opening logic ...
    writeLog(`You unzip the ${item.name}...`);
    // ...
    // Reuse existing logic below but adapted
  }

  if (item.type === "PACK") {
    // Re-implementing the existing logic fully to be safe since I replaced the block
    writeLog(`You tear open the ${item.name}...`);

    if (item.contents && item.contents.length > 0) {
      writeLog("A collection of cartridges spills out!", "info");
      const room = dungeon.world.rooms[dungeon.currentRoom];

      item.contents.forEach((game) => {
        room.items.push(game);
        writeLog(`- ${game.name}`);
      });

      // Destroy the pack
      const idx = dungeon.inventory.indexOf(item);
      dungeon.inventory.splice(idx, 1);
    } else {
      writeLog("It was empty...");
    }
    return;
  }

  // CONSOLE INTERFACE
  if (item.type === "CONSOLE") {
    writeLog(`[ ${item.name.toUpperCase()} ] - SYSTEM MENU`, "info");
    writeLog("Scanning backpack modules...", "dim");

    const compatibleGames = dungeon.inventory.filter(
      (g) =>
        g.type === "GAME" &&
        item.supported &&
        item.supported.some((s) =>
          g.metadata?.platform?.toLowerCase().includes(s)
        )
    );

    if (compatibleGames.length === 0) {
      writeLog("No compatible database records found.", "error");
      return;
    }

    writeLog("SELECT TITLE TO LAUNCH:", "info");
    compatibleGames.forEach((g) => {
      writeLog(`> ${g.name}`);
    });
    writeLog("\n(Type 'play [name]' to start)", "dim");
    return;
  }

  writeLog(`You fiddle with the ${item.name}, but nothing happens.`);
}
