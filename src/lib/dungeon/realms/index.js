import gen1 from "./data/gen-1.js";
import { PlatformerState, GENRES } from "./mechanics.js";
import { dungeon, writeLog } from "../store.svelte.js";

// Registry of supported realms
const REALM_REGISTRY = {
  "gen-1": gen1,
};

/**
 * Attempts to enter a Game Realm
 * @param {string} gameId
 * @returns {boolean} success
 */
export function enterRealm(gameId) {
  const definition = REALM_REGISTRY[gameId];

  if (!definition) {
    writeLog("The cartridge refuses to boot. It seems inert.");
    return false;
  }

  writeLog("Initializing Neural Link...", "dim");
  setTimeout(() => {
    writeLog("═══════════════════════════════════════════════════════════");
    writeLog(`  ENTERING: ${definition.metadata.title.toUpperCase()}`);
    writeLog(`  Platform: ${definition.metadata.platform}`);
    writeLog("═══════════════════════════════════════════════════════════");

    // Initialize State based on Genre
    let state;
    switch (definition.mechanics.type) {
      case GENRES.PLATFORMER:
        state = new PlatformerState(
          definition.realmId,
          definition.mechanics.stats.lives
        );
        break;
      default:
        state = { realmId: definition.realmId, ...definition.mechanics.stats };
    }

    // Set starting phase
    state.phaseIndex = 0;
    state.locationId = definition.entry.location || "start";

    // Commit to global store
    dungeon.realm = {
      active: true,
      gameId: gameId,
      state: state,
    };

    // Show Entry Description
    writeLog(definition.entry.description);
    if (definition.entry.tutorialHints) {
      definition.entry.tutorialHints.forEach((hint) =>
        writeLog(`Hint: ${hint}`, "dim")
      );
    }

    // Auto-look at first location
    setTimeout(() => handleRealmLook(), 500);
  }, 1000);

  return true;
}

/**
 * Processes commands when inside a realm
 * @param {string} input
 */
export function processRealmCommand(input) {
  const realm = dungeon.realm;
  const def = REALM_REGISTRY[realm.gameId];
  const phase = def.phases[realm.state.phaseIndex]; // Keep phase as const, key lookups

  // Resolve location
  let locId = realm.state.locationId;
  if (locId === "start_line") locId = "start";
  const location = phase.locations[locId];

  // Handle EXIT
  if (input.toLowerCase() === "exit") {
    writeLog("EMERGENCY EXIT SEQUENCE INITIATED...");
    dungeon.realm = null; // Exit
    writeLog("You wake up on the floor of the dungeon.");
    return;
  }

  // Handle LOOK
  if (input.toLowerCase() === "look" || input.toLowerCase() === "l") {
    handleRealmLook();
    return;
  }

  // Handle HELP
  if (input.toLowerCase() === "help") {
    writeLog("Realm Commands: RUN, JUMP, SPIN, DUCK, LOOK, EXIT", "info");
    return;
  }

  // BOSS BATTLE INTERCEPT
  // Check if we have an active boss state
  if (realm.state.activeBoss) {
    handleBossBattle(input, realm.state.activeBoss, realm.state, def);
    return;
  }

  // 1. Check Genre Mechanics (Actions)
  const action = input.toLowerCase().split(" ")[0]; // Simple verb parsing
  const mechanics = def.mechanics;

  if (mechanics.actions[action]) {
    // Execute Genre Action
    handleAction(action, input, location, realm.state, def);
    return;
  }

  // 2. Check Exits (Movement)
  if (location.exits && location.exits[action]) {
    const nextLocId = location.exits[action];
    transitionLocation(nextLocId, realm.state, phase);
    return;
  }

  // 3. Navigation aliases
  if (action === "go" && input.split(" ")[1]) {
    const dir = input.split(" ")[1];
    if (location.exits && location.exits[dir]) {
      transitionLocation(location.exits[dir], realm.state, phase);
      return;
    }
  }

  writeLog("Action not recognized in this reality.");
}

function handleRealmLook() {
  const realm = dungeon.realm;
  const def = REALM_REGISTRY[realm.gameId];
  const phase = def.phases[realm.state.phaseIndex];

  // Map "start_line" to "start" if needed, simplified logic
  let locId = realm.state.locationId;
  if (locId === "start_line") locId = "start";

  const location = phase.locations[locId];

  if (!location) {
    writeLog("ERROR: Lost in the void. (Invalid Location ID)", "error");
    return;
  }

  writeLog(`[ ${location.name} ]`, "info");
  writeLog(location.description);

  // Status Display (HUD)
  if (realm.state.stats) {
    const hud = Object.entries(realm.state.stats)
      .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
      .join(" | ");
    writeLog(hud, "dim");
  }

  // Initialize Boss if present and not already active or defeated
  if (location.boss && !realm.state.flags[`boss_${location.id}_defeated`]) {
    if (!realm.state.activeBoss) {
      // Clone boss state to realm state
      realm.state.activeBoss = JSON.parse(JSON.stringify(location.boss));
      writeLog("WARNING: BOSS DETECTED!", "error");
      writeLog(realm.state.activeBoss.name.toUpperCase() + " approaches!");
    }

    // Boss HUD
    const boss = realm.state.activeBoss;
    const hpBar = "█".repeat(boss.hp) + "░".repeat(8 - boss.hp); // Assuming max 8
    writeLog(`BOSS HP: [${hpBar}]`, "error");

    // Show Cue
    const currentPhaseName = boss.state.pattern[boss.state.step];
    const currentPhase = boss.phases[currentPhaseName];
    if (currentPhase) {
      writeLog(`ACTION: ${currentPhase.cue}`, "response");
    }
  }

  // Exits
  if (location.exits) {
    const exits = Object.keys(location.exits)
      .map((k) => k.toUpperCase())
      .join(", ");
    writeLog(`Exits: ${exits}`, "dim");
  }
}

