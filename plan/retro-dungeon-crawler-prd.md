# Retro Realm: Text Adventure Game Discovery System

## Product Requirements Document

---

## 1. Executive Summary

**Product Name:** Retro Realm (or "The Cartridge Catacombs")

**Concept:** A text-based dungeon crawl adventure that serves as a discovery mechanism for a library of 200 retro games across 8-bit and 16-bit platforms. Players explore procedurally-generated dungeons, solve puzzles, and discover games as "treasures" throughout their journey.

**Core Value Proposition:** Transform passive game browsing into an engaging, nostalgic adventure that rewards exploration and creates memorable discovery moments.

---

## 2. User Experience Overview

### 2.1 Entry Point

```
┌─────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║     WELCOME TO THE CARTRIDGE CATACOMBS               ║  │
│  ║     ─────────────────────────────────────            ║  │
│  ║     A Text Adventure in Retro Gaming History         ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  You stand at the entrance of an ancient arcade,            │
│  its neon signs flickering with forgotten power.            │
│  Somewhere within these halls lie 200 legendary             │
│  cartridges waiting to be rediscovered...                   │
│                                                             │
│  Type 'help' for commands or 'begin' to start.              │
│                                                             │
│  > _                                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Interface Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [RETRO REALM]                    Discovered: 12/200 │ ☰ Menu │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PROCESSING CORE - LEVEL 2                                  │
│  ═══════════════════════════                                │
│                                                             │
│  You are in a humming server room filled with blinking      │
│  lights. Ancient CRT monitors display cascading green       │
│  text. A DUSTY CARTRIDGE sits on a metal shelf. There's     │
│  a RUSTY LEVER on the wall. A MAINTENANCE ROBOT stands      │
│  motionless in the corner.                                  │
│                                                             │
│  Exits: NORTH (locked), EAST, DOWN                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  > examine cartridge                                        │
│                                                             │
│  The cartridge is covered in dust but you can make out      │
│  faded pixel art on the label. It looks like it might       │
│  be a platformer from the 16-bit era...                     │
│                                                             │
│  > take cartridge                                           │
│                                                             │
│  You carefully pick up the cartridge and blow the dust      │
│  off. It's "Super Metroid" for the SNES!                    │
│                                                             │
│  ★ GAME DISCOVERED: Super Metroid (SNES, 1994)              │
│    [Play Now] [Add to Collection] [Learn More]              │
│                                                             │
│  > _                                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ INVENTORY: Flashlight, Old Key, 3 Tokens    │ MAP │ JOURNAL │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Command System

### 3.1 Core Commands (Always Available)

| Command | Aliases | Description |
|---------|---------|-------------|
| `look` | `l`, `examine room` | Redisplay current room description |
| `examine [thing]` | `x [thing]`, `look at [thing]` | Get detailed description of item/feature |
| `go [direction]` | `north`, `n`, `e`, `s`, `w`, `up`, `down` | Move to adjacent room |
| `take [item]` | `get [item]`, `grab [item]`, `pick up [item]` | Add item to inventory |
| `drop [item]` | `leave [item]`, `put down [item]` | Remove item from inventory |
| `inventory` | `i`, `inv`, `items` | List carried items |
| `use [item]` | `activate [item]` | Use an item in current context |
| `use [item] on [target]` | `apply [item] to [target]` | Use item on something specific |
| `talk to [character]` | `speak to`, `ask` | Interact with NPCs |
| `help` | `?`, `commands` | Show available commands |
| `map` | `m` | Show discovered map |
| `journal` | `j`, `log`, `quests` | Show active quests and hints |
| `collection` | `games`, `discovered` | Show discovered games |
| `save` | - | Manual save (auto-saves constantly) |
| `hint` | `stuck` | Get a contextual hint |

### 3.2 Context-Sensitive Commands

| Command | Context | Example |
|---------|---------|---------|
| `open [thing]` | Containers, doors | `open chest`, `open door` |
| `close [thing]` | Openable things | `close cabinet` |
| `push [thing]` | Moveable objects | `push statue` |
| `pull [thing]` | Levers, handles | `pull lever` |
| `read [thing]` | Books, signs, notes | `read inscription` |
| `insert [item] into [thing]` | Slots, keyholes | `insert coin into slot` |
| `combine [item] with [item]` | Craftable items | `combine battery with flashlight` |
| `play [game/machine]` | Arcade cabinets | `play arcade machine` |
| `blow on [item]` | Dusty cartridges! | `blow on cartridge` |

### 3.3 Parser Intelligence

The parser should handle:
- **Synonyms:** "grab", "take", "get", "pick up" → same action
- **Partial matches:** "exam cart" → "examine cartridge"
- **Natural language:** "go through the door" → "go north"
- **Implied objects:** "take it" → takes last mentioned item
- **Error recovery:** Helpful messages for unknown commands

```javascript
// Parser response examples
"I don't understand 'xyzzy'. Type 'help' for commands."
"There's no cartridge here. Did you mean the 'dusty box'?"
"You can't go that way. Exits are: NORTH, EAST"
"Which do you want to examine - the RED button or the BLUE button?"
```

---

## 4. World Structure

### 4.1 Dungeon Zones (Themed Areas)

Each zone has a distinct aesthetic and contains ~25-30 discoverable games thematically linked to the zone:

| Zone | Theme | Game Types Found | Aesthetic |
|------|-------|------------------|-----------|
| **The Arcade Atrium** | Classic arcade | Arcade ports, early games | Neon lights, coin-ops, high score boards |
| **Platformer Peaks** | Jumping adventures | Platformers, action games | Floating platforms, pixel clouds, pipes |
| **The RPG Archives** | Fantasy quests | RPGs, adventure games | Libraries, scrolls, mystical artifacts |
| **Speed Circuit** | Racing & sports | Racing, sports games | Checkered flags, trophies, pit stops |
| **The Pixel Warzone** | Combat & action | Shooters, beat-em-ups, fighters | Bunkers, ammo crates, battle scars |
| **Puzzle Palace** | Brain teasers | Puzzle games, educational | Shifting blocks, cryptic symbols |
| **The 8-Bit Basement** | Early era | NES, Master System, older | Dusty, retro, CRT monitors |
| **16-Bit Heights** | Golden age | SNES, Genesis era | Polished, colorful, advanced |

### 4.2 Room Generation Structure

```
DUNGEON
├── Zone 1: Arcade Atrium (Levels 1-2)
│   ├── Level 1 (5-7 rooms, 1 locked, 1 puzzle)
│   │   ├── Entrance Hall
│   │   ├── Token Counter
│   │   ├── Cabinet Row A
│   │   ├── Cabinet Row B
│   │   ├── Prize Corner (locked)
│   │   └── Manager's Office (puzzle)
│   └── Level 2 (5-7 rooms)
│       └── ...
├── Zone 2: Platformer Peaks (Levels 3-4)
│   └── ...
└── [continues for all zones]
```

### 4.3 Room Data Structure

```typescript
interface Room {
  id: string;                    // Unique identifier
  zone: ZoneType;                // Which themed zone
  level: number;                 // Depth in dungeon
  name: string;                  // "The Dusty Archives"
  description: string;           // Main room text
  shortDescription: string;      // For revisits
  exits: {                       // Available directions
    [direction: string]: {
      roomId: string;
      locked: boolean;
      lockId?: string;           // Which key/puzzle unlocks
      hiddenUntil?: string;      // Condition to reveal
    }
  };
  items: RoomItem[];             // Interactable objects
  features: RoomFeature[];       // Examinable but not takeable
  npcs: NPC[];                   // Characters present
  firstVisit: boolean;           // Show long or short desc
  discovered: boolean;           // On the map?
  ambientMessages: string[];     // Random atmospheric text
}

