import { writeLog } from "../store.svelte.js";

export function handlePush(system, target) {
  const d = system.dungeon;
  const log = system.writeLog;
  const room = d.world.rooms[d.currentRoom];

  if (!target) {
    log("Push what?");
    return;
  }

  // Find item in room (can't push items in inventory usually)
  const item = room.items.find(
    (i) => !i.hidden && i.name.toLowerCase().includes(target.toLowerCase())
  );

  if (!item) {
    log(`You don't see '${target}' here.`);
    return;
  }

  // Check for PUSH interaction
  if (item.interactions && item.interactions.push) {
    const effect = item.interactions.push;
    log(effect.msg || "You push it.");

    // Execute side effects
    if (effect.onPush) {
      effect.onPush(system, room, item);
    }
    return;
  }

  log("It won't budge.");
}
