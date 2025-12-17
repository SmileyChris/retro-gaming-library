import { dungeon, writeLog, clearLog } from "./store.svelte.js";
import { parseCommand } from "./parser.js";
import { generateDungeon } from "./generation/generator.js";
import { getConsoleForPlatform } from "./generation/populator.js";
import { saveGame, loadGame, clearSave } from "./persistence.js";
import { NPC_ROSTER } from "./content/npcs.js";
import { DUNGEON_GAMES } from "./content/games.js";
import { enterRealm, processRealmCommand } from "./realms/index.js";
import { handleUse } from "./commands/use.js";
import { handleTake } from "./commands/take.js";
import { handleOpen } from "./commands/open.js";
import { handleInventory } from "./commands/inventory.js";
import { handleMove } from "./commands/move.js";
import { handleTalk } from "./commands/talk.js";
import { handleSay } from "./commands/say.js";
import { handlePush } from "./commands/push.js";
import { handleSudo } from "./commands/sudo.js";
import { processActions } from "./actions.js";

/**
 * Initialize the engine - call this after lazy loading
 * Returns a promise that resolves when initialization is complete
 */
export async function initEngine() {
  const loaded = await loadGame();
  if (!loaded) {
    initNewGame();
  } else {
    handleLook();
  }
  dungeon.isBooted = true;
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
  d.flags = {};

  setTimeout(() => {
    // Only show regeneration message if this was an explicit reset (forceSeed present)
    // or if we want to differentiate boot vs reset.
    // User requested simpler boot.
    if (forceSeed) {
      log("SYSTEM REBOOTED.", "info");
    } else {
      // Optional: "System Online" or nothing.
      // log("System Initialized.", "dim");
    }

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
    handleLook,
    checkRoomTriggers,
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
    handleLook,
    checkRoomTriggers,
  };

  switch (cmd.verb) {
    case "LOOK":
      return handleLook(cmd.target, true, system);
    case "GO":
      return handleMove(system, cmd.target);
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
      return handleTalk(system, cmd.target);
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
    case "SAY":
      return handleSay(system, cmd.target); // target is the full text for SAY ideally, parser might split it?
    // parser.js usually puts everything after verb into 'target' or 'raw'?
    // If parser splits by spaces, 'target' might be just the first word if not careful.
    // Need to check parser behavior. Assuming cmd.target is the rest of the string.
    case "PUSH":
      return handlePush(system, cmd.target);
    case "SUDO":
      return handleSudo(system, cmd.target);
    case "EXIT":
      system.dungeon.isOpen = false;
      return;
    case "SAVE":
      saveGame();
      system.writeLog("Details saved to cartridge memory.", "success");
      return;
    default:
      const firstWord = cmd.raw.split(" ")[0];
      const responses = [
        `I don't know how to "${firstWord}".`,
        `What does "${firstWord}" mean?`,
        `"${firstWord}" is not recognized.`,
        `I can't do that.`,
        `System error: "${firstWord}" undefined.`,
      ];
      system.writeLog(
        responses[Math.floor(Math.random() * responses.length)],
        "error"
      );
      return;
  }
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
        const platform = item.platform || item.metadata?.platform;
        const suffix = platform ? ` (${platform})` : "";
        log(`You spot a cartridge for ${item.name}${suffix}.`, "response");
      } else if (item.type === "KEY") {
        log(`A ${item.name} is shining on the ground.`, "response");
      } else {
        log(`There is a ${item.name} here.`, "response");
      }
    });
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
    log("To play: find a Console and USE CARTRIDGE.", "info-dim");
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

function handleHelp(system = null) {
  const log = system ? system.writeLog : writeLog;
  log("COMMANDS: LOOK, GO, TAKE, DROP, OPEN, INVENTORY, TALK");
}
function handlePlay(target, system = null) {
  const log = system ? system.writeLog : writeLog;
  log("Not implemented.");
}
