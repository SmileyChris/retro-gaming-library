const defaultState = {
  isOpen: false,
  history: [],
  currentRoom: "VOID",
  world: null,
  visited: new Set(),
  inventory: [],
  relationships: {}, // npcId -> { trust: 0, known: false }
  quests: [], // { id, status: 'active'|'completed' }
  realm: null, // { active: boolean, id: string, state: object }
  isProcessing: false,
  flags: {}, // Feature flags / Tutorial tips seen
};

let store;
try {
  // @ts-ignore
  store = $state(defaultState);
} catch (e) {
  // Fallback for non-Svelte environments (Tests)
  store = defaultState;
}

export const dungeon = store;

/**
 * Toggles the terminal visibility
 */
export function toggleTerminal() {
  dungeon.isOpen = !dungeon.isOpen;
}

/**
 * Adds a new entry to the history log
 * @param {string} text - The content to display
 * @param {'command' | 'response' | 'error' | 'info' | 'dim' | 'success' | 'info-dim'} type - Structure type
 */
export function writeLog(text, type = "response") {
  dungeon.history.push({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type,
    text,
  });
}

/**
 * Clears the terminal history
 */
export function clearLog() {
  dungeon.history = [];
}
