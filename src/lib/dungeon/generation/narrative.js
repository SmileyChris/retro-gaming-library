export const NARRATIVE_TEMPLATES = {
  THREATS: [
    {
      id: "BIT_ROT",
      name: "The Bit Rot",
      description: "A digital decay eating the world.",
      flavor: {
        ambient: "Pixels flicker and decay into static.",
        room: "The walls are crumbling into raw hex code.",
        enemy: "It looks corrupted by the Rot.",
      },
    },
    {
      id: "CORP_TAKEOVER",
      name: "The DRM Enforcers",
      description: "A corporate algorithmic takeover.",
      flavor: {
        ambient: "Drones buzz overhead, scanning for unauthorized fun.",
        room: "Posters warn: 'PIRACY IS THEFT'. The lighting is sterile white.",
        enemy: "It bears the holographic seal of The Corp.",
      },
    },
    {
      id: "SERVER_WIPE",
      name: "The Great Wipe",
      description: "An impending deletion of all data.",
      flavor: {
        ambient: "A countdown timer is etched into your vision.",
        room: "The environment looks temporary, like a cache waiting to clear.",
        enemy: "It seems desperate, running from the void.",
      },
    },
  ],
  GUIDES: [
    {
      id: "ARCHIVIST",
      name: "The Archivist",
      intro: "A dusty, hooded figure tending to the racks.",
      goal: "Preserve the history.",
    },
    {
      id: "AI_GHOST",
      name: "Echo-7",
      intro: "A flickering hologram of a forgotten NPC.",
      goal: "Find its source code.",
    },
    {
      id: "HACKER",
      name: "ZeroCool",
      intro: "A masked figure typing furiously on a floating keyboard.",
      goal: "Crash the system.",
    },
  ],
  ARTIFACTS: [
    { name: "The Gold Cartridge", type: "MYSTIC" },
    { name: "The Root Password", type: "TECH" },
    { name: "The Developer's Key", type: "META" },
  ],
};

export function generateNarrative(seed = Date.now()) {
  // Simple PRNG
  const random = (idx) => {
    const x = Math.sin(seed + idx) * 10000;
    return x - Math.floor(x);
  };

  const threatIdx = Math.floor(random(1) * NARRATIVE_TEMPLATES.THREATS.length);
  const guideIdx = Math.floor(random(2) * NARRATIVE_TEMPLATES.GUIDES.length);
  const artifactIdx = Math.floor(
    random(3) * NARRATIVE_TEMPLATES.ARTIFACTS.length
  );

  return {
    threat: NARRATIVE_TEMPLATES.THREATS[threatIdx],
    guide: NARRATIVE_TEMPLATES.GUIDES[guideIdx],
    artifact: NARRATIVE_TEMPLATES.ARTIFACTS[artifactIdx],
    seed,
  };
}
