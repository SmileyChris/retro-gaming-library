import { GENRES } from "../mechanics.js";

export default {
  realmId: "debug_access_tool",
  metadata: {
    title: "QA_TEST_BUILD_V0.9",
    platform: "DEV_KIT",
    year: 2024,
  },
  mechanics: {
    type: GENRES.DEBUG,
    stats: {
      godMode: true,
      noclip: false,
    },
    actions: {
      noclip: {
        description: "Toggle wall collision.",
        msg: "NOCLIP toggled.",
        effect: (state) => {
          state.stats.noclip = !state.stats.noclip;
          return `NOCLIP: ${state.stats.noclip}`;
        },
      },
      teleport: {
        description: "Jump to any location. Usage: TELEPORT [location_id]",
        effect: (state, input) => {
          const parts = input.split(" ");
          if (parts.length < 2) return "Usage: TELEPORT [location_id]";
          const target = parts[1];
          // We need to set state.locationId.
          // But we should verify it exists?
          // We don't have access to the phase definition here easily without passing it.
          // For a debug tool, let's just force it. index.js might handle invalid ID gracefully (or error log).
          state.locationId = target;
          // We need to trigger look manually?
          // handleRealmLook checks location validity.
          return `Teleporting to ${target}...`;
        },
      },
      kill: {
        description: "Destroy all active entities.",
        overrideBoss: true,
        effect: (state) => {
          // How to kill boss?
          // state.activeBoss = null;
          // But we also need to set the defeat flag?
          if (state.activeBoss) {
            state.activeBoss.hp = 0; // Will trigger death on next interaction?
            // index.js handleBossBattle checks HP <= 0.
            // But we need to invoke it or manually clear it.
            // Let's manually clear.
            state.activeBoss = null;
            // We don't know the current location ID here easily to set flag 'boss_${id}_defeated'
            // unless we access state.locationId.
            const loc = state.locationId;
            state.flags[`boss_${loc}_defeated`] = true;
            return "Boss deleted.";
          }
          return "No targets found.";
        },
      },
    },
  },
  entry: {
    location: "start",
    description:
      "Welcome to the Testing Grid. Use NOCLIP to bypass collisions.",
    tutorialHints: [
      "TELEPORT to jump locations.",
      "KILL to remove obstructions.",
    ],
  },
  exit: {
    description: "Testing complete. Logs saved.",
  },
  phases: [
    {
      name: "Sandbox",
      locations: {
        start: {
          id: "start",
          name: "Origin Point (0,0,0)",
          description: "An infinite gray plane.",
          exits: {
            north: "stress_test",
          },
        },
        stress_test: {
          id: "stress_test",
          name: "Stress Test Chamber",
          description: "A room filled with aggressive geometry.",
          boss: {
            name: "Polygon Man",
            hp: 9999,
            state: { pattern: ["idle"], step: 0 },
            phases: {
              idle: {
                cue: "The mesh vibrates.",
                weakness: "kill",
                damageMsg: "Error.",
                failMsg: "No effect.",
              },
            },
          },
        },
        secret_room: {
          id: "secret_room",
          name: "The Backrooms",
          description: "You shouldn't be here.",
          exits: {
            south: "start",
          },
        },
      },
    },
  ],
};
