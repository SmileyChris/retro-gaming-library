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
import { processActions } from "./actions.js";

// Init World if running on client (not in test)
if (typeof window !== "undefined") {
  (async () => {
    const loaded = await loadGame();
    if (!loaded) {
      initNewGame();
    } else {
      setTimeout(() => handleLook(), 500);
    }
  })();
}

export function initNewGame(forceSeed = null, system = null) {
  const d = system ? system.dungeon : dungeon;
  const log = system ? system.writeLog : writeLog;
  const clear = system ? system.clearLog : clearLog;

  if (clear) clear();

  const seed = forceSeed || Date.now();

  const world = generateDungeon(seed);
  d.world = world;
  d.currentRoom = world.playerStart;
  d.visited = new Set();
  d.inventory = [];
  d.relationships = {};
  d.quests = [];
  d.flags = new Set();

  setTimeout(() => {
    log(forceSeed ? "SYSTEM REBOOTED." : "UNIVERSE REGENERATED.", "info");
    if (system) {
      handleLook(null, false, system);
    } else {
      handleLook();
    }

    checkRoomTriggers(system);

    if (!system) saveGame();
  }, 100);
}

let pendingResetMode = null;

export async function handleInput(input, injectedSystem = null) {
  const system = injectedSystem || {
    dungeon,
    writeLog,
    executeCommand,
    clearLog,
  };

  system.writeLog(`> ${input}`, "command");

  if (pendingResetMode) {
    if (["yes", "y", "confirm"].includes(input.toLowerCase())) {
      system.writeLog("Executing sequence...", "error");

      if (pendingResetMode === "hard") {
        if (!injectedSystem) await clearSave();
        initNewGame(null, system);
      } else {
        const currentSeed = system.dungeon.world?.seed || Date.now();
        initNewGame(currentSeed, system);
      }
    } else {
      system.writeLog("Reset cancelled.", "info");
    }
    pendingResetMode = null;
    return;
  }

  if (system.dungeon.realm && system.dungeon.realm.active) {
    processRealmCommand(input);
    return;
  }

  const cmd = parseCommand(input);

  try {
    await executeCommand(cmd, system);
    if (["TAKE", "DROP", "GO", "RESET", "OPEN"].includes(cmd.verb)) {
      if (!injectedSystem) saveGame();
    }
  } catch (e) {
    console.error(e);
    system.writeLog("CRITICAL ERROR: " + e.message, "error");
  }
}

