import { describe, it, expect, beforeEach } from "bun:test";
import { dungeon, writeLog, clearLog } from "../store.svelte.js";
import { enterRealm, processRealmCommand } from "../realms/index.js";

describe("Realm System: RPG Mode", () => {
  beforeEach(() => {
    dungeon.realm = null;
    clearLog();
  });

  it("should enter RPG Realm", async () => {
    enterRealm("rpg_chronicles_1", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    expect(dungeon.realm.active).toBe(true);
    expect(dungeon.realm.state.stats.hp).toBe(50);
    expect(dungeon.realm.state.stats.mp).toBe(20);
  });

  it("should process Magic and MP cost", async () => {
    enterRealm("rpg_chronicles_1", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    processRealmCommand("magic");
    expect(dungeon.realm.state.stats.mp).toBe(15); // Started at 20, cost 5
  });

  it("should trigger Boss Battle logic", async () => {
    enterRealm("rpg_chronicles_1", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    // Go to boss
    processRealmCommand("go north"); // floor_1
    processRealmCommand("go north"); // boss_room

    // Boss should activate (index.js handles boss init on look/entry)
    expect(dungeon.realm.state.activeBoss).toBeDefined();

    // Pattern Step 0: Taunt (Weakness: Attack)
    processRealmCommand("attack");
    expect(dungeon.realm.state.activeBoss.hp).toBe(4); // Started at 5
  });
});
