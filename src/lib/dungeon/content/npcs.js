export const NPC_ROSTER = [
  {
    id: "archivist",
    name: "The Archivist",
    shortDescription: "an elderly figure composed of code",
    ambient: [
      "adjusts his spectral glasses.",
      "mutters about bit rot.",
      "reaches out to touch a floating polygon.",
    ],
    aliases: ["archivist", "old man", "keeper"],
    description:
      "An elderly figure composed of floating green code fragments. He adjusts his spectacles, which are actually just zeros.",
    zoneId: "ARCADE", // Matches ZONES.ARCADE_ATRIUM.id
    dialogue: {
      default: [
        "Welcome to the constructs, user.",
        "Data has been decaying lately. Sad to see.",
        "Have you visited the RPG Archives? A quiet place.",
      ],
      topics: {
        glitch: "Ah, the corruption. Don't touch it.",
        games: "Artifacts of a bygone era. We preserve them.",
        key: "Keys are often hidden in the code.",
      },
    },
    quests: [
      {
        id: "archivist_starter",
        title: "The Preservationist",
        req: { trust: 0 },
        startText:
          "The digital entropy is consuming the library. We need to stabilize the core code. Go into the Atrium and retrieve 5 Game Cartridges to prove you can handle the data artifacts.",
        endText:
          "Splendid! These stable data structures will hold back the rot for now. Take this key to the elevator.",
        reward: { type: "KEY", id: "key_level_1", name: "Elevator Key" },
        condition: (inventory) => {
          const games = inventory.filter((i) => i.type === "GAME");
          return games.length >= 5 ? games.slice(0, 5) : null;
        },
      },
    ],
  },
  {
    id: "glitch",
    name: "The Glitch",
    shortDescription: "a flickering shadow",
    ambient: [
      "spasms uncontrollably.",
      "fades in and out of existence.",
      "whispers static noise.",
    ],
    aliases: ["glitch", "error", "ghost"],
    description:
      "A flickering shadow that seems to be missing textures. It hurts to look at.",
    zoneId: "WARZONE",
    dialogue: {
      default: [
        "01001000elp me...",
        "It's not a bug, it's a f-feature...",
        "*static noises*",
      ],
      topics: {
        archivist: "He... wants to d-delete me.",
        bug: "I am not a bug! I am undefined!",
      },
    },
  },
  {
    id: "merchant",
    name: "Retro Rob",
    shortDescription: "a shopkeeper sprite",
    ambient: [
      "counts his inventory.",
      "polishes a cartridge.",
      "hums a familiar chip-tune.",
    ],
    aliases: ["rob", "merchant", "shop"],
    description: "A 16-bit sprite of a shopkeeper wearing a bandana.",
    zoneId: "PEAKS",
    dialogue: {
      default: [
        "Got some rare gems tailored for ya!",
        "No refunds, pixel perfect guarantees only.",
        "Looking for cheat codes?",
      ],
      topics: {
        buy: "I'm not selling anything yet, dev hasn't implemented currency!",
        gem: "Hidden gems are worth a lot of rep.",
      },
    },
    quests: [
      {
        id: "merchant_fetch_gem",
        title: "The Lost Gem",
        req: { trust: 0 },
        startText:
          "Hey, I lost a rare 'gem' quality game in the Arcade. Find one for me?",
        endText:
          "You found one! You're a legend. Here, take this old console I repaired. It plays those 'Blast Processing' games.",
        reward: {
          type: "CONSOLE",
          id: "console_genesis",
          name: "Sega Genesis",
          supported: ["genesis", "megadrive"],
          games: [],
        },
        condition: (inventory) =>
          inventory.find((i) => i.metadata && i.metadata.gem),
      },
    ],
  },
  {
    id: "speedrunner",
    name: "Speedrunner Sam",
    shortDescription: "a jittery racer",
    ambient: [
      "checks her split times.",
      "practices frame-perfect jumps.",
      "vibrates with caffeine energy.",
    ],
    aliases: ["sam", "runner", "speedrunner"],
    description:
      "She's vibrating with caffeine energy. She keeps checking her splits on a floating timer.",
    zoneId: "SPEED_CIRCUIT",
    dialogue: {
      default: [
        "Gotta go fast!",
        "I think I can clip through this wall if I try hard enough.",
        "Frame perfect inputs, that's the secret.",
      ],
      topics: {
        fast: "Movement tech is everything.",
        record: "I'm chasing the WR for Super Metroid.",
      },
    },
    quests: [
      {
        id: "sam_fetch_racing",
        title: "Need for Speed",
        req: { trust: 0 },
        startText:
          "Yo! I need a Racing game to practice my lines. Any racing game will do!",
        endText: "Sick! This will shave seconds off my time. Thanks!",
        reward: { type: "KEY", id: "turbo_key", name: "Turbo Pass" },
        condition: (inventory) =>
          inventory.find(
            (i) =>
              i.metadata &&
              i.metadata.genres &&
              i.metadata.genres.some((g) => g.toLowerCase().includes("racing"))
          ),
      },
    ],
  },
  {
    id: "lorekeeper",
    name: "Keeper of Lore",
    shortDescription: "a hooded figure",
    ambient: [
      "reads from a dusty tome.",
      "rolls a 20-sided die.",
      "adjusts their robes.",
    ],
    aliases: ["keeper", "lore", "wizard"],
    description:
      "A hooded figure referencing a dusty tome. They smell like old paper and dice.",
    zoneId: "RPG_ARCHIVES",
    dialogue: {
      default: [
        "Roll for initiative.",
        "The stories here are ancient. Handle with care.",
        "I used to be an adventurer like you.",
      ],
      topics: {
        quests: "Real life fetch quests are boring. Give me a dragon to slay.",
        magic: "Sufficiently advanced technology, etc etc.",
      },
    },
    quests: [
      {
        id: "lore_fetch_rpg",
        title: "The Missing Chronicle",
        req: { trust: 0 },
        startText:
          "My collection is incomplete. I seek a Role-Playing Game of great depth.",
        endText: "Ah, a fine addition to the archives. Your wisdom grows.",
        reward: { type: "KEY", id: "mystic_key", name: "Rune Key" },
        condition: (inventory) =>
          inventory.find(
            (i) =>
              i.metadata &&
              i.metadata.genres &&
              i.metadata.genres.some((g) =>
                g.toLowerCase().includes("role-playing")
              )
          ),
      },
    ],
  },
];
