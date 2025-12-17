/**
 * mechanics.js
 * Base classes and logic for Realm Genre Mechanics
 */

export const GENRES = {
  PLATFORMER: "platformer",
  RPG: "rpg",
  RACING: "racing",
  FIGHTER: "fighter",
  ADVENTURE: "adventure",
  SHOOTER: "shooter",
  PUZZLE: "puzzle",
  STEALTH: "stealth",
  HACKING: "hacking",
  DEBUG: "debug",
};

export class RealmState {
  constructor(realmId) {
    this.realmId = realmId;
    this.phaseIndex = 0;
    this.locationId = "start";
    this.history = [];
    this.flags = {};
    // Generic stats container
    this.stats = {};
  }
}

export class PlatformerState extends RealmState {
  constructor(realmId, startingLives = 3) {
    super(realmId);
    this.stats = {
      lives: startingLives,
      rings: 0,
      coins: 0,
      score: 0,
      powerUp: null,
    };
  }
}

export class RPGState extends RealmState {
  constructor(realmId, initialStats = {}) {
    super(realmId);
    this.stats = {
      hp: 100,
      maxHp: 100,
      mp: 20,
      gold: 0,
      level: 1,
      exp: 0,
      ...initialStats,
    };
    this.party = [];
    this.inventory = [];
  }
}

export class StealthState extends RealmState {
  constructor(realmId) {
    super(realmId);
    this.stats = {
      alertLevel: 0, // 0-100
      noise: 0,
      hidden: false,
      items_stolen: 0,
    };
  }
}

export class RacingState extends RealmState {
  constructor(realmId) {
    super(realmId);
    this.stats = {
      speed: 0,
      momentum: 0,
      lap: 1,
      time: 0,
    };
  }
}

export class HackingState extends RealmState {
  constructor(realmId) {
    super(realmId);
    this.stats = {
      cpu: 100,
      ram: 64,
      accessLevel: 0, // Root = 10
      programs: [],
    };
  }
}

export class DebugState extends RealmState {
  constructor(realmId) {
    super(realmId);
    this.stats = {
      godMode: true,
      noclip: false,
    };
  }
}
