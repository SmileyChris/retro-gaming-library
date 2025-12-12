export const COMMANDS = {
  LOOK: ["look", "l", "examine", "x", "ls", "dir", "view"],
  GO: ["go", "walk", "move", "cd", "enter"],
  HELP: ["help", "?", "commands", "man"],
  CLEAR: ["clear", "cls"],
  TAKE: ["take", "get", "grab", "pick", "pickup"],
  INVENTORY: ["inventory", "i", "inv", "items", "bag"],
  TALK: ["talk", "chat", "speak", "ask"],
  RESET: ["reset", "restart", "respawn", "sudo"],
  OPEN: ["open", "unpack", "use"],
  JOURNAL: ["journal", "j", "log", "quests", "tasks"],
  DROP: ["drop", "throw", "discard"],
};

export const DIRECTION_ALIASES = {
  n: "north",
  s: "south",
  e: "east",
  w: "west",
  u: "up",
  d: "down",
};
