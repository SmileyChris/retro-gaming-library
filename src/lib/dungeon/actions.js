// @ts-check
import { dungeon, writeLog } from "./store.svelte.js";
import { parseCommand } from "./parser.js";
import { executeCommand } from "./engine.js";

/**
 * @typedef {Object} ActionDef
 * @property {'message'|'spawn'|'destroy'|'modify'|'trigger'|'test'|'block'} type
 * @property {string} [content] - Message content
 * @property {'response'|'error'|'info'|'dim'|'success'} [style] - Message style
 * @property {Object} [item] - Item to spawn
 * @property {'inventory'|'room'} [location] - safe spawn location
 * @property {'self'|'tool'} [target] - Target for modify/destroy
 * @property {string} [targetId] - Specific item ID to target
 * @property {Object} [updates] - Properties to merge into target
 * @property {string} [verb] - trigger verb
 * @property {string} [msg] - block message
 * @property {TestDef} [req] - test requirement
 * @property {ActionDef[]} [then] - if test passes
 * @property {ActionDef[]} [else] - if test fails
 */

/**
 * @typedef {Object} TestDef
 * @property {'item'|'flag'} type
 * @property {string} id
 * @property {'tool'|'inventory'|'room'} [context]
 * @property {boolean} [value] - flag value
 */

/**
 * @typedef {Object} HandlerDef
 * @property {TestDef[]} [tests] - All must pass
 * @property {ActionDef[]} [actions] - Executed in order
 */

/**
 * Executes an interaction based on Verb, Target, and Optional Tool.
 * Handles implicit targeting and handler selection.
 * @param {string} verb - The command verb (USE, OPEN, TALK, etc.)
 * @param {string} targetName - The user's input string for the target (can be null/empty)
 * @param {string} toolName - The user's input string for the tool (can be null)
 * @returns {Promise<boolean>} - True if interaction was handled
 */
export async function executeInteraction(verb, targetName, toolName) {
  const room = dungeon.world.rooms[dungeon.currentRoom];

  // 1. Resolve Target
  let targetItem = null;

  if (targetName) {
    // Explicit Target
    const lower = targetName.toLowerCase();
    targetItem =
      dungeon.inventory.find((i) => matchItem(i, lower)) ||
      room.items.find((i) => matchItem(i, lower));

    if (!targetItem) {
      // Return false so caller (command) can print generic "Not found" message
      return false;
    }
  } else {
    // Implicit Target Inference
    // Find all visible items that have an interaction for this VERB
    const visibleItems = [...dungeon.inventory, ...room.items].filter(
      (i) => !i.hidden
    );
    const candidates = visibleItems.filter(
      (i) => i.interactions && i.interactions[verb]
    );

    // We strictly filter for candidates where a handler actually passes its tests?
    // That might be too expensive or dangerous (side effects in tests?).
    // Let's just assume if it HAS the verb, it's a candidate.

    if (candidates.length === 1) {
      targetItem = candidates[0];
      // Check if we need to infer tool too?
      // For now, implicit targeting usually implies direct use.
    } else if (candidates.length > 1) {
      writeLog(
        `Which one? (${candidates.map((i) => i.name).join(", ")})`,
        "dim"
      );
      return true; // We handled it by asking for clarification
    } else {
      return false; // No implicit candidates
    }
  }

  // 2. Resolve Tool (if provided)
  let toolItem = null;
  if (toolName) {
    const lower = toolName.toLowerCase();
    toolItem = dungeon.inventory.find((i) => matchItem(i, lower));
    if (!toolItem) {
      writeLog(`You don't have a '${toolName}'.`, "error");
      return true; // Handled error
    }
  }

  // 3. Find Matching Handler
  // A. Check if the Target itself handles the verb
  if (targetItem.interactions && targetItem.interactions[verb]) {
    const handlers = targetItem.interactions[verb];
    for (const handler of handlers) {
      const context = { target: targetItem, tool: toolItem, verb };
      // If we have a tool, we prioritize handlers that matches the tool?
      // Or we just pick the first valid one.
      // If I type "Use Cabinet" (tool=null), and handler requires tool -> fail test. (checkTests handles this).
      if (checkTests(handler.tests, context)) {
        await processActions(handler.actions, context);
        return true;
      }
    }
  }

  // B. Implicit Tool Inference (e.g. "Use Broom")
  // If the target didn't handle it, AND we didn't provide a separate tool...
  // Maybe the target IS the tool?
  // "Use Broom" -> target=Broom, tool=null.
  // We want to treat Broom as tool and infer target.
  if (!toolItem && targetItem) {
    // Treat target as tool
    const inferredTool = targetItem;
    const room = dungeon.world.rooms[dungeon.currentRoom];
    const visibleItems = [...dungeon.inventory, ...room.items].filter(
      (i) => i !== inferredTool && !i.hidden
    );

    const candidates = visibleItems.filter(
      (i) =>
        i.interactions &&
        i.interactions[verb] &&
        i.interactions[verb].some(
          (h) =>
            h.tests &&
            h.tests.some(
              (t) =>
                t.type === "item" &&
                t.context === "tool" &&
                t.id === inferredTool.id
            )
        )
    );

    if (candidates.length === 1) {
      const inferredTarget = candidates[0];
      // Execute!
      // We need to re-run the matching logic with new context
      const handlers = inferredTarget.interactions[verb];
      for (const handler of handlers) {
        const context = { target: inferredTarget, tool: inferredTool, verb };
        if (checkTests(handler.tests, context)) {
          writeLog(`(using on ${inferredTarget.name})`, "dim");
          await processActions(handler.actions, context);
          return true;
        }
      }
    }
  }

  return false;
}

