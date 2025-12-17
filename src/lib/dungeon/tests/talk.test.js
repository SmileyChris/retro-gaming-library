import { describe, it, expect, beforeEach, mock } from "bun:test";
import { handleTalk } from "../commands/talk.js";

describe("Command Handlers - Talk", () => {
  let dungeon;
  let writeLog;
  let system;
  let logs = [];

  beforeEach(() => {
    logs = [];
    dungeon = {
      world: {
        rooms: {
          r1: {
            id: "r1",
            npcs: [],
          },
        },
        flags: {},
      },
      currentRoom: "r1",
      inventory: [],
      quests: [],
      relationships: {},
    };

    writeLog = mock((msg, type) => {
      logs.push({ msg, type });
    });

    system = { dungeon, writeLog };
  });

  it("should fail if no NPCs in room", () => {
    handleTalk(system);
    expect(logs.find((l) => l.msg.includes("no one here"))).toBeTruthy();
  });

  it("should auto-target single NPC", () => {
    const npc = {
      id: "bob",
      name: "Bob",
      dialogue: { default: ["Hi."] },
    };
    dungeon.world.rooms.r1.npcs.push(npc);

    handleTalk(system);
    expect(logs.find((l) => l.msg.includes("[ Bob ]"))).toBeTruthy();
    expect(logs.find((l) => l.msg.includes("Hi"))).toBeTruthy();
  });

  it("should ask for target if multiple NPCs", () => {
    dungeon.world.rooms.r1.npcs.push(
      { id: "bob", name: "Bob" },
      { id: "alice", name: "Alice" }
    );
    handleTalk(system);
    expect(logs.find((l) => l.msg.includes("Talk to whom?"))).toBeTruthy();
  });

  describe("Archivist Logic", () => {
    let archivist;
    beforeEach(() => {
      archivist = { id: "archivist", name: "Archivist" };
      dungeon.world.rooms.r1.npcs.push(archivist);
    });

    it("should welcome on first meet", () => {
      dungeon.world.flags = {};
      handleTalk(system, "Archivist");
      expect(
        logs.find((l) => l.msg.includes("Welcome to the constructs"))
      ).toBeTruthy();
      expect(dungeon.world.flags.archivistMet).toBe(true);
    });

    it("should give backpack on second meet", () => {
      dungeon.world.flags = { archivistMet: true };
      handleTalk(system, "Archivist");
      expect(
        logs.find((l) => l.msg.includes("Take this backpack"))
      ).toBeTruthy();
      expect(dungeon.inventory.some((i) => i.id === "backpack_starter")).toBe(
        true
      );
      expect(dungeon.world.flags.receivedStarterGear).toBe(true);
      expect(dungeon.world.flags.starterQuestActive).toBe(true);
    });

    it("should check progress of starter quest", () => {
      dungeon.world.flags = {
        archivistMet: true,
        receivedStarterGear: true,
        starterQuestActive: true,
      };

      // Not enough games
      dungeon.inventory = [];
      handleTalk(system, "Archivist");
      expect(
        logs.find((l) => l.msg.includes("I need 5 stable Game Cartridges"))
      ).toBeTruthy();

      // Enough games
      dungeon.inventory = [
        { type: "GAME" },
        { type: "GAME" },
        { type: "GAME" },
        { type: "GAME" },
        { type: "GAME" },
      ];
      handleTalk(system, "Archivist");
      expect(logs.find((l) => l.msg.includes("Splendid"))).toBeTruthy();
      expect(dungeon.world.flags.starterQuestComplete).toBe(true);
      expect(dungeon.inventory.some((i) => i.id === "key_level_1")).toBe(true);
    });
  });

  describe("Generic Quest Logic", () => {
    let npc;
    let questDef;

    beforeEach(() => {
      questDef = {
        id: "quest1",
        startText: "I need a rock.",
        endText: "Thanks for rock.",
        req: { trust: 0 },
        condition: (inv) => inv.find((i) => i.id === "rock"),
        reward: { type: "KEY" },
      };
      npc = {
        id: "npc1",
        name: "NPC1",
        quests: [questDef],
        dialogue: { default: ["..."] },
      };
      dungeon.world.rooms.r1.npcs.push(npc);
    });

    it("should give available quest", () => {
      handleTalk(system, "NPC1");
      expect(logs.find((l) => l.msg.includes("I need a rock"))).toBeTruthy();
      expect(
        dungeon.quests.some(
          (q) => q.questId === "quest1" && q.status === "active"
        )
      ).toBe(true);
    });

    it("should complete active quest if condition met", () => {
      dungeon.quests.push({
        questId: "quest1",
        npcId: "npc1",
        status: "active",
      });
      dungeon.inventory.push({ id: "rock", name: "Rock" });

      handleTalk(system, "NPC1");
      expect(logs.find((l) => l.msg.includes("Thanks for rock"))).toBeTruthy();
      expect(dungeon.quests.find((q) => q.questId === "quest1").status).toBe(
        "completed"
      );
      expect(dungeon.inventory.some((i) => i.id === "key_level_1")).toBe(true);
    });
  });
});
