import { describe, it, expect, beforeEach } from "bun:test";
import { generateDungeon } from "../generation/generator.js";

describe("Procedural Narrative", () => {
  it("should generate a narrative context", () => {
    const world = generateDungeon(12345);
    expect(world.narrative).toBeDefined();
    expect(world.narrative.threat).toBeDefined();
    expect(world.narrative.guide).toBeDefined();
    expect(world.narrative.artifact).toBeDefined();
  });

  it("should inject flavor text based on the threat", () => {
    // Use a seed known or just check for presence of ANY flavor text from the set?
    // Let's check a large dungeon for at least ONE instance.
    const world = generateDungeon(Date.now());
    const threatFlavor = Object.values(world.narrative.threat.flavor);

    let found = false;
    Object.values(world.rooms).forEach((room) => {
      if (threatFlavor.some((f) => room.description.includes(f))) {
        found = true;
      }
    });

    expect(found).toBe(true);
  });
});