function handleBossBattle(input, boss, state, def) {
  const action = input.toLowerCase().split(" ")[0];

  // Get Current Logic
  const currentPhaseName = boss.state.pattern[boss.state.step || 0];
  const phaseLogic = boss.phases[currentPhaseName];

  if (!phaseLogic) {
    writeLog("The boss malfunctions...", "error");
    state.activeBoss = null;
    return;
  }

  let hit = false;
  let playerDamage = false;

  // Evaluate Action
  // Supports weakness (primary) and weaknessAlt (secondary/risky)
  if (action === phaseLogic.weakness) {
    hit = true;
    writeLog(phaseLogic.damageMsg, "success");
  } else if (action === phaseLogic.weaknessAlt) {
    // 50/50 chance for Alt? Or just hit? Let's say hit for now but less damage?
    // Simplified: Hit.
    hit = true;
    writeLog(phaseLogic.damageMsg, "success");
  } else {
    // Fail
    playerDamage = true;
    writeLog(phaseLogic.failMsg, "error");
    if (state.stats.rings > 0) {
      writeLog("You lost all your rings!", "error");
      state.stats.rings = 0;
    } else {
      writeLog("You take a direct hit!", "error");
      state.stats.lives -= 1;
    }
  }

  // Apply Changes
  if (hit) {
    boss.hp -= 1;
  }

  // Check Death
  if (boss.hp <= 0) {
    writeLog("The vehicle explodes in a shower of 16-bit debris!", "success");
    // Clear Boss
    state.activeBoss = null;
    state.flags[`boss_${state.locationId}_defeated`] = true;

    // Proceed to End Phase or Reward
    completePhase(state, def);
    return;
  }

  // Check Player Death
  if (state.stats.lives < 0) {
    writeLog("GAME OVER", "error");
    dungeon.realm = null; // Kick out
    return;
  }

  // Next Step in Pattern
  boss.state.step = (boss.state.step + 1) % boss.state.pattern.length;

  // Announce Next Phase
  const nextPhaseName = boss.state.pattern[boss.state.step];
  const nextPhase = boss.phases[nextPhaseName];

  // Add a small delay for dramatic effect? No, sync is better for text.
  writeLog(`The boss prepares to ${nextPhaseName.toUpperCase()}...`);
  writeLog(nextPhase.cue, "response");
}

function handleAction(action, fullInput, location, state, def) {
  let success = false;

  // Check location specific interactions (Standard)
  if (location.interactions) {
    const interaction = location.interactions.find((i) => {
      if (i.weakness && i.weakness.includes(action)) {
        return true;
      }
      if (i.action === action) return true;
      return false;
    });

    if (interaction) {
      writeLog(
        interaction.onDefeat || interaction.msg || interaction.description
      );

      // Apply effects
      if (interaction.onCollect) {
        state.stats[interaction.onCollect.stat] += interaction.onCollect.value;
        writeLog(interaction.onCollect.msg, "success");
      }

      // Remove interaction (one-time?)
      location.interactions = location.interactions.filter(
        (x) => x !== interaction
      );
      success = true;
    }
  }

  if (!success) {
    // Check Traversal/Skill Checks

    // 1. Loop Section Check
    if (location.id === "loop_section") {
      if (action === "run") {
        writeLog("You gather incredible speed and defy gravity!");
        transitionLocation(
          location.exits.forward,
          state,
          def.phases[state.phaseIndex]
        );
        return;
      } else if (["jump", "spin", "go"].includes(action)) {
        writeLog("You don't have enough momentum! You slide back down.", "dim");
        // Maybe return to start?
        transitionLocation("start", state, def.phases[state.phaseIndex]);
        return;
      }
    }

    // 2. Goal Plate Check
    if (location.id === "goal" && action === "spin") {
      writeLog("You spin past the signpost!");
      completePhase(state, def);
      return;
    }

    // Generic flavor text if no specific logic triggered
    const flavor = def.mechanics.actions[action];
    if (flavor) writeLog(flavor.description);
    else writeLog("You can't do that here.");
  }
}

function transitionLocation(nextLocId, state, phase) {
  state.locationId = nextLocId;
  handleRealmLook();
}

function completePhase(state, def) {
  writeLog("★ PHASE COMPLETE ★", "success");
  // Move to next phase or finish
  state.phaseIndex++;
  if (state.phaseIndex >= def.phases.length) {
    // Realm Complete
    writeLog("═══════════════════════════════════════════════════════════");
    writeLog("  REALM CONQUERED!");
    writeLog("═══════════════════════════════════════════════════════════");
    writeLog(def.exit.description);
    dungeon.realm = null; // Exit

    // Give rewards
    // For now, let's just create a generic reward token in inventory
    const reward = {
      id: "dungeon_key_1",
      name: "Dungeon Key fragment",
      type: "KEY",
      description: "A piece of a larger key.",
    };
    // Ensure inventory exists (it's in dungeon module scope, not passed here)
    if (dungeon.inventory) dungeon.inventory.push(reward);
    writeLog(`You obtained: ${reward.name}`, "success");
  } else {
    // Next Phase
    const nextPhase = def.phases[state.phaseIndex];
    writeLog(`Entering: ${nextPhase.name}`);
    state.locationId = "start"; // Reset to start of next phase
    state.activeBoss = null; // Clear boss state for new phase

    // Auto look
    setTimeout(handleRealmLook, 1000);
  }
}
