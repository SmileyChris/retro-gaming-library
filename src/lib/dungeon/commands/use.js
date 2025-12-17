import { executeInteraction } from "../actions.js";

export async function handleUse(system, rawTarget) {
  const { dungeon, writeLog } = system;

  if (!rawTarget) {
    writeLog("Use what?");
    return;
  }

  // 1. BACKPACK STORAGE INTERFACE (Pagination)
  const lowerTarget = rawTarget.toLowerCase();

  if (
    lowerTarget.startsWith("backpack") ||
    lowerTarget.startsWith("pack") ||
    lowerTarget.startsWith("bag") ||
    lowerTarget.startsWith("pocket")
  ) {
    handleBackpackInterface(system, lowerTarget);
    return;
  }

  // 2. PARSE "Use [Tool] on [Target]" vs "Use [Target]"
  let targetName = rawTarget;
  let toolName = null;

  // Split by " on " or " with "
  const separators = [" on ", " with "];
  for (const sep of separators) {
    if (lowerTarget.includes(sep)) {
      const parts = rawTarget.split(new RegExp(sep, "i")); // Case insensitive split
      toolName = parts[0].trim();
      targetName = parts[1].trim();
      break;
    }
  }

  // 3. SEMANTIC INTERACTION DELEGATION
  const handled = await executeInteraction(system, "USE", targetName, toolName);
  if (handled) return;

  // 4. FALLBACK LOGIC (Legacy / Specifics)
  if (toolName) {
    writeLog("You can't do that.");
    return;
  }

  // 5. GENERIC ITEM USAGE (Consoles, Packs)
  let item =
    dungeon.inventory.find((i) => i.name.toLowerCase().includes(lowerTarget)) ||
    dungeon.world.rooms[dungeon.currentRoom].items.find(
      (i) => !i.hidden && i.name.toLowerCase().includes(lowerTarget)
    );

  if (!item) {
    writeLog(`You don't see a '${targetName}' here.`);
    return;
  }

  const targetItem = item;

  // B. Consoles
  if (targetItem.type === "CONSOLE") {
    writeLog(`[ ${targetItem.name.toUpperCase()} ] - SYSTEM MENU`, "info");
    writeLog("Scanning backpack modules...", "dim");

    const compatibleGames = dungeon.inventory.filter(
      (g) =>
        g.type === "GAME" &&
        targetItem.supported &&
        targetItem.supported.some((s) =>
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

  // C. Pack Logic (Bundle)
  if (
    targetItem.type === "PACK" ||
    targetItem.type === "DECK" ||
    targetItem.type === "BUNDLE"
  ) {
    writeLog(`You tear open the ${targetItem.name}...`);
    if (targetItem.contents && targetItem.contents.length > 0) {
      writeLog("A collection of cartridges spills out!", "info");
      const room = dungeon.world.rooms[dungeon.currentRoom];
      targetItem.contents.forEach((game) => {
        room.items.push(game);
        writeLog(`- ${game.name}`);
      });

      // Show Tip if first time opening a bundle
      if (!dungeon.flags?.has("seen_bundle_tip")) {
        dungeon.flags = dungeon.flags || new Set();
        dungeon.flags.add("seen_bundle_tip");
        writeLog(
          "\n(Tip: You can type 'get games' to pick them all up at once!)",
          "info-dim"
        );
      }

      // Remove Bundle
      const idx =
        dungeon.world.rooms[dungeon.currentRoom].items.indexOf(targetItem);
      if (idx !== -1)
        dungeon.world.rooms[dungeon.currentRoom].items.splice(idx, 1);
      else {
        // Inventory
        const invIdx = dungeon.inventory.indexOf(targetItem);
        if (invIdx !== -1) dungeon.inventory.splice(invIdx, 1);
      }
    } else {
      writeLog("It was empty...");
    }
    return;
  }

  writeLog(`You fiddle with the ${targetItem.name}, but nothing happens.`);
}

export function handleBackpackInterface(system, target) {
  const { dungeon, writeLog } = system;

  let page = 1;
  const parts = target.split(" ");
  if (parts[1] && !isNaN(parts[1])) page = parseInt(parts[1]);

  const games = dungeon.inventory.filter((i) => i.type === "GAME");
  const pageSize = 15;
  const totalPages = Math.ceil(games.length / pageSize);

  if (page < 1) page = 1;
  if (page > totalPages && totalPages > 0) page = totalPages;

  writeLog(`[ BACKPACK ] - STORAGE INTERFACE`, "info");
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
      writeLog(`[CHIP] ${game.name}`);
    });
    writeLog("----------------------------------------", "dim");
    if (page < totalPages)
      writeLog(`(Type 'use backpack ${page + 1}' for next page)`, "dim");
  }
}
