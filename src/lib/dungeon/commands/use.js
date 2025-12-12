import { dungeon, writeLog } from "../store.svelte.js";
import { executeInteraction } from "../actions.js";

export async function handleUse(rawTarget) {
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
    handleBackpackInterface(lowerTarget);
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
  const handled = await executeInteraction("USE", targetName, toolName);
  if (handled) return;

  // 4. FALLBACK LOGIC (Legacy / Specifics)
  // If we had a tool but failed, we probably shouldn't try generic usage on the tool?
  // "Use key on cabinet" -> failed. Should we try "Use key"? Probably not.

  if (toolName) {
    // Explicit failure handled by executeInteraction usually (if target found but no handler).
    // If target not found, executeInteraction returns false.
    writeLog("You can't do that.");
    return;
  }

  // 5. GENERIC ITEM USAGE (Consoles, Packs)
  // Find the item to run legacy logic
  let item =
    dungeon.inventory.find((i) => i.name.toLowerCase().includes(lowerTarget)) ||
    dungeon.world.rooms[dungeon.currentRoom].items.find((i) =>
      i.name.toLowerCase().includes(lowerTarget)
    );

  if (!item) {
    writeLog(`You don't see a '${targetName}' here.`);
    return;
  }

  const targetItem = item;

  // B. Consoles
  if (targetItem.type === "CONSOLE") {
    // ... Console Logic ...
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

export function handleBackpackInterface(target) {
  // ... duplicate logic from engine.js ...
  // Need to access dungeon inventory.
  // For brevity, I'll assume I can copy paste or clean up.

  // Simplification for this step: Just print "Use the standard inventory command."
  // OR copy the loop.
  // Let's copy the logic.
  let page = 1;
  const parts = target.split(" ");
  if (parts[1] && !isNaN(parts[1])) page = parseInt(parts[1]);

  const games = dungeon.inventory.filter((i) => i.type === "GAME");
  // ... etc
  // (Pasting full logic in final file)
  // For now, I'll put a placeholder if I can't fit it, but I should fit it.

  // ACTUALLY RE-IMPLEMENTING CLEANLY
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
      // platform formatting
      writeLog(`[CHIP] ${game.name}`);
    });
    writeLog("----------------------------------------", "dim");
    if (page < totalPages)
      writeLog(`(Type 'use backpack ${page + 1}' for next page)`, "dim");
  }
}