interface RoomItem {
  id: string;
  name: string;
  aliases: string[];             // ["cart", "cartridge", "game"]
  description: string;
  canTake: boolean;
  hidden: boolean;               // Revealed by action
  containsGame?: GameReference;  // Links to actual game
  usableOn?: string[];           // What it can interact with
  examineReveals?: string;       // Extra info on examine
}

interface RoomFeature {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  interactions: {
    [verb: string]: {
      response: string;
      triggers?: GameEvent;
    }
  };
}

interface GameReference {
  gameId: string;                // Links to your game database
  discoveryText: string;         // Flavor text for finding it
  hintText: string;              // Clue before discovery
}
```

---

## 5. Procedural Generation System

### 5.1 Seed-Based Generation

```typescript
interface DungeonSeed {
  seed: number;                  // Random seed for reproducibility
  createdAt: timestamp;
  version: string;               // For migration if structure changes
}

// Generation flow:
// 1. Create or load seed from localStorage
// 2. Initialize PRNG with seed
// 3. Generate zone layouts
// 4. Distribute 200 games across zones (weighted by theme)
// 5. Generate rooms with items, puzzles, NPCs
// 6. Create connections and locks
// 7. Save complete dungeon state
```

### 5.2 Game Distribution Algorithm

```typescript
function distributeGames(games: Game[], zones: Zone[], rng: SeededRandom) {
  // 1. Categorize games by best-fit zone
  const categorized = categorizeByTheme(games);
  
  // 2. Primary placement (70% of games in matching zones)
  for (const zone of zones) {
    const matching = categorized[zone.theme];
    const count = Math.floor(matching.length * 0.7);
    zone.games.push(...rng.shuffle(matching).slice(0, count));
  }
  
  // 3. Secondary placement (remaining games spread around)
  const remaining = games.filter(g => !g.placed);
  const distributed = rng.distribute(remaining, zones);
  
  // 4. Assign discovery methods
  for (const game of games) {
    game.discoveryMethod = rng.weightedChoice([
      { method: 'chest', weight: 30 },      // In a container
      { method: 'visible', weight: 25 },    // On a shelf/table
      { method: 'puzzle', weight: 20 },     // Behind a puzzle
      { method: 'npc', weight: 15 },        // Given by character
      { method: 'hidden', weight: 10 },     // Secret area
    ]);
  }
}
```

### 5.3 Room Generation Templates

```typescript
const ROOM_TEMPLATES = {
  arcade_cabinet_row: {
    namePatterns: [
      "Cabinet Row {letter}",
      "The {adjective} Arcade",
      "{decade}s Corner"
    ],
    requiredFeatures: ["arcade_cabinet"],
    optionalFeatures: ["coin_slot", "high_score_board", "sticky_floor"],
    itemSlots: 2,
    gameSlots: 1-3,
    possibleExits: 4
  },
  
  storage_room: {
    namePatterns: [
      "Dusty Storage",
      "The Back Room", 
      "Forgotten Stockroom"
    ],
    requiredFeatures: ["shelving"],
    optionalFeatures: ["cardboard_boxes", "old_posters", "flickering_light"],
    itemSlots: 3,
    gameSlots: 2-4,
    possibleExits: 2
  },
  
  // ... more templates
};
```

---

## 6. Discovery Mechanics

### 6.1 Discovery Methods

| Method | Description | Example |
|--------|-------------|---------|
| **Direct Find** | Cartridge visible in room | "A DUSTY CARTRIDGE sits on the shelf" |
| **Container** | Inside chests, boxes, cabinets | "Inside the chest you find..." |
| **Puzzle Reward** | Complete a puzzle | "The safe clicks open, revealing..." |
| **NPC Gift** | Character gives game | "Take this, adventurer..." |
| **Secret Area** | Hidden room/alcove | "Behind the poster is a hidden compartment..." |
| **Trade** | Exchange items with NPC | "I'll trade you this for your tokens" |
| **Achievement** | Reach milestone | "For exploring 50 rooms, you've earned..." |
| **Combination** | Use/combine items | "The machine whirs and dispenses..." |

### 6.2 Discovery Presentation

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ★ ═══════════════════════════════════════════════════ ★   │
│        G A M E   D I S C O V E R E D !                     │
│  ★ ═══════════════════════════════════════════════════ ★   │
│                                                             │
│        ┌─────────────────────┐                              │
│        │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │                              │
│        │  ▓ SONIC THE     ▓ │                              │
│        │  ▓ HEDGEHOG      ▓ │                              │
│        │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │                              │
│        │     GENESIS        │                              │
│        └─────────────────────┘                              │
│                                                             │
│  Sonic the Hedgehog (1991)                                  │
│  Platform: Sega Genesis                                     │
│  Genre: Platformer                                          │
│                                                             │
│  "Gotta go fast! The blue blur's first adventure."          │
│                                                             │
│  [▶ PLAY NOW]  [+ COLLECTION]  [📖 INFO]                   │
│                                                             │
│  Progress: 47/200 games discovered                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Hints System

Games can be hinted at before discovery:

```
> examine poster

