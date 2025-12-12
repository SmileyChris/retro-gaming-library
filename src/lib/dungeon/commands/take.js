import { dungeon, writeLog } from "../store.svelte.js";
import { executeInteraction } from "../actions.js";

export async function handleTake(target) {
  if (!target) {
    writeLog("Take what?");
    return;
  }

  const room = dungeon.world.rooms[dungeon.currentRoom];
  const lowerTarget = target.toLowerCase();

  // BULK TAKE LOGIC
  let itemsToTake = [];

  if (lowerTarget === "all" || lowerTarget === "everything") {
    // Exclude 'noTake' items (Bundles), Puzzle items (legacy requires), and Special Interaction items
    itemsToTake = room.items.filter(
      (i) =>
        !i.requires &&
        i.type !== "BUNDLE" &&
        (!i.interactions || !i.interactions["TAKE"])
    );
  } else if (lowerTarget === "games" || lowerTarget === "all games") {
    itemsToTake = room.items.filter(
      (i) =>
        i.type === "GAME" &&
        !i.requires &&
        (!i.interactions || !i.interactions["TAKE"])
    );
  } else if (lowerTarget.endsWith(" games")) {
    const query = lowerTarget.replace(" games", "").trim();
    itemsToTake = room.items.filter(
      (i) =>
        i.type === "GAME" &&
        !i.requires &&
        (!i.interactions || !i.interactions["TAKE"]) &&
        (i.metadata?.platform?.toLowerCase().includes(query) ||
          i.name.toLowerCase().includes(query))
    );
  }

  // Execute Bulk Take if matched
  if (itemsToTake.length > 0) {
    let count = 0;
    const newRoomItems = room.items.filter((i) => !itemsToTake.includes(i));
    const hasBackpack = dungeon.inventory.some(
      (i) => i.id === "backpack_starter" || i.type === "PACK"
    );

    itemsToTake.forEach((item) => {
      dungeon.inventory.push(item);
      // ... log ...
      if (item.type === "GAME") {
        if (hasBackpack) writeLog(`You stash ${item.name} in your backpack.`);
        else writeLog(`You carry ${item.name}.`);
      } else {
        writeLog(`You take the ${item.name}.`);
      }

      if (item.metadata && item.metadata.gem)
        writeLog("It sparkles with a hidden energy!", "info");
      count++;
    });

    room.items = newRoomItems;
    if (count > 0) writeLog(`Collected ${count} items.`, "info-dim");
    return;
  }

  // SEMANTIC INTERACTION (Singular)
  // Check if there is specific logic for "taking" this target (e.g. Blocking)
  // Note: We deliberately check this BEFORE standard lookup because executeInteraction handles lookup.
  // BUT executeInteraction handles implicit lookup "Take it".
  const handled = await executeInteraction("TAKE", target, null);
  if (handled) return;

  // SINGULAR TAKE LOGIC
  // Prioritize exact matches
  let itemIndex = room.items.findIndex(
    (i) => i.name.toLowerCase() === lowerTarget
  );

  if (itemIndex === -1) {
    itemIndex = room.items.findIndex((i) =>
      i.name.toLowerCase().includes(lowerTarget)
    );
  }

  if (itemIndex > -1) {
    const item = room.items[itemIndex];

    // Check "noTake" logic (Bundles)
    if (item.type === "BUNDLE") {
      writeLog("It's too heavy or awkward to carry. You should 'use' it here.");
      return;
    }

    // GAME LOGIC
    if (item.type === "GAME") {
      if (item.requires) {
        writeLog(item.requires.msg, "error");
        return;
      }

      room.items.splice(itemIndex, 1);
      dungeon.inventory.push(item);

      const hasBackpack = dungeon.inventory.some(
        (i) => i.id === "backpack_starter" || i.type === "PACK"
      );
      const platform = item.metadata?.platform || "Unknown";

      if (hasBackpack) {
        writeLog(`You stash the ${item.name} (${platform}) in your backpack.`);
      } else {
        writeLog(`You pick up the ${item.name} (${platform}).`);
      }
      return;
    }

    // NORMAL LOGIC
    room.items.splice(itemIndex, 1);
    dungeon.inventory.push(item);

    writeLog(`You take the ${item.name}.`);
    if (item.metadata?.gem) {
      writeLog("It sparkles with a hidden energy!", "info");
    }
  } else {
    // Failure
    if (lowerTarget.includes(" games")) {
      writeLog(`You don't see any matching games here.`);
    } else {
      writeLog(`You don't see a '${target}' here.`);
    }
  }
}