function handleReset(cmd) {
  const isHard =
    cmd.target === "reset" || cmd.target === "hard" || cmd.target === "sudo";

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

export async function executeCommand(cmd, injectedSystem = null) {
  if (cmd.verb === "EMPTY") return;
  const system = injectedSystem || {
    dungeon,
    writeLog,
    executeCommand,
    clearLog,
  };

  switch (cmd.verb) {
    case "LOOK":
      return handleLook(cmd.target, true, system);
    case "GO":
      return handleGo(cmd.target, system);
    case "HELP":
      return handleHelp(system);
    case "CLEAR":
      system.clearLog();
      return;
    case "INVENTORY":
      return handleInventory(system);
    case "TAKE":
      return handleTake(system, cmd.target);
    case "DROP":
      return handleDrop(cmd.target, system);
    case "TALK":
      return handleTalk(cmd.target, system);
    case "RESET":
      return handleReset(cmd);
    case "OPEN":
      return handleOpen(system, cmd.target);
    case "JOURNAL":
      return handleJournal(system);
    case "PLAY":
      return handlePlay(cmd.target, system);
    case "USE":
      return handleUse(system, cmd.target);
    default:
      system.writeLog(`Unknown command sequence: "${cmd.raw}"`, "error");
      return;
  }
}

function handleCheat() {
  // Cheat function implementation omitted for brevity
}

function handleJournal(system = null) {
  const d = system ? system.dungeon : dungeon;
  const log = system ? system.writeLog : writeLog;
  log("--- QUEST LOG ---", "info");
  if (!d.quests || d.quests.length === 0) {
    log("No active data entries.");
    return;
  }
  // Group by Status
  const active = d.quests.filter((q) => q.status === "active");
  const completed = d.quests.filter((q) => q.status === "completed");

  if (active.length > 0) {
    log("ACTIVE:", "response");
    active.forEach((q) => {
      const npc = NPC_ROSTER.find((n) => n.id === q.npcId);
      if (npc) {
        const qDef = npc.quests.find((def) => def.id === q.questId);
        if (qDef) {
          log(`[!] ${qDef.title} (${npc.name})`);
          log(`    "${qDef.startText.substring(0, 50)}..."`, "dim");
        }
      }
    });
  }

  if (completed.length > 0) {
    log("ARCHIVED:", "dim");
    completed.forEach((q) => {
      const npc = NPC_ROSTER.find((n) => n.id === q.npcId);
      if (npc) {
        const qDef = npc.quests.find((def) => def.id === q.questId);
        if (qDef) {
          log(`[✔] ${qDef.title}`, "dim");
        }
      }
    });
  }
}

async function handleLook(target, forceFull = false, system = null) {
  const d = system ? system.dungeon : dungeon;
  const log = system ? system.writeLog : writeLog;

  const room = d.world.rooms[d.currentRoom];

  if (!target) {
    const isFirstVisit = !d.visited.has(room.id);
    log(`[ ${room.name} ]`, "info");
    if (forceFull || isFirstVisit) {
      log(room.description);
      listRoomContents(room, system);
    } else {
      const shortDesc = room.description.split(/[.!?]/)[0] + ".";
      let dirHint = "";
      if (room.exits) {
        const dirs = Object.keys(room.exits);
        if (dirs.length > 0) {
          dirHint = ` [${dirs.map((d) => d[0].toUpperCase()).join("/")}]`;
        }
      }
      log(shortDesc + dirHint, "info-dim");
      listRoomContents(room, system);
    }
    if (isFirstVisit) d.visited.add(room.id);
  } else {
    handleExamine(target, system);
    const lower = target.toLowerCase();
    const item =
      d.inventory.find((i) => i.name.toLowerCase().includes(lower)) ||
      room.items.find((i) => !i.hidden && i.name.toLowerCase().includes(lower));
    if (item && item.onLook) {
      if (item.onLook.actions) {
        const sys = system || { dungeon, writeLog, executeCommand, clearLog };
        await processActions(sys, item.onLook.actions, {
          target: item,
          verb: "LOOK",
        });
      } else if (item.onLook.msg) {
        log(item.onLook.msg, "info");
      }
    }
  }
}

function listRoomContents(room, system = null) {
  const d = system ? system.dungeon : dungeon;
  const log = system ? system.writeLog : writeLog;
  if (room.npcs) {
    room.npcs.forEach((npc) => {
      const known =
        d.relationships &&
        d.relationships[npc.id] &&
        d.relationships[npc.id].known;
      const baseName = known ? npc.name : npc.shortDescription || "someone";
      const subject = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      let action = "is observing you quietly";
      if (npc.ambient && npc.ambient.length > 0) {
        action = npc.ambient[Math.floor(Math.random() * npc.ambient.length)];
      }
      log(`${subject} ${action}`, "response");
    });
  }
  // List Items
  if (room.items && room.items.length > 0) {
    room.items.forEach((item) => {
      if (item.hidden) return;
      if (item.type === "GAME") {
        const suffix = item.metadata?.platform
          ? ` (${item.metadata.platform})`
          : "";
        log(`You spot a cartridge for ${item.name}${suffix}.`, "response");
      } else if (item.type === "KEY") {
        log(`A ${item.name} is shining on the ground.`, "response");
      } else {
        log(`There is a ${item.name} here.`, "response");
      }
    });
  }
}

function handleGo(target, system = null) {
  const d = system ? system.dungeon : dungeon;
  const log = system ? system.writeLog : writeLog;
  if (!target) {
    log("Usage: go [direction]");
    return;
  }
  const room = d.world.rooms[d.currentRoom];
  const nextRoomId = room.exits[target.toLowerCase()];

  if (room.locks && room.locks[target.toLowerCase()]) {
    const lock = room.locks[target.toLowerCase()];
    const hasKey = d.inventory.some((i) => i.id === lock.keyId);

    if (hasKey) {
      // Find key name
      const keyItem = d.inventory.find((i) => i.id === lock.keyId);

      // CHECK BACKPACK REQUIREMENT
      const hasBackpack = d.inventory.some(
        (i) => i.id === "backpack_starter" || i.type === "PACK"
      );

      if (!hasBackpack && target.toLowerCase() === "up") {
        log(
          "The elevator door opens, but you realize you have too many loose cartridges to carry to the next sector efficiently.",
          "error"
        );
        log("You should speak to the Archivist about a container.", "dim");
        return;
      }

      log(`*CLICK* The ${keyItem ? keyItem.name : "key"} turns!`, "info");
      delete room.locks[target.toLowerCase()];
    } else {
      log(lock.msg, "error");
      return; // STOP
    }
  }

  if (nextRoomId) {
    d.currentRoom = nextRoomId;
    handleLook(null, false, system);
    checkRoomTriggers(system);
  } else {
    log(`You cannot go '${target}' from here.`);
  }
}

function checkRoomTriggers(system = null) {
  // ...
}

function handleExamine(target, system = null) {
  const d = system ? system.dungeon : dungeon;
  const log = system ? system.writeLog : writeLog;

  if (!target) {
    log("Examine what?");
    return;
  }

  const room = d.world.rooms[d.currentRoom];

  // Check Inventory First, then Room
  let item = d.inventory.find((i) =>
    i.name.toLowerCase().includes(target.toLowerCase())
  );

  if (!item) {
    item = room.items.find(
      (i) => !i.hidden && i.name.toLowerCase().includes(target.toLowerCase())
    );
  }

  if (!item) {
    log(`You don't see '${target}' here.`);
    return;
  }

  // Render Detail
  log(`[ ${item.name} ]`, "info");
  log(item.description);

  if (item.type === "GAME") {
    if (item.metadata) {
      if (item.metadata.genres)
        log(`Genre: ${item.metadata.genres.join(", ")}`, "dim");
      if (item.metadata.notes) log(`Notes: ${item.metadata.notes}`, "dim");
    }
    log("Type 'play' to launch this cartridge.", "info-dim");
  }

  if (item.type === "PACK") {
    log("It appears to be sealed. You could OPEN it to see the contents.");
    if (item.contents) {
      log(`It feels heavy with ${item.contents.length} cartridges.`);
    }
  }
}

function handleDrop(target, system = null) {
  const d = system ? system.dungeon : dungeon;
  const log = system ? system.writeLog : writeLog;

  if (!target) {
    log("Drop what?");
    return;
  }

  const itemIndex = d.inventory.findIndex((i) =>
    i.name.toLowerCase().includes(target.toLowerCase())
  );

  if (itemIndex > -1) {
    const item = d.inventory[itemIndex];
    // Move item
    d.inventory.splice(itemIndex, 1);

    const room = d.world.rooms[d.currentRoom];
    room.items.push(item);

    log(`You drop the ${item.name}.`);
  } else {
    log(`You aren't carrying a '${target}'.`);
  }
}

function handleTalk(target, system = null) {
  const d = system ? system.dungeon : dungeon;
  const log = system ? system.writeLog : writeLog;

  const room = d.world.rooms[d.currentRoom];

  if (!target) {
    if (room.npcs && room.npcs.length === 1) {
      target = room.npcs[0].name;
    } else {
      log("Talk to whom?");
      return;
    }
  }

  if (!room.npcs || room.npcs.length === 0) {
    log("There is no one here to talk to.");
    return;
  }

  let search = target.toLowerCase();
  if (search.startsWith("to ")) search = search.substring(3).trim();

  const npc = room.npcs.find((n) => {
    if (n.name.toLowerCase().includes(search)) return true;
    if (n.aliases.some((a) => a.toLowerCase().includes(search))) return true;
    if (n.shortDescription && n.shortDescription.toLowerCase().includes(search))
      return true;
    return false;
  });

  if (npc) {
    log(`[ ${npc.name} ]`, "info");

    // ARCHIVIST PRECEDENCE
    if (npc.id === "archivist") {
      const hasKey = d.inventory.find((i) => i.id === "key_level_1");
      const hasBackpack = d.inventory.find((i) => i.id === "backpack_starter");

      if (hasKey && !hasBackpack) {
        log(`"I see you have the elevator key," says the Archivist.`);
        log(
          `"But you cannot travel the zones with your hands full. Take this."`,
          "info"
        );
        const pack = {
          id: "backpack_starter",
          name: "Infinite Backpack",
          type: "PACK",
          description: "Bigger on inside.",
          contents: [],
        };
        d.inventory.push(pack);
        log(`The Archivist gives you an ${pack.name}.`, "success");
        return;
      }

      if (!d.world.flags) d.world.flags = {};

      if (!d.world.flags.archivistMet) {
        d.world.flags.archivistMet = true;
        log(`"Welcome to the constructs, user."`);
        return;
      }

      if (!d.world.flags.receivedStarterGear) {
        d.world.flags.receivedStarterGear = true;
        log(`"Take this backpack."`);
        d.inventory.push({
          id: "backpack_starter",
          name: "Backpack",
          type: "PACK",
        });
        d.world.flags.starterQuestActive = true;
        d.quests.push({
          questId: "archivist_starter",
          npcId: "archivist",
          status: "active",
        });
        return;
      }

      if (
        d.world.flags.starterQuestActive &&
        !d.world.flags.starterQuestComplete
      ) {
        const gameCount = d.inventory.filter((i) => i.type === "GAME").length;
        if (gameCount >= 5) {
          d.world.flags.starterQuestComplete = true;
          log(`"Splendid!"`);
          d.inventory.push({ id: "key_level_1", name: "Key", type: "KEY" });
        } else {
          log(`"I need 5 games."`);
        }
        return;
      }
    }

    // GENERIC INTERACTIONS
    if (!d.relationships) d.relationships = {};
    if (!d.relationships[npc.id]) {
      d.relationships[npc.id] = { trust: 0, known: true };
    }
    const rel = d.relationships[npc.id];

    if (!d.quests) d.quests = [];
    const activeQuestIdx = d.quests.findIndex(
      (q) => q.npcId === npc.id && q.status === "active"
    );

    if (activeQuestIdx > -1) {
      const questMeta = d.quests[activeQuestIdx];
      const questDef = npc.quests.find((q) => q.id === questMeta.questId);

      if (questDef) {
        const item = questDef.condition(d.inventory);
        if (item) {
          d.quests[activeQuestIdx].status = "completed";
          log(`"${questDef.endText}"`, "response");
          if (questDef.reward && questDef.reward.type === "KEY") {
            d.inventory.push({ id: "key_level_1", name: "Key", type: "KEY" });
          }
          return;
        } else {
          log(`"Don't forget, I need that item."`);
          return;
        }
      }
    }

    if (npc.quests) {
      const availableQuest = npc.quests.find((q) => {
        const status = d.quests.find((uq) => uq.questId === q.id);
        if (status) return false;
        return rel.trust >= q.req.trust;
      });
      if (availableQuest) {
        log(`"${availableQuest.startText}"`, "response");
        d.quests.push({
          questId: availableQuest.id,
          npcId: npc.id,
          status: "active",
        });
        return;
      }
    }

    const lines = npc.dialogue.default;
    log(`"${lines[Math.floor(Math.random() * lines.length)]}"`);
  }
}

function handleHelp(system = null) {
  const log = system ? system.writeLog : writeLog;
  log("COMMANDS: LOOK, GO, TAKE, DROP, OPEN, INVENTORY, TALK");
}
function handlePlay(target, system = null) {
  const log = system ? system.writeLog : writeLog;
  log("Not implemented.");
}
