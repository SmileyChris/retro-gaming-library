import { COMMANDS, DIRECTION_ALIASES } from "./definitions.js";

/**
 * Parses raw input into a structured command
 * @param {string} input
 * @returns {{ verb: string, target: string|null, raw: string }}
 */
export function parseCommand(input) {
  const raw = input.trim();
  if (!raw) return { verb: "EMPTY", target: null, raw };

  const parts = raw.split(/\s+/);
  const primaryword = parts[0].toLowerCase();

  // 1. Identify Verb
  let verb = "UNKNOWN";
  for (const [key, aliases] of Object.entries(COMMANDS)) {
    if (aliases.includes(primaryword)) {
      verb = key;
      break;
    }
  }

  // 2. Identify Target (everything else)
  // Clean up stop words like "to", "the", "at" from the start of the target
  let targetTokens = parts.slice(1);
  const stopWords = ["to", "the", "a", "an", "at", "with", "from"];

  // Remove leading stop words
  while (
    targetTokens.length > 0 &&
    stopWords.includes(targetTokens[0].toLowerCase())
  ) {
    targetTokens.shift();
  }

  let target = targetTokens.join(" ").trim();
  if (!target) target = null;

  // Special case for lonely directions (e.g. just typing "n")
  if (verb === "UNKNOWN" && DIRECTION_ALIASES[primaryword]) {
    verb = "GO";
    target = DIRECTION_ALIASES[primaryword];
  }

  // Special case: "north" is a GO command
  if (
    verb === "UNKNOWN" &&
    ["north", "south", "east", "west", "up", "down"].includes(primaryword)
  ) {
    verb = "GO";
    target = primaryword;
  }

  return { verb, target, raw };
}
