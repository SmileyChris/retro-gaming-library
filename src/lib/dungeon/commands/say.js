import { writeLog } from "../store.svelte.js";

export function handleSay(system, text) {
  const d = system.dungeon;
  const log = system.writeLog;
  const room = d.world.rooms[d.currentRoom];

  if (!text) {
    log("Say what?");
    return;
  }

  const spoken = text.toLowerCase().trim();
  log(`You say: "${text}"`, "dictation"); // 'dictation' might need CSS support, or just use 'info'

  // Check for Room Riddles
  if (room.puzzle && room.puzzle.type === "RIDDLE") {
    if (spoken === room.puzzle.answer.toLowerCase()) {
      log(room.puzzle.successMsg, "success");

      // Reward logic
      if (room.puzzle.rewardType === "UNLOCK") {
        const exitDir = room.puzzle.target;
        if (room.locks && room.locks[exitDir]) {
          delete room.locks[exitDir];
          log(`The way ${exitDir} is now open!`);
        }
      } else if (room.puzzle.rewardType === "SPAWN_ITEM") {
        const reward = {
          id: `riddle_reward_${d.currentRoom}`,
          name: "Sphynx Gold",
          type: "TREASURE",
          description: "Gold given for wisdom.",
          value: 100,
        };
        room.items.push(reward);
        log(`A ${reward.name} appears!`);
      }

      // Clear puzzle so it doesn't trigger again?
      delete room.puzzle;
      return;
    } else {
      log("Nothing happens.", "dim");
    }
  } else {
    log("No one seems to be listening.", "dim");
  }
}
