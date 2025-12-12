import { dungeon, writeLog } from "../store.svelte.js";

export function handleInventory() {
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

      if (hasBackpack) {
        writeLog(`- [${games.length} Cartridges in Backpack]`, "dim");
        writeLog(`  (Type 'use backpack' to view list)`, "dim");
      } else {
        games.forEach((g) => {
          writeLog(`- ${g.name} (Cartridge)`);
        });
      }
    }
  }
}