function matchItem(item, search) {
  if (item.hidden) return false;
  if (item.name.toLowerCase().includes(search)) return true;
  if (
    item.aliases &&
    item.aliases.some((a) => a.toLowerCase().includes(search))
  )
    return true;
  return false;
}

/**
 * Checks a list of tests against the context.
 * @param {Array} tests
 * @param {Object} context
 */
function checkTests(tests, context) {
  if (!tests || tests.length === 0) return true;

  for (const test of tests) {
    if (!runTest(test, context)) return false;
  }
  return true;
}

function runTest(test, context) {
  switch (test.type) {
    case "item":
      // Check if player has item OR if tool matches
      if (test.context === "tool") {
        // Must match the provided tool
        if (!context.tool) return false;
        return context.tool.id === test.id;
      }
      if (test.context === "inventory") {
        return dungeon.inventory.some((i) => i.id === test.id);
      }
      return false;

    case "flag":
      return dungeon.flags.has(test.id) === test.value;

    default:
      return true;
  }
}

/**
 * Recursive action processor
 * @param {Array} actions
 * @param {Object} context
 */
export async function processActions(actions, context) {
  if (!actions) return;

  for (const action of actions) {
    switch (action.type) {
      case "message":
        writeLog(action.content, action.style || "response");
        break;

      case "spawn":
        const item = { ...action.item }; // Clone
        if (action.location === "inventory") {
          dungeon.inventory.push(item);
        } else {
          dungeon.world.rooms[dungeon.currentRoom].items.push(item);
        }
        break;

      case "destroy":
        let tgt = null;
        if (action.targetId) {
          tgt = findItemById(action.targetId);
        } else {
          tgt = action.target === "self" ? context.target : context.tool;
        }

        if (tgt) {
          removeFromWorld(tgt);
        }
        break;

      case "modify":
        let modTgt = null;
        if (action.targetId) {
          modTgt = findItemById(action.targetId);
        } else {
          modTgt = action.target === "self" ? context.target : context.tool;
        }

        if (modTgt && action.updates) {
          Object.assign(modTgt, action.updates);
        }
        break;

      case "move":
        const moveTgt = action.target === "self" ? context.target : context.tool;
        // If we have targetId support, use it?
        // Let's stick to standard target logic for now or add targetId support if consistent?
        // But for 'move', usually we move self.
        if (moveTgt) {
          // Remove from source
          removeFromWorld(moveTgt);
          // Add to dest
          if (action.location === "inventory") {
            dungeon.inventory.push(moveTgt);
          } else {
            dungeon.world.rooms[dungeon.currentRoom].items.push(moveTgt);
          }
        }
        break;

      case "trigger":
        // Inline command execution (e.g. "talk archivist")
        // We construct a fake command object or string?
        // Let's use parser to be safe, or direct valid structure.
        // Direct structure: { verb: action.verb, target: action.target }
        // BUT executeCommand takes structure.
        // And we need to await it.
        await executeCommand({
          verb: action.verb,
          target: action.target,
          raw: `(triggered) ${action.verb} ${action.target}`,
        });
        break;

      case "test":
        // Nested branching
        const pass = checkTests(action.req ? [action.req] : [], context);
        if (pass && action.then) await processActions(action.then, context);
        if (!pass && action.else) await processActions(action.else, context);
        break;

      case "block":
        if (action.msg) writeLog(action.msg, "error");
        return false; // Should stop chain?
        // But processActions is void.
        // And executeInteraction returns boolean "handled".
        // Detailed blocking (e.g. prevent TAKE) requires processActions to return something?
        // For now, block just stops *this* chain.
        return;
    }
  }
}

function removeFromWorld(item) {
  // Try inventory
  const invIdx = dungeon.inventory.indexOf(item);
  if (invIdx !== -1) {
    dungeon.inventory.splice(invIdx, 1);
    return;
  }
  // Try room
  const room = dungeon.world.rooms[dungeon.currentRoom];
  const roomIdx = room.items.indexOf(item);
  if (roomIdx !== -1) {
    room.items.splice(roomIdx, 1);
  }
}

function findItemById(id) {
  // Check inventory
  const invItem = dungeon.inventory.find((i) => i.id === id);
  if (invItem) return invItem;

  // Check current room
  // Note: We only search current room primarily, but since dungeon has all rooms, 
  // we could search globally if needed. For now, local scope is safer.
  const room = dungeon.world.rooms[dungeon.currentRoom];
  const roomItem = room.items.find((i) => i.id === id);
  if (roomItem) return roomItem;

  return null;
}
