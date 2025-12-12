import { GENRES } from "../mechanics.js";

export default {
  gameId: "gen-1", // Sonic 2
  realmId: "sonic_2_realm",

  metadata: {
    title: "Sonic the Hedgehog 2",
    platform: "Sega Genesis",
    year: 1992,
    genre: GENRES.PLATFORMER,
    estimatedTime: "5-10 minutes",
    difficulty: 2,
  },

  mechanics: {
    type: GENRES.PLATFORMER,
    stats: {
      lives: 3,
      rings: 0,
      score: 0,
    },
    actions: {
      jump: {
        description: "Leap into the air / Attack enemies",
        contexts: ["gap", "platform", "enemy", "item_above"],
      },
      spin: {
        description: "Rev up a Spin Dash",
        contexts: ["slope", "wall", "enemy"],
      },
      run: {
        description: "Pick up speed",
        contexts: ["straightaway", "loop"],
      },
      duck: {
        description: "Crouch down to avoid high attacks",
        contexts: ["enemy", "obstacle"],
      },
    },
  },

  entry: {
    location: "start_line",
    description:
      "EMERALD HILL ZONE - ACT 1\n\nLush green grass checks against deep brown earth. Palm trees sway in the distance, and the blue ocean creates a perfect horizon. You feel the need... the need for speed.",
    tutorialHints: [
      "Type 'run' to build momentum.",
      "Type 'jump' to clear obstacles or smash badniks.",
      "Type 'duck' to crouch.",
      "Collect RINGS for protection.",
    ],
  },

  exit: {
    condition: "boss_defeat",
    description:
      "The capsule explodes, releasing a flock of flickies! You strike a pose as the zone clear music plays.",
    rewards: {
      completion: {
        tokens: 50,
        experience: 100,
      },
    },
  },

  phases: [
    {
      id: "act_1",
      name: "Emerald Hill Zone - Act 1",
      description: "A tropical paradise filled with loops and corkscrews.",
      locations: {
        start: {
          id: "start",
          name: "Start Line",
          description:
            "You stand at the beginning of the zone. A path stretches forward, looping vertically in the distance. A 'Masher' badnik patrols nearby.",
          exits: {
            forward: "loop_section",
          },
          interactions: [
            {
              target: "masher",
              type: "enemy",
              name: "Masher",
              description: "A piranha-like bot that jumps from below.",
              weakness: ["jump", "spin"],
              onDefeat:
                "You bop the Masher on the head, freeing a small squirrel.",
            },
            {
              target: "rings",
              type: "item",
              name: "Ring Cluster",
              quantity: 3,
              onCollect: {
                stat: "rings",
                value: 3,
                msg: "RING-RING-RING!",
              },
            },
          ],
        },
        loop_section: {
          id: "loop_section",
          name: "The Great Loop",
          description:
            "A massive corkscrew loop dominates the path. Requires significant speed to traverse.",
          exits: {
            forward: "hill_top",
            back: "start",
          },
          reqSpeed: "high", // mechanic hook
          interactions: [
            {
              target: "monitor",
              type: "breakable",
              name: "Item Monitor",
              contents: "shield",
              description: "A monitor with a blue orb icon.",
            },
          ],
        },
        hill_top: {
          id: "hill_top",
          name: "Hill Top",
          description:
            "The highest point of the act. You can see the goal plate far below.",
          exits: {
            down: "goal",
          },
          interactions: [],
        },
        goal: {
          id: "goal",
          name: "Goal Plate",
          description:
            "The spinning signpost featuring Robotnik's face waits for you.",
          endPhase: true, // Triggers next phase
          interactions: [
            {
              target: "signpost",
              type: "goal",
              action: "spin",
              msg: "You spin past the signpost, flipping it to Sonic's face!",
            },
          ],
        },
      },
    },
    {
      id: "boss_fight",
      name: "Boss: Drill Eggman",
      description: "Dr. Robotnik descends in his drill-mobile!",
      locations: {
        start: {
          id: "start",
          name: "Boss Arena",
          description:
            "A flat stretch of terrain. Robotnik's vehicle destroys the path behind you. He is preparing to charge!",
          exits: {},
          boss: {
            name: "Drill Eggman",
            hp: 8,
            state: {
              pattern: ["charge", "charge", "shoot", "laugh"],
              step: 0,
            },
            phases: {
              charge: {
                cue: "The drill car revs its engine and aims directly at you!",
                weakness: "jump",
                damageMsg: "You bounce off the cockpit as he rushes under you!",
                failMsg: "The drill strikes you! Rings scatter everywhere!",
              },
              shoot: {
                cue: "Robotnik locks onto your position, drill tip detaching!",
                weakness: "duck", // or move
                weaknessAlt: "jump", // risky but maybe hits?
                damageMsg: "You weave through the shots and land a hit!",
                failMsg: "You catch a laser blast to the face!",
              },
              laugh: {
                cue: "Robotnik slows down to gloat.",
                weakness: "spin",
                damageMsg: "You smash into the vehicle while he's distracted!",
                failMsg: "You hesitate and he speeds off again.",
              },
            },
          },
        },
      },
    },
  ],
};
