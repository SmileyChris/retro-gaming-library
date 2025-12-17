export const COMMANDS = {
  LOOK: ["look", "l", "examine", "x", "ls", "dir", "view"],
  GO: ["go", "walk", "move", "cd", "enter"],
  HELP: ["help", "?", "commands", "man"],
  CLEAR: ["clear", "cls"],
  TAKE: ["take", "get", "grab", "pick", "pickup"],
  INVENTORY: ["inventory", "i", "inv", "items", "bag"],
  TALK: ["talk", "speak", "chat", "ask"],
  SAY: ["say", "shout", "whisper", "utter", "yell"],
  SUDO: ["sudo", "admin", "root"],
  RESET: ["reset", "respawn", "suicide"],
  OPEN: ["open", "unlock", "smash", "break"],
  PUSH: ["push", "shove", "move", "slide"],
  USE: ["use", "interact", "operate"],
  JOURNAL: ["journal", "j", "log", "quests", "tasks"],
  DROP: ["drop", "throw", "discard"],
  PLAY: ["play", "run", "boot"],
  EXIT: ["exit", "quit", "close", "leave"],
  SAVE: ["save"],
};

export const DIRECTION_ALIASES = {
  n: "north",
  s: "south",
  e: "east",
  w: "west",
  u: "up",
  d: "down",
};
