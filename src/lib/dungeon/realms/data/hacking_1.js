import { GENRES } from "../mechanics.js";

export default {
  realmId: "glitch_layer_alpha",
  metadata: {
    title: "Corrupted_Save.hex",
    platform: "PC-98",
    year: "19XX",
  },
  mechanics: {
    type: GENRES.HACKING,
    stats: {
      cpu: 100,
      ram: 64,
      accessLevel: 0,
    },
    actions: {
      edit: {
        description:
          "Modify object properties. Usage: EDIT [target] [property] [value]",
        effect: (state, input) => {
          const parts = input.split(" ");
          // edit door locked false -> [edit, door, locked, false]
          if (parts.length < 4)
            return "Usage: EDIT [target] [property] [value]";

          const target = parts[1].toLowerCase();
          const prop = parts[2].toLowerCase();
          const val = parts[3].toLowerCase();

          // Check context. We need to know if 'door' is valid.
          // But we don't have access to 'location' here easily unless we pass it?
          // index.js passes (state, fullInput).
          // I should update it to pass (state, fullInput, location).

          // Assuming I fix index.js again:
          // For now, let's just implement a global check or rely on state flags.

          if (target === "door" && prop === "locked") {
            if (val === "false") {
              state.flags["firewall_down"] = true;
              return "Object 'door' updated. LOCKED = FALSE.";
            }
          }
          return "Error: Object or Property not found.";
        },
      },
      scan: {
        description: "Reveal object properties.",
        msg: "Scanning...",
      },
    },
  },
  entry: {
    location: "start",
    description: "The world is wireframes and static. 0x45 ERROR.",
    tutorialHints: [
      "SCAN objects to find properties.",
      "EDIT properties to bypass obstacles.",
    ],
  },
  exit: {
    description: "System Restored. You patched the glitch.",
  },
  phases: [
    {
      name: "Memory Sector 0",
      locations: {
        start: {
          id: "start",
          name: "Null Pointer",
          description: "A large door blocks the way. It glows red.",
          exits: {
            north: "kernel_space",
          },
          interactions: [
            {
              action: "scan",
              description:
                "Target: DOOR. Properties: { locked: true, id: 'firewall' }",
            },
          ],
        },
        kernel_space: {
          id: "kernel_space",
          name: "Kernel Space",
          description: "Safe mode active.",
          interactions: [
            {
              action: "scan",
              description: "Target: SYSTEM. Properties: { status: 'secure' }",
            },
            {
              action: "patch",
              description: "You upload the fix. System stabilizing...",
              completesRealm: true,
            },
          ],
        },
      },
    },
  ],
};
