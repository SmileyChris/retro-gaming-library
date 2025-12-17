import { describe, it, expect, beforeEach } from "bun:test";
import { dungeon, writeLog, clearLog } from "../store.svelte.js";
import { enterRealm, processRealmCommand } from "../realms/index.js";

describe("Realm System: Racing Mode", () => {
  beforeEach(() => {
    dungeon.realm = null;
    clearLog();
  });

  it("should enter Racing Realm", async () => {
    enterRealm("speedrunner_track_1", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));
    expect(dungeon.realm.state.stats.speed).toBe(0);
  });

  it("should build momentum with RUN", async () => {
    enterRealm("speedrunner_track_1", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    processRealmCommand("run");
    expect(dungeon.realm.state.stats.speed).toBe(20);
    expect(dungeon.realm.state.stats.momentum).toBe(10);

    processRealmCommand("run");
    expect(dungeon.realm.state.stats.speed).toBe(40);
  });

  it("should traverse loop section with momentum", async () => {
    enterRealm("speedrunner_track_1", { delay: 0 });
    await new Promise((r) => setTimeout(r, 10));

    processRealmCommand("go north"); // straightaway
    processRealmCommand("go north"); // loop_section (hardcoded logic in index.js checks for this ID)

    // At loop_section, "go forward" logic depends on action "run" in index.js
    // index.js: if (location.id === "loop_section") { if (action === "run") ... }

    processRealmCommand("run");
    // Logic says "You gather incredible speed..." and transitionLocation(location.exits.forward)

    // Wait, index.js transitionLocation logic calls handleRealmLook
    // Exits in racing_1.js: loop_section -> forward: "finish_line"

    expect(dungeon.realm.state.locationId).toBe("finish_line");
  });
});
