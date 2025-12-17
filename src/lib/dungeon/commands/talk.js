export function handleTalk(system, target) {
  const { dungeon, writeLog } = system;

  const room = dungeon.world.rooms[dungeon.currentRoom];

  if (!room.npcs || room.npcs.length === 0) {
    writeLog("There is no one here to talk to.");
    return;
  }

  if (!target) {
    if (room.npcs && room.npcs.length === 1) {
      target = room.npcs[0].name;
    } else {
      writeLog("Talk to whom?");
      return;
    }
  }

  let search = target.toLowerCase();
  if (search.startsWith("to ")) search = search.substring(3).trim();

  const npc = room.npcs.find((n) => {
    if (n.name.toLowerCase().includes(search)) return true;
    if (n.aliases && n.aliases.some((a) => a.toLowerCase().includes(search)))
      return true;
    // Safety check for aliases in case it is undefined
    if (n.shortDescription && n.shortDescription.toLowerCase().includes(search))
      return true;
    return false;
  });

  if (npc) {
    writeLog(`[ ${npc.name} ]`, "info");

    // ARCHIVIST PRECEDENCE
    if (npc.id === "archivist") {
      const hasKey = dungeon.inventory.find((i) => i.id === "key_level_1");
      const hasBackpack = dungeon.inventory.find(
        (i) => i.id === "backpack_starter"
      );

      if (hasKey && !hasBackpack) {
        writeLog(`"I see you have the Level 2 Key," says the Archivist.`);
        writeLog(
          `"But you cannot travel the zones with your hands full. Take this."`,
          "info"
        );
        const pack = {
          id: "backpack_starter",
          name: "Infinite Backpack",
          type: "PACK",
          description: "Bigger on inside.",
          contents: [],
        };
        dungeon.inventory.push(pack);
        writeLog(`The Archivist gives you an ${pack.name}.`, "success");
        return;
      }

      if (!dungeon.world.flags) dungeon.world.flags = {};

      if (!dungeon.world.flags.archivistMet) {
        dungeon.world.flags.archivistMet = true;
        const threatName =
          dungeon.world.narrative?.threat?.name || "The Bit Rot";
        writeLog(
          `"Welcome to the constructs, user. I fear ${threatName} is advancing."`
        );
        return;
      }

      if (!dungeon.world.flags.receivedStarterGear) {
        dungeon.world.flags.receivedStarterGear = true;
        writeLog(`"Take this backpack."`);
        dungeon.inventory.push({
          id: "backpack_starter",
          name: "Backpack",
          type: "PACK",
        });
        dungeon.world.flags.starterQuestActive = true;
        dungeon.quests.push({
          questId: "archivist_starter",
          npcId: "archivist",
          status: "active",
        });
        return;
      }

      if (
        dungeon.world.flags.starterQuestActive &&
        !dungeon.world.flags.starterQuestComplete
      ) {
        const gameCount = dungeon.inventory.filter(
          (i) => i.type === "GAME"
        ).length;
        if (gameCount >= 5) {
          dungeon.world.flags.starterQuestComplete = true;
          writeLog(`"Splendid!"`);
          writeLog(
            `"These stable data structures will hold back the corruption for now."`
          );
          writeLog(
            `"If you wish to ascend to the higher levels, you will need this key. But be warned, the path upwards is dangerous."`
          );
          dungeon.inventory.push({
            id: "key_level_1",
            name: "Level 2 Key",
            type: "KEY",
          });
        } else {
          writeLog(
            `"I need 5 stable Game Cartridges to patch the firewall. The Atrium to the NORTH should have plenty."`
          );
          writeLog(
            `"Check your JOURNAL (type 'j') to track your progress."`,
            "dim"
          );
        }
        return;
      }
    }

    // GENERIC INTERACTIONS
    if (!dungeon.relationships) dungeon.relationships = {};
    if (!dungeon.relationships[npc.id]) {
      dungeon.relationships[npc.id] = { trust: 0, known: true };
    }
    const rel = dungeon.relationships[npc.id];

    if (!dungeon.quests) dungeon.quests = [];
    const activeQuestIdx = dungeon.quests.findIndex(
      (q) => q.npcId === npc.id && q.status === "active"
    );

    if (activeQuestIdx > -1) {
      const questMeta = dungeon.quests[activeQuestIdx];

      // npc.quests might be undefined if not in the object, handle with optional chaining/find
      const questDef = npc.quests
        ? npc.quests.find((q) => q.id === questMeta.questId)
        : null;

      if (questDef) {
        // questDef.condition checks inventory
        const item = questDef.condition(dungeon.inventory);
        if (item) {
          dungeon.quests[activeQuestIdx].status = "completed";
          writeLog(`"${questDef.endText}"`, "response");
          if (questDef.reward && questDef.reward.type === "KEY") {
            dungeon.inventory.push({
              id: "key_level_1",
              name: "Key",
              type: "KEY",
            });
          }
          return;
        } else {
          writeLog(`"Don't forget, I need that item."`);
          return;
        }
      }
    }

    if (npc.quests) {
      const availableQuest = npc.quests.find((q) => {
        const status = dungeon.quests.find((uq) => uq.questId === q.id);
        if (status) return false;
        // rel.trust check
        return rel.trust >= (q.req?.trust || 0);
      });
      if (availableQuest) {
        writeLog(`"${availableQuest.startText}"`, "response");
        dungeon.quests.push({
          questId: availableQuest.id,
          npcId: npc.id,
          status: "active",
        });
        return;
      }
    }

    if (npc.dialogue && npc.dialogue.default) {
      const lines = npc.dialogue.default;
      writeLog(`"${lines[Math.floor(Math.random() * lines.length)]}"`);
    } else {
      writeLog(`"${npc.name} has nothing to say."`);
    }
  } else {
    writeLog(`You don't see '${target}' here.`);
  }
}
