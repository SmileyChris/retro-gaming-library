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
  constructor(realmId) {
    super(realmId);
    this.stats = {
      hp: 100,
      maxHp: 100,
      mp: 20,
      gold: 0,
      level: 1,
      exp: 0,
    };
    this.party = [];
    this.inventory = [];
  }
}
