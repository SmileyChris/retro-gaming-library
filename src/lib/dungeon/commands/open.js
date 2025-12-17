import { handleBackpackInterface, handleUse } from "./use.js";
import { executeInteraction } from "../actions.js";

export async function handleOpen(system, target) {
  const { dungeon, writeLog } = system;

  if (!target) {
    writeLog("Open what?");
    return;
  }

  // 1. SEMANTIC OPEN
  const handled = await executeInteraction(system, "OPEN", target, null);
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
    handleBackpackInterface(system, target);
    return;
  }

  // 3. LEGACY PACKS / BUNDLES
  let item =
    dungeon.inventory.find((i) => i.name.toLowerCase().includes(lowerTarget)) ||
    dungeon.world.rooms[dungeon.currentRoom].items.find((i) =>
      i.name.toLowerCase().includes(lowerTarget)
    );

  if (
    item &&
    (item.type === "PACK" || item.type === "BUNDLE" || item.type === "DECK")
  ) {
    handleUse(system, target);
    return;
  }

  if (item) {
    writeLog("You can't open that.");
  } else {
    writeLog(`You don't see a '${target}' here.`);
  }
}