The faded poster shows a blue hedgehog running at incredible 
speed. The tagline reads "The fastest thing alive!" Someone 
has scrawled "Check behind the arcade cabinet" in marker.

// Later, if player is stuck:
> hint

HINT: That poster about the speedy hedgehog seemed to suggest 
looking behind something in the arcade area...
```

---

## 7. Puzzle System

### 7.1 Puzzle Types

| Type | Complexity | Example |
|------|------------|---------|
| **Key & Lock** | Simple | Find key in Room A, use on door in Room B |
| **Sequence** | Medium | Push buttons in order shown on a clue |
| **Combination** | Medium | Gather 3 items to unlock something |
| **Logic** | Medium | "Only the honest guard tells truth..." |
| **Trade Chain** | Complex | Give A to NPC1 for B, B to NPC2 for C... |
| **Environmental** | Varies | Push statue to reveal passage |
| **Riddle** | Medium | Answer a riddle to proceed |
| **Scavenger** | Simple | Collect 5 tokens scattered around |

### 7.2 Puzzle Data Structure

```typescript
interface Puzzle {
  id: string;
  type: PuzzleType;
  zone: string;
  difficulty: 1 | 2 | 3;
  
  // What the puzzle locks
  locks: {
    type: 'door' | 'container' | 'npc' | 'item';
    targetId: string;
  };
  
