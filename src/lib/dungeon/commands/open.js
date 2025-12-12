import { dungeon, writeLog } from "../store.svelte.js";
import { handleBackpackInterface, handleUse } from "./use.js";
import { executeInteraction } from "../actions.js";

export async function handleOpen(target) {
  if (!target) {
    writeLog("Open what?");
    return;
  }

  // 1. SEMANTIC OPEN
  const handled = await executeInteraction("OPEN", target, null);
  if (handled) return;

  const lowerTarget = target.toLowerCase();

  // 2. BACKPACK (Legacy Interface)
  if (
    lowerTarget.startsWith("backpack") ||
    lowerTarget.startsWith("pack") ||
    lowerTarget.startsWith("bag") ||
    lowerTarget.startsWith("pocket")
  ) {
    const hasBackpack = dungeon.inventory.some(
      (i) => i.id === "backpack_starter" || i.type === "PACK"
    );
    if (!hasBackpack) {
      writeLog("You don't have a backpack.");
      return;
    }
    handleBackpackInterface(target);
    return;
  }

  // 3. LEGACY PACKS / BUNDLES
  // If executeInteraction didn't handle it, maybe it's a legacy pack that relies on handleUse?
  // Or handleUse's fallback logic.
  let item =
    dungeon.inventory.find((i) => i.name.toLowerCase().includes(lowerTarget)) ||
    dungeon.world.rooms[dungeon.currentRoom].items.find((i) =>
      i.name.toLowerCase().includes(lowerTarget)
    );

  if (
    item &&
    (item.type === "PACK" || item.type === "BUNDLE" || item.type === "DECK")
  ) {
    handleUse(target);
    return;
  }

  // Warning handled by executeInteraction?
  // If target matched but no interaction, executeInteraction returns false.
  // We want to verify if target exists to be helpful.
  if (item) {
    writeLog("You can't open that.");
  } else {
    writeLog(`You don't see a '${target}' here.`);
  }
}
