import { GENRES } from "../mechanics.js";

export default {
  realmId: "speedrunner_track_1",
  metadata: {
    title: "Super Sonic Racing 64",
    platform: "N64",
    year: 1997,
  },
  mechanics: {
    type: GENRES.RACING,
    stats: {
      speed: 0,
      momentum: 0,
      lap: 1,
      time: 0,
    },
    actions: {
      run: {
        description: "You sprint forward!",
        msg: "Speed increasing!",
        effect: (state) => {
          state.stats.speed += 20;
          state.stats.momentum += 10;
          if (state.stats.speed > 100) state.stats.speed = 100;
          return `Current Speed: ${state.stats.speed} km/h`;
        },
      },
      brake: {
        description: "You skid to a halt.",
        msg: "Screeech!",
        effect: (state) => {
          state.stats.speed = 0;
          state.stats.momentum = 0;
          return "Stopped.";
        },
      },
      jump: {
        description: "You leap!",
        msg: "HUP!",
        effect: (state) => {
          if (state.stats.momentum > 20) {
            return "A massive long jump!";
          }
          return "A short hop.";
        },
      },
    },
  },
  entry: {
    location: "start",
    description: "The starting grid. Engines are revving.",
    tutorialHints: ["RUN to build Momentum.", "Don't stop moving."],
  },
  exit: {
    description: "New Record! You crossed the finish line in first place.",
  },
  phases: [
    {
      name: "Lap 1",
      locations: {
        start: {
          id: "start",
          name: "Starting Grid",
          description: "Go! Go! Go!",
          exits: {
            north: "straightaway",
          },
        },
        straightaway: {
          id: "straightaway",
          name: "Long Straight",
          description: "A perfect place to build speed.",
          exits: {
            south: "start",
            north: "loop_section",
          },
        },
        loop_section: {
          id: "loop_section",
          name: "The Great Loop",
          description:
            "A massive vertical loop. You need high SPEED to clear it.",
          exits: {
            forward: "finish_line", // Special exit handle in index.js
          },
          // Note: index.js has hardcoded check for "loop_section" and "run" command logic.
          // We should ideally move that logic here into an interaction or 'onEnter' check?
          // But for now we rely on the existing hardcode or generalize it.
          // The existing code:
          // if (location.id === "loop_section") { if (action === "run") ... }
        },
        finish_line: {
          id: "finish_line",
          name: "Finish Line",
          description: "The checkered flag waves!",
          interactions: [
            {
              action: "spin", // Victory pose?
              description: "You spin across the line!",
              // Trigger completion logic?
              // index.js has hardcoded check for "goal" id and "spin" action.
              // This location id is "finish_line".
              // I should probably stick to the hardcoded ID "goal" or update index.js check.
              // Let's rely on standard interaction onDefeat/Logic?
              // Actually, let's update index.js to support generic 'WIN' trigger.
              onCollect: { stat: "lap", value: 1, msg: "Lap Complete!" },
            },
          ],
        },
      },
    },
  ],
};
