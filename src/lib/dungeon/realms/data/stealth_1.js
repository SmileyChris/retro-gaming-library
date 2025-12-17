import { GENRES } from "../mechanics.js";

export default {
  realmId: "stealth_mission_alpha",
  metadata: {
    title: "Metal Gear Solid: Ghost Babel",
    platform: "GBC",
    year: 2000,
  },
  mechanics: {
    type: GENRES.STEALTH,
    stats: {
      alertLevel: 0,
    },
    actions: {
      hide: {
        description: "You blend into the shadows.",
        msg: "You are now hidden.",
        effect: (state) => {
          state.stats.hidden = true;
          state.stats.noise = 0;
        }, // Logic handled in index.js? No, need eval support.
        // Current index.js mainly prints descriptions. Logic is hardcoded.
        // We need to enhance index.js or encode logic here.
      },
      sneak: {
        description: "You move silently.",
        msg: "You creep forward...",
      },
      distract: {
        description: "You knock on a wall.",
        msg: "Knock knock... The guard turns away.",
      },
    },
  },
  entry: {
    location: "start",
    description:
      "You drop into the cargo bay. Rain hammers against the roof. Guards patrol the catwalks.",
    tutorialHints: [
      "Use HIDE to avoid patrols.",
      "SNEAK past sleeping guards.",
    ],
  },
  exit: {
    description:
      "Mission Accomplished. You secured the package and exfiltrated.",
  },
  phases: [
    {
      name: "Infiltration",
      locations: {
        start: {
          id: "start",
          name: "Cargo Bay",
          description:
            "Stacks of crates provide cover. A guard patrols the NORTH exit.",
          exits: {
            north: "corridor_1",
          },
          interactions: [
            {
              action: "sneak", // If user types sneak north? or just sneak?
              // Current logic: action matches generic verb.
              // We need 'sneak north' support.
              // index.js handles 'go north'.
              // We need specific overrides.
            },
          ],
        },
        corridor_1: {
          id: "corridor_1",
          name: "Maintenance Corridor",
          description: "A long hallway with surveillance cameras.",
          exits: {
            south: "start",
            north: "server_room",
          },
        },
        server_room: {
          id: "server_room",
          name: "Server Room",
          description: "Humming racks of servers. The objective is here.",
          interactions: [
            {
              action: "hack",
              description: "You jack into the terminal.",
              msg: "Access Granted. Download complete.",
              onDefeat: "Download Complete.",
              onCollect: {
                stat: "items_stolen",
                value: 1,
                msg: "You got the Data Disk.",
              },
              // This triggers phases check in index.js usually via boss logic?
              // We need a 'Goal' trigger.
            },
          ],
        },
      },
    },
  ],
};
