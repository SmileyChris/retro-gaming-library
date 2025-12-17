import { describe, it, expect, beforeEach } from "bun:test";
import { dungeon, writeLog, clearLog } from "../store.svelte.js";
import { enterRealm, processRealmCommand } from "../realms/index.js";

describe("Realm System: Debug Mode", () => {
  beforeEach(() => {
    dungeon.realm = null;
    clearLog();
  });

  it("should enter Debug Realm", async () => {
    enterRealm("debug_access_tool", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));
    expect(dungeon.realm.state.stats.godMode).toBe(true);
  });

  it("should toggle Noclip", async () => {
    enterRealm("debug_access_tool", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    processRealmCommand("noclip");
    expect(dungeon.realm.state.stats.noclip).toBe(true);
    processRealmCommand("noclip");
    expect(dungeon.realm.state.stats.noclip).toBe(false);
  });

  it("should teleport to arbitrary location", async () => {
    enterRealm("debug_access_tool", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    processRealmCommand("teleport secret_room");
    // We force set locationId. index.js should pick it up on next 'look' or interaction?
    // Actually, logic inside processRealmCommand mostly reads locationId to determine interaction.
    // We should manually trigger a 'look' to verify the name changes?
    // But state check is enough.
    expect(dungeon.realm.state.locationId).toBe("secret_room");
  });

  it("should instakill boss", async () => {
    enterRealm("debug_access_tool", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    processRealmCommand("teleport stress_test");
    expect(dungeon.realm.state.locationId).toBe("stress_test");

    // Trigger boss load (usually done on look)
    processRealmCommand("look");
    expect(dungeon.realm.state.activeBoss).toBeDefined();

    processRealmCommand("kill");
    expect(dungeon.realm.state.activeBoss).toBeNull();
    expect(dungeon.realm.state.flags["boss_stress_test_defeated"]).toBe(true);
  });
});
