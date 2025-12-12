export const ZONES = {
  ARCADE_ATRIUM: {
    id: "ARCADE",
    name: "The Arcade Atrium",
    genres: ["Action", "Arcade", "Platformer"],
    flavor: [
      "Neon lights flicker overhead.",
      "The air smells of ozone and cheap pizza.",
      "You hear the faint jingle of tokens spilling onto the floor.",
    ],
  },
  PLATFORMER_PEAKS: {
    id: "PEAKS",
    name: "Platformer Peaks",
    genres: ["Platformer"],
    flavor: [
      "Clouds drift below your feet.",
      "Floating islands stretch into the distance.",
      "Pipes protrude from the landscape at odd angles.",
    ],
  },
  RPG_ARCHIVES: {
    id: "RPG_ARCHIVES",
    name: "The RPG Archives",
    genres: ["RPG", "Strategy"],
    flavor: [
      "Dust motes dance in the shafts of light.",
      "Endless shelves of dusty tomes line the walls.",
      "A mystical silence hangs in the air.",
    ],
  },
  SPEED_CIRCUIT: {
    id: "SPEED_CIRCUIT",
    name: "Speed Circuit",
    genres: ["Racing", "Sports"],
    flavor: [
      "The roar of engines echoes in the distance.",
      "Checkered flags flap in the wind.",
      "Smell of burning rubber and asphalt.",
    ],
  },
  PIXEL_WARZONE: {
    id: "WARZONE",
    name: "The Pixel Warzone",
    genres: ["Shooter", "Fighting", "Beat-Em-Up", "Action"],
    flavor: [
      "You stand in a cratered landscape where the sky burns with static fire. Distant explosions rattle your teeth.",
      "This sector is a ruin of digital concrete and twisted sprites. The air smells of burnt silicon and ozone.",
      "A desolate battlefield stretches out. Glitched tanks rust in the digital wind.",
    ],
  },
  PUZZLE_PALACE: {
    id: "PALACE",
    name: "Puzzle Palace",
    genres: ["Puzzle"],
    flavor: [
      "The walls here shift when you aren't looking. Logic seems to be the only law.",
      "A room of floating geometric shapes. The floor is a chessboard that stretches to infinity.",
      "Mirrors line every surface, but some reflect things that aren't there.",
    ],
  },
  THE_BASEMENT: {
    id: "BASEMENT",
    name: "The 8-Bit Basement",
    genres: ["Action", "Adventure"], // Fallback for older games
    flavor: [
      "It's dark and damp down here. The only light comes from the blinking LEDs of ancient server racks.",
      "Cobwebs specifically made of 8-bit silk drape over piles of forgotten CRTs.",
      "The hum of a generator provides a low, rhythmic bassline to the silence.",
    ],
  },
};

export const ROOM_TEMPLATES = {
  ENTRANCE: {
    name: "Zone Entrance",
    description: "A large gateway marking the start of a new area.",
  },
  HALLWAY: {
    name: "Corridor",
    description: "A long connector.",
  },
  HUB: {
    name: "Central Hub",
    description: "A wide open space with many paths.",
  },
  SECRET: {
    name: "Hidden Alcove",
    description: "A secret place that shouldn't be here.",
  },
};
