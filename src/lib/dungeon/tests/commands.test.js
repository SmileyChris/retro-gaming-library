import { describe, it, expect, beforeEach, mock } from "bun:test";
import { handleTake } from "../commands/take.js";
import { handleUse } from "../commands/use.js";
import { handleOpen } from "../commands/open.js";
import { handleInventory } from "../commands/inventory.js";

// Mock executeInteraction to track calls
const mockExecuteInteraction = mock(() => false);

mock.module("../actions.js", () => {
  return {
    executeInteraction: mockExecuteInteraction,
  };
});

describe("Command Handlers", () => {
  let dungeon;
  let writeLog;
  let system;
  let logs = [];

  beforeEach(() => {
    logs = [];
    dungeon = {
      world: {
        rooms: {
          room1: {
            id: "room1",
            items: [],
          },
        },
      },
      currentRoom: "room1",
      inventory: [],
      flags: new Set(),
    };

    writeLog = mock((msg, type) => {
      logs.push({ msg, type });
    });

    system = { dungeon, writeLog };
    mockExecuteInteraction.mockClear();
  });

  describe("handleTake", () => {
    it("should take a single item from the room", async () => {
      const item = { id: "sword", name: "Sword", type: "WEAPON" };
      dungeon.world.rooms.room1.items.push(item);

      await handleTake(system, "Sword");

      expect(dungeon.inventory).toContain(item);
      expect(dungeon.world.rooms.room1.items).not.toContain(item);
      expect(
        logs.find((l) => l.msg.includes("You take the Sword"))
      ).toBeTruthy();
    });

    it("should fail to take non-existent item", async () => {
      await handleTake(system, "Ghost");

      expect(dungeon.inventory.length).toBe(0);
      expect(
        logs.find((l) => l.msg.includes("You don't see a 'Ghost'"))
      ).toBeTruthy();
    });

    it("should bulk take games", async () => {
      const g1 = { id: "g1", name: "Game 1", type: "GAME" };
      const g2 = { id: "g2", name: "Game 2", type: "GAME" };
      const rock = { id: "rock", name: "Rock", type: "MISC" };

      dungeon.world.rooms.room1.items.push(g1, g2, rock);

      await handleTake(system, "games");

      expect(dungeon.inventory).toContain(g1);
      expect(dungeon.inventory).toContain(g2);
      expect(dungeon.inventory).not.toContain(rock);
      expect(dungeon.world.rooms.room1.items).toContain(rock);
      expect(
        logs.find((l) => l.msg.includes("Collected 2 items"))
      ).toBeTruthy();
    });
  });

  describe("handleUse", () => {
    it("should parse 'Use Tool on Target' and delegate", async () => {
      await handleUse(system, "Hammer on Nail");
      expect(mockExecuteInteraction).toHaveBeenCalledWith(
        system,
        "USE",
        "Nail",
        "Hammer"
      );
    });

    it("should parse 'Use Tool with Target' and delegate", async () => {
      await handleUse(system, "Key with Lock");
      expect(mockExecuteInteraction).toHaveBeenCalledWith(
        system,
        "USE",
        "Lock",
        "Key"
      );
    });

    it("should unpack a bundle into the room", async () => {
      const game = { id: "g1", name: "Hidden Game", type: "GAME" };
      const bundle = {
        id: "bundle",
        name: "Mystery Bag",
        type: "BUNDLE",
        contents: [game],
      };
      dungeon.inventory.push(bundle);

      await handleUse(system, "Mystery Bag");

      expect(dungeon.inventory).not.toContain(bundle);
      expect(dungeon.world.rooms.room1.items).toContain(game);
      expect(logs.find((l) => l.msg.includes("You tear open"))).toBeTruthy();
    });
  });

  describe("handleOpen", () => {
    it("should delegate to OPEN interaction first", async () => {
      mockExecuteInteraction.mockResolvedValueOnce(true);
      await handleOpen(system, "Box");
      expect(mockExecuteInteraction).toHaveBeenCalledWith(
        system,
        "OPEN",
        "Box",
        null
      );
    });

    it("should open backpack interfaces", async () => {
      dungeon.inventory.push({ id: "backpack_starter", type: "PACK" });
      await handleOpen(system, "backpack");
      expect(
        logs.find((l) => l.msg.includes("STORAGE INTERFACE"))
      ).toBeTruthy();
    });

    it("should fail to open backpack if not owned", async () => {
      await handleOpen(system, "backpack");
      expect(
        logs.find((l) => l.msg.includes("don't have a backpack"))
      ).toBeTruthy();
    });
  });

  describe("handleInventory", () => {
    it("should report empty pockets", () => {
      handleInventory(system);
      expect(
        logs.find((l) => l.msg.includes("pockets are empty"))
      ).toBeTruthy();
    });

    it("should list items", () => {
      dungeon.inventory.push({ id: "sword", name: "Sword", type: "WEAPON" });
      handleInventory(system);
      expect(logs.find((l) => l.msg.includes("- Sword"))).toBeTruthy();
    });

    it("should show games summary if backpack owned", () => {
      dungeon.inventory.push({
        id: "backpack_starter",
        name: "Backpack",
        type: "PACK",
      });
      dungeon.inventory.push({ id: "g1", name: "Game 1", type: "GAME" });
      dungeon.inventory.push({ id: "g2", name: "Game 2", type: "GAME" });

      handleInventory(system);

      expect(logs.find((l) => l.msg.includes("- Backpack"))).toBeTruthy();
      // Should not list games individually
      expect(logs.find((l) => l.msg.includes("- Game 1"))).toBeFalsy();
      // Should show summary
      expect(
        logs.find((l) => l.msg.includes("Cartridges in Backpack"))
      ).toBeTruthy();
    });
  });
});