  // Requirements to solve
  requirements: {
    items?: string[];           // Items needed
    actions?: string[];         // Actions in order
    answer?: string;            // For riddles
    state?: object;             // Custom state checks
  };
  
  // Player-facing content
  clues: {
    location: string;           // Where clue is found
    text: string;               // The clue itself
  }[];
  
  // Rewards
  rewards: {
    games?: string[];
    items?: string[];
    unlocks?: string[];
  };
  
  hints: string[];              // Progressive hints
  solvedText: string;           // Message on completion
}
```

### 7.3 Example Puzzles

**Puzzle: The High Score Lock**
```
Zone: Arcade Atrium
Type: Sequence
Difficulty: 1

Setup:
- A cabinet has a high score board: "AAA - 12345"
- A keypad on the prize room door needs a code

Clue: "Only the champion's score can open the vault"

Solution: Enter "12345" on keypad

Reward: Access to Prize Room (contains 3 games)
```

**Puzzle: The Robot's Request**
```
Zone: 8-Bit Basement
Type: Trade Chain
Difficulty: 2

Setup:
- Broken Robot needs a BATTERY
- Battery is in locked toolbox
- Janitor has toolbox key but wants COFFEE
- Coffee machine needs TOKEN
- Token found in arcade (earlier zone)

Chain: TOKEN → COFFEE → KEY → BATTERY → Robot helps

Reward: Robot opens sealed vault (contains rare game)
```

**Puzzle: The Platform Prophecy**
```
Zone: Platformer Peaks
Type: Riddle
Difficulty: 2

The Guardian asks:
"I jump but have no legs,
I collect but have no hands,
I die but always return.
What am I?"

Answer: "player" / "character" / "hero"

Reward: Passage to hidden area with 2 games
```

---

## 8. NPC System

### 8.1 NPC Types

| Type | Role | Interaction |
|------|------|-------------|
| **Shopkeeper** | Trades items for tokens | "I'll give you a hint for 3 tokens" |
| **Guardian** | Blocks path until puzzle solved | "Answer my riddle to pass" |
| **Quest Giver** | Assigns fetch quests | "Bring me the GOLDEN CARTRIDGE" |
| **Lore Master** | Provides game history/trivia | "Ah, that game was made by..." |
| **Wanderer** | Random tips and flavor | "I heard there's a secret room..." |
| **Collector** | Trades games for special items | "I'll trade you a map for that RPG" |

### 8.2 NPC Data Structure

```typescript
interface NPC {
  id: string;
  name: string;
  type: NPCType;
  sprite: string;              // ASCII art representation
  personality: string;         // For AI generation
  
