import { GENRES } from "../mechanics.js";

export default {
  realmId: "rpg_chronicles_1",
  metadata: {
    title: "Final Fantasy: Crystal Chronicles (Demake)",
    platform: "SNES",
    year: 1994,
  },
  mechanics: {
    type: GENRES.RPG,
    stats: {
      hp: 50,
      maxHp: 50,
      mp: 20,
    },
    actions: {
      attack: {
        description: "You swing your sword.",
        msg: "SLASH! 10 Damage.",
        effect: (state) => {
          // Logic for simple combat if an enemy is present?
          // Or we just rely on boss battle intercept?
          // If we want random encounters, we need an 'encounter' system.
          // For prototype, let's just make it flavor unless inside a boss battle.
          return "You attack the darkness.";
        },
      },
      magic: {
        description: "You cast FIRE.",
        msg: "FWOOSH! 20 Damage. (Cost 5 MP)",
        effect: (state) => {
          if (state.stats.mp >= 5) {
            state.stats.mp -= 5;
            return "Cast Fire!";
          }
          return "Not enough MP!";
        },
      },
      heal: {
        description: "You cast CURE.",
        msg: "HP Restored.",
        effect: (state) => {
          if (state.stats.mp >= 10) {
            state.stats.mp -= 10;
            state.stats.hp = Math.min(state.stats.maxHp, state.stats.hp + 20);
            return "You feel refreshed. (HP: " + state.stats.hp + ")";
          }
          return "Not enough MP!";
        },
      },
    },
  },
  entry: {
    location: "start",
    description:
      "You stand before the Crystal Tower. A save point glimmers nearby.",
    tutorialHints: ["ATTACK enemies.", "Use MAGIC for elemental damage."],
  },
  exit: {
    description: "You defeated the Dark Knight and restored the Crystal.",
  },
  phases: [
    {
      name: "The Tower Climb",
      locations: {
        start: {
          id: "start",
          name: "Tower Entrance",
          description: "A large gate stands before you.",
          exits: {
            north: "floor_1",
          },
        },
        floor_1: {
          id: "floor_1",
          name: "Goblin Camp",
          description: "Goblins are roasting a rat.",
          exits: {
            south: "start",
            north: "boss_room",
          },
          // Mini-boss or simple interaction?
          interactions: [
            {
              action: "attack",
              description: "You surprise the Goblins.",
              onDefeat: "The Goblins scatter!",
              onCollect: { stat: "exp", value: 10, msg: "You gained 10 EXP." },
            },
          ],
        },
        boss_room: {
          id: "boss_room",
          name: "Throne Room",
          description: "The Dark Knight awaits.",
          boss: {
            name: "Dark Knight",
            hp: 5,
            state: { pattern: ["taunt", "slash", "darkness"], step: 0 },
            phases: {
              taunt: {
                cue: "The Knight laughs. (Open to ATTACK)",
                weakness: "attack",
                damageMsg: "Direct hit!",
                failMsg: "He ignored you.",
              },
              slash: {
                cue: "The Knight raises his sword! (HEAL or DEFEND?)",
                weakness: "heal",
                damageMsg: "You healed just in time!",
                failMsg: "Slash! You took damage.",
              },
              darkness: {
                cue: "He gathers dark energy! (Use MAGIC!)",
                weakness: "magic",
                damageMsg: "The Light burns him!",
                failMsg: "Darkness consumes you.",
              },
            },
          },
        },
      },
    },
  ],
};
