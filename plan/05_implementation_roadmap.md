# 05. Implementation Roadmap

## Phase 1: The Core Foundation (MVP)

**Status: COMPLETED**

- [x] **Infrastructure**: Set up `stores/dungeon.svelte.js` and `components/Terminal.svelte`.
- [x] **Parser**: Implement `tokenizer` and `commandResolver` for basic verbs (`look`, `help`, `clear`, `go`, `take`, `use`).
- [x] **UI**: Create the CRT effect, input handling, and auto-scroll logic.
- [x] **Basic World**: Hard-code a "Test Room" to verify the loop. (Replaced by Generator)

## Phase 2: The World Generator & Intro Zone

**Status: COMPLETED**

- [x] **Algorithm**: Implement `distributeGames` and `generateGraph` found in the PRD.
- [x] **Integration**: Connect the existing `allGames` data to the generator.
- [x] **Arcade Atrium**: Implement the Level 1 "Star Topology" tutorial area.
- [x] **Intro Quest**: Implement the Archivist, 5-cartridge requirement, and Elevator Key logic.
- [x] **Backpack**: Implement the "Infinite Backpack" mechanic for progression.

## Phase 3: Object Interaction & Puzzles

**Status: IN PROGRESS**

- [x] **State Machine**: Implement the `GameObject` class with `currentState` logic. (Handled via Items array)
- [x] **Inventory**: Build the inventory UI (`inventory` command) and backend logic.
- [x] **Puzzle Logic**: Implement `use [tool]` mechanics (Broom, Token, Dusty Cartridge).
- [ ] **Refactoring**: Split `engine.js` into modular command handlers (`commands/`) to manage growth.
- [ ] **Zone 2 Content**: Populate "Platformer Peaks" with "Retro Rob" and the Console quest.

## Phase 4: Game Realms (Alpha)

**Status: IN PROGRESS**

**Goal:** First payable mini-game ("Game within a Game").

- [x] **Engine**: Create `RealmManager` (realms/index.js) and the `RealmMechanic` interface.
- [ ] **Prototype**: Refine `gen-1` (Sonic 2) realm with specific "Chemical Plant" loop logic.
- [ ] **Transition**: Handle the "Enter Realm" flow from `play` command using the new Console item.

## Phase 5: Advanced Systems

**Status: PLANNED**

- [ ] **NPCs**: Expand Relationship System (Trust scores).
- [ ] **Save System**: Implement `idb-keyval` for full persistence of the complex world state.
- [ ] **Deeper Zones**: Generate Level 3 (RPG Archives) and Level 4 (Pixel Warzone).

## Phase 6: Polish & Launch

**Status: PLANNED**

- [ ] **Audio**: Add typing sounds and ambient hum.
- [ ] **Mobile**: Ensure virtual keyboard works with the terminal.
- [ ] **Performance**: Optimize the huge state object.