  dialogue: {
    greeting: string[];        // Random first contact
    idle: string[];            // Random repeated talk
    questStart?: string;
    questReminder?: string;
    questComplete?: string;
    trade?: {
      offer: string;
      accept: string;
      decline: string;
    };
  };
  
  trades?: {
    wants: string[];
    gives: string[];
  };
  
  quest?: {
    id: string;
    requires: string[];
    rewards: string[];
  };
  
  hints?: string[];            // Game-related hints they share
}
```

### 8.3 Example NPCs

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     OLD ARCADE ATTENDANT                                   ║
║                                                            ║
║         ╭─────╮                                            ║
║         │ ◠ ◠ │    "Well well, a new challenger!          ║
║         │  ▽  │     I've been watching these              ║
║         ╰──┬──╯     machines for 40 years.                ║
║          ╭─┴─╮      Want to hear about the                ║
║          │   │      golden age of arcades?"               ║
║          ╰───╯                                             ║
║                                                            ║
║  [ASK ABOUT] Games | History | Hints | Trade               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 9. Inventory & Items

### 9.1 Item Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Keys** | Unlock doors/containers | Rusty Key, Master Key, Keycard |
| **Tools** | Environmental interaction | Flashlight, Crowbar, Screwdriver |
| **Currency** | Trading with NPCs | Tokens, Coins, Tickets |
| **Quest Items** | Puzzle components | Golden Cartridge, Ancient Manual |
| **Consumables** | One-time effects | Battery, Oil Can, Hint Scroll |
| **Collectibles** | Achievements | Rare Stickers, Developer Notes |

### 9.2 Inventory Limits

- **Carrying Capacity:** 10 items (upgradeable)
- **Stackables:** Tokens and currency stack (max 99)
- **Key Items:** Don't count against limit
- **Storage:** Can store items at "base camp" room

---

## 10. Progression & Persistence

### 10.1 Saved State Structure

```typescript
interface SaveState {
  version: string;
  seed: number;
  timestamp: number;
  
  player: {
    currentRoom: string;
    inventory: InventoryItem[];
    stats: {
      roomsVisited: number;
      gamesDiscovered: number;
      puzzlesSolved: number;
      totalMoves: number;
    };
  };
  
  world: {
    rooms: {
      [roomId: string]: {
        visited: boolean;
        itemsTaken: string[];
        featuresChanged: { [id: string]: any };
      }
    };
    puzzles: {
      [puzzleId: string]: {
        solved: boolean;
        progress: any;
      }
    };
    npcs: {
      [npcId: string]: {
        questState: string;
        dialogueIndex: number;
      }
    };
  };
  
  discovered: {
    games: string[];
    secrets: string[];
    achievements: string[];
  };
  
  journal: JournalEntry[];
}
```

### 10.2 Auto-Save Strategy

- Save after every meaningful action
- Debounce rapid commands (100ms)
- Save to localStorage with fallback to IndexedDB
- Version migrations for structure changes

### 10.3 Progress Milestones

| Milestone | Trigger | Reward |
|-----------|---------|--------|
| First Steps | Visit 10 rooms | Map upgrade (shows more) |
| Collector | Discover 25 games | Expanded inventory |
| Explorer | Visit all rooms in a zone | Zone completion badge |
| Puzzle Master | Solve 10 puzzles | Hint tokens |
| Completionist | Discover all 200 games | Secret ending + badge |

---

## 11. AI Content Generation

### 11.1 Room Description Prompt Template

```markdown
## ROOM GENERATION PROMPT

Generate a text adventure room description for a retro gaming discovery dungeon.

**Context:**
- Zone: {zone_name}
- Zone Theme: {zone_description}
- Room Type: {room_template}
- Room Name: {generated_name}
- Contains Games: {game_list_with_genres}
- Contains Items: {item_list}
- Has Features: {feature_list}
- Exits: {exit_directions}
- Puzzle Present: {yes/no, puzzle_type}
- NPC Present: {yes/no, npc_type}

