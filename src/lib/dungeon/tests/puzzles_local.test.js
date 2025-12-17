import { describe, it, expect, beforeEach } from "bun:test";
import { dungeon, writeLog, clearLog } from "../store.svelte.js";
import { executeCommand, initNewGame } from "../engine.js";

describe("Local Puzzles", () => {
  beforeEach(() => {
    // Setup a mock room with a puzzle manually to test logic specifically
    dungeon.world = {
      rooms: {
        test_room: {
          id: "test_room",
          name: "Puzzle Room",
          description: "A test room.",
          items: [],
          exits: {},
        },
      },
    };
    dungeon.currentRoom = "test_room";
    dungeon.inventory = [];
    clearLog();
  });

  it("should solve Riddles with SAY", async () => {
    const room = dungeon.world.rooms.test_room;
    room.puzzle = {
      type: "RIDDLE",
      question: "What is 2+2?",
      answer: "four",
      successMsg: "Correct!",
      rewardType: "SPAWN_ITEM",
    };

    await executeCommand({ verb: "SAY", target: "three" });
    expect(
      dungeon.history.find((h) => h.text.includes("Correct!"))
    ).toBeUndefined();

    await executeCommand({ verb: "SAY", target: "four" });
    expect(
      dungeon.history.find((h) => h.text.includes("Correct!"))
    ).toBeDefined();

    // Check reward
    expect(room.items.length).toBe(1);
    expect(room.items[0].name).toBe("Sphynx Gold");
  });

  it("should solve Sokoban with PUSH", async () => {
    const room = dungeon.world.rooms.test_room;

    // Mock push logic inside item
    room.items.push({
      id: "crate",
      name: "Crate",
      interactions: {
        push: {
          msg: "You push it.",
          onPush: (sys, r, i) => {
            r.flags = { solved: true };
            r.items.push({ name: "Reward", type: "TREASURE" });
          },
        },
      },
    });

    await executeCommand({ verb: "PUSH", target: "crate" });

    expect(
      dungeon.history.find((h) => h.text.includes("You push it"))
    ).toBeDefined();
    expect(room.flags.solved).toBe(true);
    expect(room.items.find((i) => i.name === "Reward")).toBeDefined();
  });
});
