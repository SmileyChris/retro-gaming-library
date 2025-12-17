import { describe, it, expect, beforeEach, mock } from "bun:test";
import { dungeon, writeLog, clearLog } from "../store.svelte.js";
import { enterRealm, processRealmCommand } from "../realms/index.js";
import { initNewGame } from "../engine.js";

describe("Realm System: Stealth Mode", () => {
  beforeEach(() => {
    // Reset Store
    dungeon.realm = null;
    clearLog();
  });

  it("should enter the Stealth Realm and switch mechanics", async () => {
    const success = enterRealm("stealth_mission_alpha", { delay: 0 });
    expect(success).toBe(true);
    // Wait for timeout (even 0ms might need next tick)
    await new Promise((r) => setTimeout(r, 10));
    expect(success).toBe(true);
    expect(dungeon.realm.mode).toBeUndefined(); // We used gameId logic, mode is in mechanics
    expect(dungeon.realm.active).toBe(true);
    expect(dungeon.realm.state.stats.alertLevel).toBe(0);

    // Test HIDE command (Generic Action)
    processRealmCommand("hide");
    // We expect log "You are now hidden."
    // And state to change (if effect worked)
    expect(dungeon.realm.state.stats.hidden).toBe(true);
  });

  it("should handle location interactions", async () => {
    enterRealm("stealth_mission_alpha", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    // Move to server room (via corridor)
    // Correct path: North -> North
    // Current location: start (Cargo Bay). Exits: North.
    processRealmCommand("go north");
    expect(dungeon.realm.state.locationId).toBe("corridor_1");

    processRealmCommand("go north");
    expect(dungeon.realm.state.locationId).toBe("server_room");

    // Interaction: HACK
    processRealmCommand("hack");
    expect(dungeon.realm.state.stats.items_stolen).toBe(1);
  });
});