**Requirements:**
1. 2-3 sentences of atmospheric description
2. Mention all ITEMS in CAPS (as examinalbe objects)
3. Mention all FEATURES naturally (examinable but not takeable)
4. End with "Exits: {directions}" line
5. If game is directly visible, hint at it without naming
6. Tone: Nostalgic, slightly mysterious, hint of humor
7. Reference retro gaming culture where natural

**Style Examples:**
- "The CRT monitors cast an eerie green glow..."
- "Dust motes dance in the light from a single flickering bulb..."  
- "The carpet is sticky with decades of spilled soda..."

**Output Format:**
{Room description text}

Exits: {DIRECTION (note)}, {DIRECTION}, ...
```

### 11.2 Puzzle Generation Prompt Template

```markdown
## PUZZLE GENERATION PROMPT

Generate a text adventure puzzle for a retro gaming discovery dungeon.

**Context:**
- Zone: {zone_name}
- Difficulty: {1-3}
- Puzzle Type: {type}
- Available in Zone: {items_available}
- Should Unlock: {door/container/npc_dialogue}
- Rewards: {game_to_discover}

**Requirements:**
1. Puzzle must be solvable with items/info findable in same zone
2. Provide clear clue text (found on a sign, note, or NPC dialogue)
3. Solution should be logical but not obvious
4. Include 2 progressive hints for stuck players
5. Tie into retro gaming theme where possible
6. Avoid real-world offensive content

**Output JSON Format:**
{
  "name": "Puzzle name",
  "description": "What player sees",
  "clue_text": "The actual clue",
  "clue_location": "Where clue is found",
  "solution": {
    "action": "use X on Y" | "enter code" | "answer riddle",
    "answer": "the solution"
  },
  "hints": [
    "Gentle nudge hint",
    "More direct hint"
  ],
  "success_text": "What happens when solved"
}
```

### 11.3 NPC Dialogue Prompt Template

```markdown
## NPC DIALOGUE GENERATION PROMPT

Generate dialogue for a text adventure NPC in a retro gaming dungeon.

**Character:**
- Name: {npc_name}
- Type: {shopkeeper/guardian/quest_giver/lore_master}
- Personality: {personality_traits}
- Zone: {zone_name}
- Related Games: {games_in_zone}

**Needs:**
- 3 varied greeting lines
- 3 idle/repeated talk lines
- Quest dialogue (if applicable): start, reminder, complete
- Trade dialogue (if applicable): offer, accept, decline
- 2-3 game hints they might share

**Requirements:**
1. Stay in character with personality
2. Reference retro gaming naturally (not forced)
3. Hints should be helpful but not spoilers
4. Vary sentence structure and length
5. Include occasional humor appropriate to setting

**Output JSON Format:**
{
  "greeting": ["line1", "line2", "line3"],
  "idle": ["line1", "line2", "line3"],
  "quest_start": "...",
  "quest_reminder": "...",
  "quest_complete": "...",
  "trade_offer": "...",
  "trade_accept": "...",
  "trade_decline": "...",
  "hints": ["hint1", "hint2"]
}
```

### 11.4 Content Expansion Prompt

```markdown
## CONTENT EXPANSION PROMPT

Expand the text content for an existing room/puzzle/NPC.

**Current Content:**
{existing_content}

**Expansion Type:** {more_descriptions | alternate_versions | atmospheric_details}

**Context:**
{relevant_context}

**Requirements:**
1. Match existing tone and style
2. Don't contradict established facts
3. Add depth without adding required gameplay elements
4. Maintain appropriate length (2-4 sentences per addition)

**Output:** 
{expanded_content}
```

---

## 12. Technical Implementation

### 12.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Terminal UI  │  │  Map View    │  │ Inventory UI │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────────────────────┤
│                      GAME ENGINE                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │Command Parser│  │ State Manager│  │ Event System │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────────────────────┤
│                      DATA LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │World Generator│ │ Save Manager │  │  Game Library │      │
│  │   (Seeded)   │  │ (LocalStorage│  │   (200 games) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 Key Components

```typescript
// Core game engine modules
class GameEngine {
  parser: CommandParser;
  world: World;
  player: Player;
  events: EventEmitter;
  renderer: TerminalRenderer;
  
