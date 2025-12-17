import { describe, it, expect, beforeEach, mock } from "bun:test";
import { handleInput, initNewGame } from "../engine.js";

describe("Dungeon Scenario: The Archivist's Backpack", () => {
  let dungeon;
  let writeLog;
  let clearLog;
  let system;
  let logs = [];

  beforeEach(async () => {
    logs = [];
    // Define fresh state for each test
    dungeon = {
      isOpen: true,
      history: [],
      currentRoom: "VOID",
      world: null,
      visited: new Set(),
      inventory: [],
      relationships: {},
      quests: [],
      flags: new Set(),
      realm: null,
    };

    // Mock Functions
    writeLog = mock((text, type = "response") => {
      logs.push({ text, type });
    });
    clearLog = mock(() => {
      logs = [];
    });
  });

  it("should allow a full playthrough of the starter quest", async () => {
    // 1. Setup System
    const { executeCommand: realExec } = await import("../engine.js");

    system = { dungeon, writeLog, clearLog, executeCommand: realExec };

    // 2. Initialize Game (Hardcoded Seed for Determinism)
    initNewGame(12345, system);

    await new Promise((r) => setTimeout(r, 200));

    expect(dungeon.currentRoom).toBe("start_gate");
    expect(logs.find((l) => l.text.includes("SYSTEM REBOOTED"))).toBeTruthy();

    // 3. Move North to Arcade Hub
    logs = [];
    await handleInput("go north", system);

    expect(dungeon.currentRoom).toContain("hub_arcade");

    // 4. Talk to Archivist (Intro)
    logs = [];
    await handleInput("talk archivist", system);

    expect(logs.find((l) => l.text.includes("Archivist"))).toBeTruthy();
    expect(dungeon.world.flags.archivistMet).toBe(true);

    // 5. Talk AGAIN (Get Quest)
    logs = [];
    await handleInput("talk archivist", system);

    expect(logs.find((l) => l.text.includes("pack"))).toBeTruthy();
    expect(dungeon.inventory.some((i) => i.id === "backpack_starter")).toBe(
      true
    );
    expect(dungeon.quests.some((q) => q.questId === "archivist_starter")).toBe(
      true
    );

    // 6. Gather 5 Games (Cheat)
    for (let i = 0; i < 5; i++) {
      dungeon.inventory.push({
        id: `game_mock_${i}`,
        name: `Mock Game ${i}`,
        type: "GAME",
        metadata: { platform: "NES" },
      });
    }

    // 7. Complete Quest
    logs = [];
    await handleInput("talk archivist", system);

    expect(logs.find((l) => l.text.includes("Splendid"))).toBeTruthy();
    expect(dungeon.world.flags.starterQuestComplete).toBe(true);
    expect(dungeon.inventory.some((i) => i.id === "key_level_1")).toBe(true);

    // 8. Use Key to go UP
    logs = [];
    await handleInput("go up", system);

    // Check if we moved (implies unlock or success)
    expect(dungeon.currentRoom).not.toBe("hub_arcade");
  });
});
