import { writeLog, dungeon, clearLog } from "../store.svelte.js";
import { initNewGame } from "../engine.js";
import { DUNGEON_GAMES } from "../content/games.js";

export async function handleSudo(system, target) {
  const log = system.writeLog;

  if (!target) {
    log("Usage: sudo [command]", "dim");
    log("Commands: reset, cheat, kill", "dim");
    return;
  }

  const parts = target.split(" ");
  const subCmd = parts[0].toLowerCase();

  switch (subCmd) {
    case "reset":
      log("SUDO: FORCED RESET INITIATED...", "error");
      await initNewGame(null, system);
      break;

    case "cheat":
    case "god":
      handleGodMode(system);
      break;

    case "kill":
      // Kill everything in room?
      log("SUDO: SMITE.", "error");
      const d = system.dungeon;
      const room = d.world.rooms[d.currentRoom];
      if (room.npcs) room.npcs = [];
      // Also unlock everything
      if (room.locks) room.locks = {};
      log("Room sanitized.", "success");
      break;

    default:
      log(`Sudo: Unknown command '${subCmd}'`, "error");
  }
}

function handleGodMode(system) {
  const d = system.dungeon;
  const log = system.writeLog;

  log("SUDO: GRANTING DEBUG ACCESS...", "success");

  // 1. Give Debug Cartridge
  const debugCart = DUNGEON_GAMES.find((g) => g.id === "debug_access_tool");
  if (debugCart) {
    if (!d.inventory.some((i) => i.id === debugCart.id)) {
      // create item instance
      d.inventory.push({
        id: debugCart.id,
        name: debugCart.title,
        type: "GAME",
        description: debugCart.description,
        metadata: debugCart,
      });
      log("Added: QA_Internal_Build", "success");
    } else {
      log("You already have the debug tool.", "dim");
    }
  }

  // 2. Unlock Room
  const room = d.world.rooms[d.currentRoom];
  if (room.locks) {
    room.locks = {};
    log("Security overrides active. Locks removed.", "success");
  }
}