  processCommand(input: string): CommandResult;
  update(): void;
  render(): void;
}

class CommandParser {
  vocabulary: VocabularyMap;
  aliases: AliasMap;
  
  parse(input: string): ParsedCommand;
  getSuggestions(partial: string): string[];
  handleAmbiguity(matches: string[]): string;
}

class World {
  seed: number;
  rng: SeededRandom;
  rooms: Map<string, Room>;
  puzzles: Map<string, Puzzle>;
  npcs: Map<string, NPC>;
  
  generate(): void;
  getRoom(id: string): Room;
  updateRoom(id: string, changes: Partial<Room>): void;
}

class SaveManager {
  save(state: SaveState): void;
  load(): SaveState | null;
  migrate(oldState: any): SaveState;
  export(): string; // For backup
  import(data: string): void;
}
```

### 12.3 Local Storage Schema

```typescript
// localStorage keys
const STORAGE_KEYS = {
  SAVE_STATE: 'retro-realm-save',
  SETTINGS: 'retro-realm-settings',
  DISCOVERED_GAMES: 'retro-realm-discovered', // Quick access
  ACHIEVEMENTS: 'retro-realm-achievements',
  VERSION: 'retro-realm-version'
};

// Settings structure
interface Settings {
  textSpeed: 'instant' | 'fast' | 'normal';
  soundEnabled: boolean;
  screenReader: boolean;
  fontSize: 'small' | 'medium' | 'large';
  colorScheme: 'green' | 'amber' | 'white' | 'custom';
}
```

---

## 13. Accessibility Considerations

### 13.1 Screen Reader Support

- All output is text-based (naturally accessible)
- Proper ARIA labels on interactive elements
- Announce room changes and discoveries
- Keyboard-only navigation throughout

### 13.2 Visual Options

- Adjustable font size
- High contrast color schemes
- Optional dyslexia-friendly font
- Reduced motion option (for any animations)

### 13.3 Cognitive Accessibility

- `hint` command always available
- Journal tracks quests and clues automatically
- Map shows visited areas
- No time limits or pressure

---

## 14. Metrics & Analytics

### 14.1 Key Metrics to Track

| Metric | Purpose |
|--------|---------|
| Games discovered per session | Engagement |
| Average session length | Retention |
| Rooms visited before first game | Onboarding effectiveness |
| Puzzle completion rate | Difficulty balance |
| Hint usage frequency | Stuck points |
| Drop-off points | UX issues |
| Most/least discovered games | Content distribution |
| Commands used | Feature usage |

### 14.2 A/B Testing Opportunities

- Different starting areas
- Puzzle difficulty levels
- Hint aggressiveness
- Game density per room
- NPC helpfulness

---

## 15. Future Expansion Ideas

### 15.1 Phase 2 Features

- **Multiplayer Trading:** Trade discovered games with friends
- **Daily Challenges:** Special puzzle rooms that reset daily
- **Leaderboards:** Fastest completion, most efficient paths
- **Custom Dungeons:** Let users create and share layouts
- **Voice Commands:** "Hey Claude, go north" integration

### 15.2 Content Expansion

- Seasonal events (Halloween haunted arcade, etc.)
- Platform-specific zones (Game Boy Basement, TurboGrafx Tower)
- Developer cameos as NPCs
- Meta-puzzles spanning multiple playthroughs
- Achievement-based unlockable zones

---

## 16. Sample Content

### 16.1 Sample Room Descriptions

**Arcade Atrium - Token Counter**
```
The main counter dominates this room, its glass case 
displaying faded prizes from decades past. A TOKEN MACHINE 
hums in the corner, its coin slot glinting invitingly. Behind 
the counter, you spot a DUSTY LEDGER and an OLD PHOTOGRAPH 
pinned to the wall. The ATTENDANT watches you with knowing eyes.

Exits: NORTH (to Cabinet Row), SOUTH (to Entrance)
```

**Platformer Peaks - Cloud Platform**
```
You stand on a platform made entirely of pixelated clouds, 
swaying gently in an impossible breeze. Far below, you can 
see other platforms dotting the void. A QUESTION MARK BLOCK 
floats just within reach, and a WORN ROPE BRIDGE leads 
eastward to a crumbling tower.

