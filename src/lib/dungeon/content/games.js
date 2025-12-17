import { allGames } from "../../data.js";

// We just re-export the games from the main data source for now,
// but this file serves as the abstraction layer if we want to add Dungeon-specific metadata
// (like 'cursed', 'weight', 'value') without polluting the main app data.

const DESCRIPTION_OVERRIDES = {
  // SNES
  "snes-1":
    "The cartridge vibrates with the ticking of an unseen clock. It feels like time stands still when you hold it.", // Chrono Trigger
  "snes-3":
    "This artifact feels heavier than the others. It hums with a deep, alien resonance.", // Super Metroid
  "snes-4":
    "It shines with a golden luster. A triangular crest is etched into the plastic.", // Zelda ALTTP
  "snes-25": "You can smell burning rubber coming from the connector pins.", // Mario Kart
  "snes-6":
    "The plastic feels sticky, like honey. It smells faintly of ozone and quirkiness.", // Earthbound

  // Genesis
  "gen-1": "It vibrates with kinetic energy. It's hard to hold still.", // Sonic 2
  "gen-17": "The edge of the cartridge is razor sharp.", // Strider
  "gen-27": "It is cold and damp to the touch. You hear distant sonar pings.", // Ecco

  // GBA
  "gba-3":
    "The translucent green plastic glows faintly with the power of nature.", // Emerald
  "gba-1": "The cartridge is cold and metallic. It feels infectious.", // Metroid Fusion
  "gba-7": "It radiates a warm, solar heat.", // Golden Sun

  // PS1
  "ps1-3": "The disc is cold as ice. A gothic aura surrounds it.", // SOTN
  "ps1-1": "It pulses with a faint green lifestream energy.", // FF7
  "ps1-5":
    "The surface is grimy. You hear breathless moans when you hold it close.", // RE2

  // N64
  "n64-1": "An ancient melody seems to drift from the plastic casing.", // Ocarina
  "n64-2": "It feels lighter than air, as if it wants to jump.", // Mario 64
};

const REALM_GAMES = [
  "snes-5", // Super Mario World
  "gen-1", // Sonic 2
  "ps1-1", // FF7
  "n64-1", // Ocarina
  "gba-3", // Pokemon Emerald
];

export const DUNGEON_GAMES = allGames.map((game) => {
  let desc = DESCRIPTION_OVERRIDES[game.id];
  if (!desc) {
    // Procedural fallback
    if (game.genres.includes("Horror"))
      desc = "A chilled artifact. It whispers when you aren't looking.";
    else if (game.genres.includes("RPG"))
      desc = "A dense tome of digital history.";
    else if (game.genres.includes("Racing"))
      desc = "It smells of burnt rubber and adrenaline.";
    else desc = "A standard data cartridge from the old world.";
  }

  return {
    ...game,
    description: desc, // Override the 'notes' with our lore
    dungeonProps: {
      weight: 1,
      value: game.gem ? 100 : 10,
      hasRealm: REALM_GAMES.includes(game.id),
    },
  };
});

// Inject Special Hacking Cartridge
DUNGEON_GAMES.push({
  id: "glitch_layer_alpha",
  name: "Corrupted_Save.hex",
  platform: "PC-98",
  genres: ["Hacking", "Glitch"],
  description: "A rectangular slab of black plastic. It feels warm.",
  notes: "System Critical",
  gem: false,
  libretroName: "N/A",
  dungeonProps: {
    weight: 0,
    value: 9999,
    hasRealm: true,
  },
});

DUNGEON_GAMES.push({
  id: "debug_access_tool",
  name: "QA_Internal_Build",
  platform: "DEV_KIT",
  genres: ["Debug", "Dev"],
  description:
    "A plain gray cartridge with 'PROPERTY OF DEV TEAM' written in marker. It seems to unlock Debug Mode.",
  notes: "Developer Use Only",
  gem: false,
  libretroName: "N/A",
  dungeonProps: {
    weight: 0,
    value: 0,
    hasRealm: true,
  },
});
