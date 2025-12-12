import { get, set, del } from "idb-keyval";
import { dungeon, writeLog } from "./store.svelte.js";

const DB_KEY = "retro_dungeon_state_v1";

/**
 * Saves the current dungeon state to IDB.
 */
export async function saveGame() {
  if (!dungeon.world) return;

  // Use a clean object to avoid saving Svelte proxies if possible,
  // though structuredClone usually handles it.
  // We need to save: currentRoom, world (rooms, items, npcs), inventory, visited.
  const state = {
    currentRoom: dungeon.currentRoom,
    // Convert Set to Array for JSON
    visited: Array.from(dungeon.visited),
    inventory: dungeon.inventory,
    world: dungeon.world,
    timestamp: Date.now(),
  };

  try {
    await set(DB_KEY, state);
    console.log("Game Saved");
  } catch (e) {
    console.error("Save Failed", e);
  }
}

/**
 * Loads the game state. Returns true if successful.
 */
export async function loadGame() {
  try {
    const state = await get(DB_KEY);
    if (state) {
      dungeon.world = state.world;
      dungeon.currentRoom = state.currentRoom;
      dungeon.inventory = state.inventory || [];
      dungeon.visited = new Set(state.visited || []);
      writeLog("SYSTEM RESTORED FROM BACKUP...", "info");
      return true;
    }
  } catch (e) {
    console.error("Load Failed", e);
  }
  return false;
}

/**
 * Deletes the save file.
 */
export async function clearSave() {
  await del(DB_KEY);
}