Exits: EAST (rope bridge), DOWN (long drop!)
```

**RPG Archives - The Card Catalog**
```
Towering wooden drawers stretch from floor to ceiling, each 
labeled with cryptic symbols. The air smells of old paper and 
possibility. An ANCIENT TERMINAL sits on a reading desk, its 
green cursor blinking patiently. A WISE OWL perches atop the 
highest cabinet, watching your every move.

Exits: WEST (Main Hall), NORTH (locked - requires Library Card)
```

### 16.2 Sample Puzzle

**The Konami Lock**
```yaml
name: "The Konami Lock"
zone: "8-Bit Basement"
difficulty: 2
type: "sequence"

description: |
  An old security panel blocks the door to the Developer's 
  Vault. It has a directional pad and two buttons labeled 
  'B' and 'A', plus a 'START' button.

clue:
  location: "Poster in Gaming History Hall"
  text: |
    "The Code That Changed Everything
     ↑ ↑ ↓ ↓ ← → ← → B A
     'Kazuhisa Hashimoto, 1986'"

solution:
  action: "enter sequence"
  answer: "up up down down left right left right b a start"

hints:
  - "That poster about the famous code might help..."
  - "It's the most famous cheat code in gaming history. Try entering it on the panel."

success_text: |
  The panel beeps triumphantly and the door slides open with 
  a satisfying *ka-chunk*. Inside the vault, decades of gaming 
  history await...

rewards:
  - access: "developers_vault"
  - games: ["contra", "gradius"]
```

### 16.3 Sample NPC

```yaml
name: "The Speedrunner's Ghost"
zone: "Platformer Peaks"
type: "lore_master"

personality: |
  Speaks rapidly, obsessed with efficiency and frame-perfect 
  timing. Refers to everything in speedrunning terminology. 
  Friendly but impatient.

dialogue:
  greeting:
    - "Whoa whoa whoa—you're WAY off the optimal path! Let me help you route this."
    - "Another runner? Your movement's a bit sluggish but I see potential."
    - "This is a pretty good split, actually. You might PB today!"
    
  idle:
    - "Did you know there's a frame-perfect trick through that wall? No? ...nevermind."
    - "I've been running this dungeon for years. My best time is 47:32."
    - "The RNG in this place is brutal, but you can manipulate it if you—ah, forget it."
    
  hints:
    - "The cloud platforms cycle every 8 seconds. Time your jumps."
    - "There's a skip in the Mushroom Caverns. Look for the false wall."

  gives:
    item: "Speedrunner's Watch"
    condition: "Visit 20 rooms in under 100 moves"
    dialogue: "Impressive pace! Take this—it shows your move count."
```

---

## 17. Launch Checklist

### MVP Requirements
- [ ] 4 zones (subset of 8) with ~50 rooms total
- [ ] 50 games distributed as initial content
- [ ] Core command parser (15 verbs)
- [ ] 10 puzzles of varying difficulty
- [ ] 5 NPCs with basic dialogue
- [ ] Save/load system
- [ ] Basic map view
- [ ] Inventory system
- [ ] Game discovery celebration UI
- [ ] Help system and tutorial

### Post-MVP
- [ ] Remaining 4 zones
- [ ] Full 200 games
- [ ] Advanced puzzles
- [ ] More NPCs and quests
- [ ] Achievements system
- [ ] Analytics integration
- [ ] Accessibility audit
- [ ] Performance optimization

---

## Appendix A: Command Reference Quick Sheet

```
MOVEMENT          INTERACTION        ITEMS              META
─────────────────────────────────────────────────────────────
north/n           look/l             inventory/i        help/?
south/s           examine/x [thing]  take/get [item]    map/m
east/e            use [item]         drop [item]        journal/j
west/w            use [X] on [Y]     combine [X] [Y]    collection
up/u              open/close [thing]                    save
down/d            push/pull [thing]                     hint
                  talk to [npc]
                  read [thing]
                  blow on [item]
```

---

*Document Version: 1.0*
*Last Updated: 2024*
*Author: Game Discovery Team*
