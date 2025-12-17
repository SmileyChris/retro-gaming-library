import { describe, it, expect, beforeEach } from "bun:test";
import { dungeon, writeLog, clearLog } from "../store.svelte.js";
import { enterRealm, processRealmCommand } from "../realms/index.js";

describe("Realm System: Hacking Mode", () => {
  beforeEach(() => {
    dungeon.realm = null;
    dungeon.flags = {};
    clearLog();
  });

  it("should enter Hacking Realm", async () => {
    enterRealm("glitch_layer_alpha", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));
    expect(dungeon.realm.state.stats.cpu).toBe(100);
  });

  it("should allow editing properties", async () => {
    enterRealm("glitch_layer_alpha", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    // Scan (flavor)
    processRealmCommand("scan");

    // Edit Door
    processRealmCommand("edit door locked false");
    expect(dungeon.realm.state.flags["firewall_down"]).toBe(true);

    // Invalid edit
    processRealmCommand("edit door locked true");
    // Should not error, but log output? We can't easily check log output in this test setup without mocking writeLog.
    // But we check state flags.
  });
});
