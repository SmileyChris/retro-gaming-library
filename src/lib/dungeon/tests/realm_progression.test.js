import { describe, it, expect, beforeEach } from "bun:test";
import { dungeon, writeLog, clearLog } from "../store.svelte.js";
import { enterRealm, processRealmCommand } from "../realms/index.js";

describe("Realm Progression: Hacking Lockout", () => {
  beforeEach(() => {
    dungeon.realm = null;
    dungeon.flags = {};
    clearLog();
  });

  it("should disable hacking after completion", async () => {
    enterRealm("glitch_layer_alpha", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    // 1. Edit Door
    processRealmCommand("edit door locked false");

    // 2. Go North to Kernel
    processRealmCommand("go north");
    expect(dungeon.realm.state.locationId).toBe("kernel_space");

    // 3. Patch System (finishes realm)
    processRealmCommand("patch");

    // Realm should be null (exit)
    expect(dungeon.realm).toBeNull();

    // Flag should be set
    expect(dungeon.flags["hacking_disabled"]).toBe(true);

    // 4. Try to re-enter
    clearLog();
    const success = enterRealm("glitch_layer_alpha", { delay: 0 });
    expect(success).toBe(false); // Should be denied
  });
});
