# Phase 1 Implementation Plan: Core Foundation

## Objective

Establish the technical backbone of the Dungeon Crawler: the State Store, the Game Engine, the Command Parser, and the Terminal UI.

## 1. File Structure

We will create a new domain directory `src/lib/dungeon/` to keep this logic isolated.

```text
src/lib/
├── dungeon/
│   ├── store.svelte.js       # Global reactive state (Svelte 5 Runes)
│   ├── engine.js             # Singleton logic controller
│   ├── parser.js             # Text processing
│   ├── definitions.js        # Command dictionary
│   └── types.js              # TypeScript interfaces (JSDoc)
├── components/
│   └── terminal/
│       ├── Terminal.svelte   # Main container + Overlay
│       ├── CRT.css           # Scanlines/Glow effects
│       ├── Output.svelte     # History renderer
│       └── Layout.svelte     # HUD wrapper
```

## 2. Implementation Steps

### Step 1: The Reactive Store (`store.svelte.js`)

Initialize the global state using Svelte 5 Runes.

- **State**: `isOpen` (bool), `history` (array of `{type, text}`), `currentRoom` (ID).
- **Actions**: `toggle()`, `writeLog()`.

### Step 2: The Command Definitions (`definitions.js`)

Define the dictionary of allowed verbs and their aliases.

- `LOOK` -> `["look", "l", "examine", "x"]`
- `HELP` -> `["help", "?", "commands"]`

### Step 3: The Parser (`parser.js`)

Implement a function `parseCommand(inputString)` that returns a structured object:

```javascript
{
  verb: "LOOK" | "GO" | "UNKNOWN",
  target: "north" | "sword" | null,
  raw: "look north"
}
```

### Step 4: The Game Engine (`engine.js`)

Create the processor function `handleInput(input)`.

- It calls `parseCommand(input)`.
- It switches on the verb.
- It executes the logic (e.g., updates `history`).

### Step 5: The Terminal UI (`Terminal.svelte`)

- **Structure**: Fixed position overlay (`z-50`).
- **Styling**: Black background, green monospace text (`VT323` or similar font).
- **Effects**: CSS animations for "Turn On" (scale Y) and "Scanline".
- **Input**: Invisible `<input>` that captures keystrokes, rendering them manually in the DOM to simulate a terminal prompt.

### Step 6: Integration

- Import `Terminal.svelte` into `App.svelte` (or `HomePage.svelte` if acting as root).
- Add `window.addEventListener('keydown', ...)` to toggle visibility on `~` (Backtick).

## 3. Verification Plan

### Manual Testing

1.  **Toggle Test**: Press `~` (tilde). Verify Terminal slides down/appears. Press again to hide.
2.  **Input Test**: Type "Hello World". Verify text appears character-by-character (or substantially instant).
3.  **Command Test**:
    - Type `help`. Expect: List of commands.
    - Type `look`. Expect: "You are in the Void." (Placeholder).
    - Type `xyzzy`. Expect: "Unknown command."
4.  **Scroll Test**: Fill the screen with commands. Verify it scrolls to the bottom automatically.

### Automated Tests (Future)

- Unit tests for `parser.js` to ensure "look at sword" extracts "sword".
