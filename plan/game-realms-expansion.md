# Game Realms: Virtual World Portal System

## Expansion Module for Retro Realm Text Adventure

---

## 1. Concept Overview

When players discover a game in the dungeon, they don't just add it to a collection—they can **enter the game world** through a portal and experience a condensed text-adventure version of that game. Each Game Realm is a self-contained mini-adventure with genre-appropriate mechanics, puzzles, and descriptions.

### The Portal Experience

```
> use cartridge on arcade cabinet

You slot the cartridge into the ancient cabinet. The screen 
flickers to life, colors bleeding and swirling. The pixels 
seem to reach out toward you, pulling you closer...

Do you want to ENTER the game world? (yes/no)

> yes

Reality dissolves into scanlines. You feel yourself 
fragmenting into pixels, reassembling in a world of 
pure color and possibility...

═══════════════════════════════════════════════════════════
  ENTERING: SONIC THE HEDGEHOG
  Platform: Sega Genesis (1991)
═══════════════════════════════════════════════════════════

GREEN HILL ZONE - ACT 1

Checkered hills roll endlessly under an impossibly blue sky. 
Palm trees sway in a pixelated breeze. You feel... fast. 
Incredibly fast. Golden RINGS float in the air ahead, 
spinning invitingly. A SPRING PAD gleams on the ground. 
In the distance, a BADNIK patrols back and forth.

Your RING COUNT: 0
Exits: FORWARD (loop-de-loop), UP (floating platform)

> _
```

---

## 2. Game Realm Structure

### 2.1 Realm Anatomy

Each Game Realm consists of:

```
GAME REALM
├── Entry Point (always same starting location)
├── Phases (2-5 depending on complexity)
│   ├── Phase 1: Introduction / Tutorial feel
│   ├── Phase 2: Core mechanic exploration
│   ├── Phase 3: Challenge / Complication
│   └── Phase 4: Resolution / Boss / Finale
├── Genre Mechanics (unique to game type)
├── Collectibles (optional bonus discoveries)
├── Exit Condition (complete phases OR find exit)
└── Rewards (achievements, items, lore)
```

### 2.2 Phase System

Players progress through phases that mirror the game's actual structure:

| Game Type | Phase Structure | Example |
|-----------|-----------------|---------|
| Platformer | Zones/Acts | Green Hill → Marble Zone → Boss |
| RPG | Story Beats | Village → Dungeon → Boss → Resolution |
| Racing | Laps/Tracks | Qualifying → Race → Final Lap |
| Fighter | Rounds | Opponent 1 → Opponent 2 → Champion |
| Puzzle | Levels | Easy → Medium → Hard → Bonus |
| Adventure | Chapters | Mystery Setup → Investigation → Revelation |
| Shooter | Stages | Wave 1 → Wave 2 → Boss Wave |
| Sports | Periods/Innings | First Half → Second Half → Overtime |

### 2.3 Realm Data Structure

```typescript
interface GameRealm {
  gameId: string;                    // Links to actual game
  realmId: string;
  
  metadata: {
    title: string;
    platform: string;
    year: number;
    genre: GenreType;
    estimatedTime: string;           // "5-10 minutes"
    difficulty: 1 | 2 | 3;
  };
  
  mechanics: GenreMechanics;         // Genre-specific systems
  
  phases: Phase[];
  
  entry: {
    location: string;
    description: string;
    tutorialHints: string[];         // First-time help
  };
  
  exit: {
    condition: ExitCondition;
    description: string;
    rewards: Reward[];
  };
  
  collectibles: Collectible[];       // Optional bonus items
  
  lore: {
    beforeEntry: string;             // Teaser text
    afterComplete: string;           // Reflection/trivia
    developerNote?: string;          // Real-world game fact
  };
}

interface Phase {
  id: string;
  name: string;                      // "Green Hill Zone - Act 1"
  locations: RealmLocation[];
  objective: string;                 // What player needs to do
  completionTrigger: string;         // What ends this phase
  transitionText: string;            // Text when moving to next phase
}

interface RealmLocation {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  
  // Genre-specific state displayed here
  statusDisplay?: {
    template: string;                // "RINGS: {rings} | LIVES: {lives}"
    values: object;
  };
  
  exits: RealmExit[];
  interactions: RealmInteraction[];
  hazards?: Hazard[];
  enemies?: Enemy[];
  items?: RealmItem[];
}
```

---

## 3. Genre Mechanics Systems

Each genre has unique mechanics that change how the text adventure plays:

### 3.1 Platformer Mechanics

```typescript
interface PlatformerMechanics {
  type: 'platformer';
  
  stats: {
    lives: number;                   // Usually 3
    rings?: number;                  // Sonic-style protection
    coins?: number;                  // Mario-style currency
    powerUp?: string;                // Current power-up
  };
  
  actions: {
    jump: {
      description: "Leap into the air";
      contexts: ['gap', 'platform', 'enemy_above', 'item_above'];
    };
    run: {
      description: "Move quickly forward";
      contexts: ['straightaway', 'loop', 'ramp'];
    };
    spin?: {                         // Sonic-specific
      description: "Curl into a ball";
      contexts: ['enemy', 'breakable'];
    };
    stomp?: {                        // Mario-specific
      description: "Ground pound";
      contexts: ['enemy', 'brick', 'switch'];
    };
  };
  
  hazards: {
    pit: { damage: 'instant_death', avoidedBy: 'jump' };
    spikes: { damage: 'hit', avoidedBy: 'jump_over' };
    enemy: { damage: 'hit', avoidedBy: ['jump_on', 'spin', 'avoid'] };
  };
  
  progression: {
    checkpoints: boolean;
    actStructure: boolean;           // Acts within zones
    bossAtEnd: boolean;
  };
}
```

**Example Platformer Interaction:**

```
GREEN HILL ZONE - LOOP SECTION

A massive loop-de-loop stretches before you, its checkered 
surface gleaming. You can feel the potential energy in your 
legs. A row of RINGS traces the loop's arc. Below the loop's 
entrance, a SPIKE PIT waits hungrily.

RINGS: 15 | LIVES: 3
Exits: FORWARD (through loop), BACK

> run forward

You burst into motion, legs becoming a blur. The world tilts 
as you race up the loop's curve, gravity losing its grip. 
For a glorious moment you're upside down, rings flying into 
your possession, before momentum carries you down the other 
side and launches you off a ramp!

[+8 RINGS collected!]

You land on a floating platform. Below, you see the zone's 
exit, guarded by a patrolling CRABMEAT badnik.

RINGS: 23 | LIVES: 3
Exits: DOWN (to exit area), FORWARD (bonus rings)
```

---

### 3.2 RPG Mechanics

```typescript
interface RPGMechanics {
  type: 'rpg';
  
  stats: {
    hp: number;
    maxHp: number;
    mp?: number;
    maxMp?: number;
    level: number;
    gold: number;
    exp: number;
  };
  
  party?: {
    members: PartyMember[];
    activeSize: number;
  };
  
  combat: {
    turnBased: boolean;
    actions: ['attack', 'magic', 'item', 'defend', 'flee'];
    
    attack: {
      description: "Strike with equipped weapon";
      damage: 'strength_based';
    };
    magic: {
      spells: Spell[];
      resource: 'mp';
    };
  };
  
  dialogue: {
    choices: boolean;                // Can choose responses
    affectsOutcome: boolean;         // Choices matter
    keywords: string[];              // Things to ASK ABOUT
  };
  
  exploration: {
    townPhase: boolean;              // Safe areas to explore
    dungeonPhase: boolean;           // Dangerous areas
    worldMap: boolean;               // Overworld travel
  };
}
```

**Example RPG Interaction:**

```
CORNELIA - TOWN SQUARE

The kingdom's capital bustles with life. MERCHANTS hawk 
their wares from wooden stalls. A grand CASTLE looms to 
the north, its flags bearing the royal crest. To the east, 
a weathered CHURCH offers sanctuary. TOWNSPEOPLE gossip 
in small groups, their words carrying rumors of darkness.

HP: 45/50 | MP: 12/15 | GOLD: 230
Party: Warrior, Thief, White Mage, Black Mage

What do you do?

> talk to townspeople

A worried farmer approaches: "Heroes! The GARLAND has 
kidnapped Princess Sara! The King is beside himself. 
Please, you must go to the CHAOS SHRINE to the north!"

A merchant whispers: "I hear Garland was once a knight 
of the realm. What could have turned him to darkness?"

[QUEST UPDATED: Rescue Princess Sara from the Chaos Shrine]

> go north

You approach the castle gates. The guards recognize you 
as the Warriors of Light and bow deeply.

"The King awaits you in the throne room. Please, hurry!"

Do you ENTER the castle or go elsewhere?
```

---

### 3.3 Racing Mechanics

```typescript
interface RacingMechanics {
  type: 'racing';
  
  stats: {
    position: number;                // Current place
    lap: number;
    totalLaps: number;
    boost?: number;                  // Nitro/mushroom charges
    coins?: number;                  // Mario Kart style
  };
  
  vehicle: {
    speed: 'low' | 'medium' | 'high';
    acceleration: 'low' | 'medium' | 'high';
    handling: 'low' | 'medium' | 'high';
  };
  
  actions: {
    accelerate: "Push forward at full speed";
    brake: "Slow down for tight corners";
    drift: "Slide through corners for boost";
    boost: "Use stored boost power";
    item?: "Use collected item";
  };
  
  track: {
    segments: TrackSegment[];        // Straightaway, curve, jump, etc.
    hazards: ['oil', 'wall', 'opponent', 'obstacle'];
    items?: string[];                // Collectible power-ups
  };
}
```

**Example Racing Interaction:**

```
MUTE CITY - LAP 2/3

Your Blue Falcon screams across the neon-lit track at 
blistering speed. The track ahead CURVES SHARPLY to the 
right before a JUMP RAMP. You're neck and neck with the 
FIRE STINGRAY. A BOOST PAD gleams on the inside of the 
upcoming curve. Your energy meter pulses—one hit and 
you're out!

POSITION: 2nd | LAP: 2/3 | ENERGY: ████████░░

The curve approaches fast!

> drift right

You wrench the controls, your craft sliding sideways in 
a controlled drift. Sparks fly as you clip the boost pad!

[BOOST CHARGED!]

The Fire Stingray takes the outside line. You emerge 
from the curve AHEAD by a nose! The jump ramp looms.

POSITION: 1st | LAP: 2/3 | ENERGY: ████████░░ | BOOST: READY

> jump and boost

You hit the ramp and LAUNCH into the Mute City skyline, 
buildings blurring below. At the apex, you trigger your 
boost—

WHOOOOSH!

You rocket forward, landing perfectly on the track ahead 
with a commanding lead! The final lap beacon flashes!

═══ FINAL LAP ═══
```

---

### 3.4 Fighting Game Mechanics

```typescript
interface FightingMechanics {
  type: 'fighter';
  
  stats: {
    health: number;
    maxHealth: number;
    specialMeter?: number;
    roundsWon: number;
    roundsNeeded: number;
  };
  
  opponent: {
    name: string;
    health: number;
    pattern: string[];               // Predictable moves
    weakness?: string;
  };
  
  moves: {
    // Basic moves
    punch: { damage: 10, speed: 'fast' };
    kick: { damage: 15, speed: 'medium' };
    block: { effect: 'reduce_damage' };
    
    // Special moves (game-specific)
    special: {
      name: string;                  // "Hadouken"
      input: string;                 // "down, forward, punch"
      damage: number;
      cost?: number;                 // Special meter
    }[];
  };
  
  combat: {
    turnBased: false;                // Real-time feeling
    readOpponent: boolean;           // Can observe tells
    comboSystem: boolean;
  };
}
```

**Example Fighting Interaction:**

```
WORLD WARRIOR TOURNAMENT - ROUND 2

You face BLANKA in the Brazilian jungle. Vines hang from 
ancient trees. Blanka crouches, electricity crackling 
across his green skin. His eyes are wild but there's 
something almost sad in them.

YOUR HEALTH:  ████████████████████░░░░ 
BLANKA:       ██████████████░░░░░░░░░░

Blanka is CHARGING UP—electricity building around him!

Your move?

> block

You raise your guard just as Blanka EXPLODES forward 
with an Electric Thunder! The shock courses through 
your block—painful but survivable.

[-15 health, reduced from -30]

Blanka lands, momentarily vulnerable from the attack!

YOUR HEALTH:  ███████████████░░░░░░░░░
BLANKA:       ██████████████░░░░░░░░░░

He's open! Quick!

> hadouken

You plant your feet, channel your ki, thrust your palms 
forward—"HADOUKEN!"

A blazing blue fireball streaks across the arena, 
striking Blanka square in the chest!

[-25 damage! CRITICAL HIT - caught during recovery!]

BLANKA: ████████░░░░░░░░░░░░░░░░

Blanka roars in frustration and begins circling warily.
```

---

### 3.5 Adventure/Point-and-Click Mechanics

```typescript
interface AdventureMechanics {
  type: 'adventure';
  
  inventory: {
    items: AdventureItem[];
    maxSize: number;
    combinable: boolean;
  };
  
  actions: {
    look: "Examine something closely";
    take: "Pick up an item";
    use: "Use item on something";
    combine: "Combine two items";
    talk: "Speak with character";
    give: "Give item to character";
  };
  
  puzzleTypes: [
    'inventory_combination',         // Use A on B
    'dialogue_tree',                 // Say right thing
    'environmental',                 // Notice and interact
    'logic',                         // Deduce solution
    'sequence'                       // Do things in order
  ];
  
  verbCoin?: boolean;                // LucasArts style interface
}
```

**Example Adventure Interaction:**

```
SCABB ISLAND - THE BLOODY LIP BAR

Smoke hangs thick in this pirate dive. A BARTENDER 
polishes glasses with a filthy rag, eyeing you 
suspiciously. In the corner, a GRIZZLED PIRATE nurses 
his grog. A MAP is pinned to the wall behind the bar. 
A CHANDELIER made of old bottles sways overhead.

Inventory: Rubber Chicken, Piece of String, Library Card

> look at map

You squint at the map. It shows Scabb Island in detail, 
but someone has marked an X near the cemetery with the 
words "RAPP SCALLION" written beside it.

Interesting. That name sounds familiar...

> talk to bartender

The bartender grunts. "We don't serve your type here."

"What type is that?"

"Living. Now buy something or get out."

[You can ASK ABOUT: Rapp Scallion, Map, Grog, Pirates]

> ask about rapp scallion

The bartender's eyes narrow. "Rapp Scallion? Now that's 
a name I haven't heard in years. He was a cook here, 
long ago. Died in a fire, they say. Buried in the 
cemetery." He leans closer. "But sometimes, late at 
night, folks say they can still smell his weenie stew..."

[CLUE ADDED: Rapp Scallion buried in cemetery]
```

---

### 3.6 Shooter Mechanics

```typescript
interface ShooterMechanics {
  type: 'shooter';
  
  stats: {
    lives: number;
    bombs?: number;                  // Screen-clear power
    powerLevel: number;              // Weapon strength
    score: number;
  };
  
  weapons: {
    current: WeaponType;
    available: WeaponType[];
    ammo?: number;                   // If limited
  };
  
  actions: {
    shoot: "Fire current weapon";
    dodge: "Evade incoming fire";
    bomb: "Deploy screen-clearing bomb";
    focus?: "Slow movement for precision";
  };
  
  waves: {
    current: number;
    enemies: Enemy[];
    boss?: BossEnemy;
    patterns: string[];              // Bullet patterns to describe
  };
}
```

**Example Shooter Interaction:**

```
STAGE 3: ASTEROID FIELD

Your R-9 fighter weaves through the debris field. 
Bydo Empire forces swarm from all directions! 

Three SCOUT SHIPS approach in formation from above.
A MINE floats lazily to your left.
Your FORCE pod orbits protectively.

POWER: ████░░ | LIVES: 2 | BOMBS: 1

Enemy formation incoming!

> shoot scouts

You unleash a stream of energy bolts! Your Force pod 
amplifies the blast, creating a wave of destruction!

[SCOUT SHIPS DESTROYED +300 pts]

But as the debris clears, a massive shadow blocks 
the stars. A BATTLESHIP emerges from the asteroid 
field, its cannon ports glowing with charging energy!

══════════════════════════════════════════════════
  WARNING: APPROACHING ENEMY BATTLESHIP
══════════════════════════════════════════════════

The battleship opens fire—a SPREAD of energy orbs 
fans out toward you!

> dodge down and shoot

You dive, the deadly projectiles screaming past your 
cockpit. Your return fire scores hits on the 
battleship's hull, but its armor is thick!

BATTLESHIP HEALTH: ████████████████░░░░

The cannon ports are charging again. You notice the 
CORE is briefly exposed when it fires...
```

---

### 3.7 Puzzle Game Mechanics

```typescript
interface PuzzleMechanics {
  type: 'puzzle';
  
  stats: {
    level: number;
    score: number;
    movesRemaining?: number;         // If limited
    timeRemaining?: number;          // If timed
  };
  
  puzzleState: {
    grid?: any[][];                  // For Tetris, etc.
    elements?: PuzzleElement[];      // Moveable pieces
    goal: string;                    // Win condition
  };
  
  actions: {
    move: "Move piece/cursor";
    rotate?: "Rotate piece";
    drop?: "Drop piece quickly";
    swap?: "Swap adjacent elements";
    select?: "Select element";
  };
}
```

**Example Puzzle Interaction:**

```
LEVEL 15 - TETRIS

The well is filling up. Blocks are stacked precariously, 
a jagged skyline of Tetriminos. A gap on the left side 
runs four rows deep—you've been building for a TETRIS!

Current piece: I-BLOCK (the long one!)
Next piece: S-BLOCK

   WELL           NEXT
┌──────────┐    ┌────┐
│          │    │ ▓▓ │
│          │    │▓▓  │
│          │    └────┘
│          │    
│        ▓▓│    
│       ▓▓▓│    SCORE
│  ▓    ▓▓▓│    12,450
│▓▓▓  ▓▓▓▓▓│    
│▓▓▓▓ ▓▓▓▓▓│    LEVEL
│▓▓▓▓ ▓▓▓▓▓│    15
│▓▓▓▓ ▓▓▓▓▓│    
└──────────┘    

Perfect! The I-block could clear four lines!

> rotate and move left

You spin the I-block horizontal—no wait, you need it 
VERTICAL for the Tetris! 

> rotate vertical

The long piece stands tall, ready to drop.

> drop left

The I-block falls, sliding perfectly into the four-row 
gap!

╔═══════════════════════════════════════╗
║  ★ T E T R I S ! ★  (+1200 pts)      ║
╚═══════════════════════════════════════╝

Four lines flash and vanish! The stack collapses down, 
buying you precious breathing room!

SCORE: 13,650 | LEVEL 15 → 16

The music speeds up. An S-block descends...
```

---

## 4. Realm Entry & Exit System

### 4.1 Entry Methods

Players can enter Game Realms through:

| Method | Location | Requirement |
|--------|----------|-------------|
| **Arcade Cabinet** | Arcade Atrium | Insert cartridge |
| **Portal Console** | Any zone hub | Have game in collection |
| **Dream Sequence** | Rest areas | Random unlocked game |
| **NPC Invitation** | Lore Master NPCs | Complete their quest |

### 4.2 Exit Conditions

| Exit Type | Trigger | Reward Level |
|-----------|---------|--------------|
| **Victory** | Complete all phases | Full rewards |
| **Partial** | Complete some phases | Partial rewards |
| **Emergency Exit** | Type `exit` anytime | Minimal rewards |
| **Death/Game Over** | Lose all lives | No rewards, can retry |

### 4.3 Exit Rewards

```typescript
interface RealmRewards {
  // Always granted on entry
  discovery: {
    gameUnlocked: boolean;           // Can play actual game now
    loreUnlocked: string;            // Game history/trivia
  };
  
  // Granted on completion
  completion: {
    achievementId?: string;          // "Defeated Dr. Robotnik"
    dungeonItem?: string;            // Item usable in main dungeon
    tokens: number;                  // Currency for main game
    secret?: string;                 // Hint for main dungeon
  };
  
  // Bonus for optional objectives
  bonus: {
    collectibles: number;            // Found X of Y
    speedBonus: boolean;             // Under par time
    perfectBonus: boolean;           // No deaths
  };
}
```

### 4.4 Post-Realm Experience

```
═══════════════════════════════════════════════════════════
  REALM COMPLETE: SONIC THE HEDGEHOG
═══════════════════════════════════════════════════════════

Reality reasserts itself. You find yourself back in the 
dungeon, the arcade cabinet's screen now dark. But 
something has changed—you feel faster, more confident.

COMPLETION STATS:
├── Zones Cleared: 3/3 (Green Hill, Marble, Boss)
├── Rings Collected: 147
├── Time: 8:32
└── Rating: ★★★☆☆ (Good!)

REWARDS EARNED:
├── [UNLOCKED] Sonic the Hedgehog - Now playable!
├── [ITEM] Speed Sneakers - Move faster in dungeon
├── [TOKENS] +15 Arcade Tokens
└── [LORE] "The Making of Green Hill Zone"

ACHIEVEMENT UNLOCKED: "Gotta Go Fast"
Complete a Sonic realm in under 10 minutes.

The cabinet hums contentedly. Other games await...

[CONTINUE EXPLORING]
```

---

## 5. Phase Transitions

### 5.1 Transition Types

**Smooth Transitions** (same area, different scene):
```
You reach the end of Act 1. The landscape shifts 
subtly—the hills grow steeper, the badniks more 
numerous. A checkpoint sign marks your progress.

═══ GREEN HILL ZONE - ACT 2 ═══
```

**Dramatic Transitions** (major area change):
```
You step through the cave exit and gasp. Gone are the 
checkered hills—before you stretches an ancient ruin, 
lava bubbling in pools between crumbling columns.

══════════════════════════════════════════════════════
  ENTERING: MARBLE ZONE
══════════════════════════════════════════════════════
```

**Boss Transitions**:
```
The ground trembles. Trees shake. A massive shadow 
falls over you as a mechanical monstrosity descends 
from the sky. Inside its glass cockpit, a rotund 
figure cackles maniacally!

══════════════════════════════════════════════════════
  BOSS BATTLE: DR. ROBOTNIK
  "You persistent little hedgehog!"
══════════════════════════════════════════════════════
```

### 5.2 Phase Memory

State persists between phases within a realm visit:

```typescript
interface RealmSessionState {
  currentPhase: number;
  phaseStates: {
    [phaseId: string]: {
      completed: boolean;
      collectiblesFound: string[];
      secretsFound: string[];
      deathCount: number;
    }
  };
  
  // Carries between phases
  persistent: {
    lives: number;
    resources: object;               // Rings, coins, etc.
    powerUps: string[];
    inventory?: string[];            // For adventure games
  };
  
  // For retry
  checkpoints: {
    phaseId: string;
    locationId: string;
    state: object;
  }[];
}
```

---

## 6. AI Prompt Templates for Realm Generation

### 6.1 Realm Overview Generator

```markdown
## GAME REALM GENERATION PROMPT

Generate a text adventure realm for a retro game.

**Game Information:**
- Title: {game_title}
- Platform: {platform}
- Year: {year}
- Genre: {genre}
- Brief Description: {game_description}

**Requirements:**
1. Create 3-4 phases that capture the game's essence
2. Design genre-appropriate mechanics (see mechanics guide)
3. Include iconic elements fans would recognize
4. Balance authenticity with text-adventure playability
5. Create clear objectives for each phase
6. Design a satisfying conclusion/boss encounter

**Output Structure:**
{
  "realmOverview": {
    "entryDescription": "...",
    "theme": "...",
    "mechanics": [...],
    "estimatedDuration": "..."
  },
  "phases": [
    {
      "name": "...",
      "locations": [...],
      "objective": "...",
      "keyMoments": [...]
    }
  ],
  "bossOrFinale": {
    "setup": "...",
    "encounter": "...",
    "victory": "..."
  }
}
```

### 6.2 Location Description Generator

```markdown
## REALM LOCATION PROMPT

Generate a location description for a game realm.

**Context:**
- Game: {game_title}
- Genre: {genre}
- Phase: {current_phase}
- Location Name: {location_name}
- Purpose: {tutorial | exploration | challenge | boss}

**Present in Location:**
- Enemies: {enemy_list}
- Items: {item_list}
- Interactive Elements: {elements}
- Exits: {exits}

**Player State:**
{current_stats}

**Requirements:**
1. 2-3 sentences of atmospheric description
2. Match the game's visual/tonal style
3. Highlight interactive elements naturally
4. Show current status display appropriate to genre
5. End with clear exit options
6. If enemies present, describe their current behavior

**Output:**
{location_description}

{status_display}
{exits_display}
```

### 6.3 Genre-Specific Action Generator

```markdown
## ACTION RESPONSE PROMPT

Generate the response to a player action in a game realm.

**Context:**
- Game: {game_title}
- Genre: {genre}
- Current Location: {location}
- Player Action: {action_input}
- Valid Action: {yes/no}

**If Invalid:**
- Provide helpful redirection
- Stay in character/theme
- Suggest valid alternatives

**If Valid:**
- Action Type: {action_type}
- Target: {target}
- Expected Outcome: {outcome}
- State Changes: {state_changes}

**Requirements:**
1. Response should feel authentic to the game
2. Include visceral/exciting language for action games
3. Include atmospheric detail for adventure games
4. Show mechanical results (damage, items, etc.)
5. Set up next decision point
6. Vary sentence structure and length

**Output:**
{action_response}
{new_status_display}
{new_situation}
```

### 6.4 Boss Encounter Generator

```markdown
## BOSS ENCOUNTER PROMPT

Generate a boss battle sequence for a game realm.

**Context:**
- Game: {game_title}
- Boss Name: {boss_name}
- Boss Description: {boss_description}
- Boss Mechanics: {attack_patterns}
- Victory Condition: {how_to_win}

**Battle Structure:**
1. Introduction (dramatic entrance)
2. Phase 1 (learn the pattern)
3. Phase 2 (increased difficulty)
4. Desperation (boss at low health)
5. Victory (satisfying conclusion)

**Requirements:**
1. Make the boss feel threatening but fair
2. Telegraph attacks so player can respond
3. Include iconic moves/quotes if applicable
4. Build tension through the phases
5. Provide cathartic victory moment
6. Reference game's actual boss if possible

**Output JSON:**
{
  "introduction": "...",
  "phases": [
    {
      "healthThreshold": "...",
      "attackPatterns": [...],
      "vulnerabilities": [...],
      "dialogue": "..."
    }
  ],
  "victory": {
    "description": "...",
    "rewards": [...]
  }
}
```

---

## 7. Cross-System Integration

### 7.1 Dungeon ↔ Realm Connections

Items and knowledge can flow between systems:

| From Dungeon | Affects Realm |
|--------------|---------------|
| Hint Scroll | Reveals boss weakness |
| Power Token | Extra life in realm |
| Lore Book | Unlocks secret area |

| From Realm | Affects Dungeon |
|------------|-----------------|
| Speed Shoes | Faster dungeon movement |
| Boss Key | Opens special dungeon doors |
| Character Ally | NPC appears in dungeon |

### 7.2 Realm Hints in Dungeon

Before discovering a game, players might find hints:

```
> examine poster

The faded poster shows a blue hedgehog mid-jump, 
golden rings trailing behind him. "COMING SOON" 
is stamped across it—though "soon" was clearly 
decades ago. 

You feel a strange longing to RUN...

[This poster hints at a discoverable game nearby]
```

### 7.3 Post-Realm Dungeon Effects

```
// After completing Sonic realm:
You notice you're moving through the dungeon faster 
than before. The Speed Sneakers from Green Hill Zone 
seem to work even in this reality!

[PASSIVE BONUS: Movement efficiency +25%]
```

---

## 8. Example Complete Realm: The Legend of Zelda

### Overview

```yaml
game: "The Legend of Zelda"
platform: "NES"
year: 1986
genre: "Action-Adventure"
phases: 4
estimatedTime: "12-15 minutes"
```

### Phase 1: The Beginning

```
═══════════════════════════════════════════════════════════
  ENTERING: THE LEGEND OF ZELDA
  Platform: NES (1986)
═══════════════════════════════════════════════════════════

OVERWORLD - STARTING SCREEN

You stand at the mouth of a cave, the vast land of 
Hyrule stretching before you. Brown mountains frame 
a world of green forests and blue lakes. An OLD MAN 
stands within the cave's darkness, a faint glow 
emanating from something he holds.

"It's dangerous to go alone! Take this."

HEARTS: ♥♥♥
Inventory: (Empty)

Exits: NORTH, EAST, WEST, CAVE

> enter cave

The old man holds out a WOODEN SWORD, its blade 
gleaming despite its age.

"Take this sword... it's dangerous to go alone."

Do you TAKE the sword?

> take sword

You grasp the sword. It feels right in your hands, 
like it was waiting for you. The old man nods.

"Save Hyrule, hero. Save the princess."

[OBTAINED: Wooden Sword]

HEARTS: ♥♥♥
Inventory: Wooden Sword

The cave has nothing more to offer. Hyrule awaits.
```

### Phase 2: Exploration

```
OVERWORLD - FOREST CLEARING

Trees press close on all sides. OCTOROKS hop through 
the grass, spitting rocks in your direction. A FAIRY 
FOUNTAIN sparkles to the east. To the north, you see 
the entrance to a DUNGEON carved into a hillside, 
marked with the number "1".

Three Octoroks block your path!

HEARTS: ♥♥♡
Inventory: Wooden Sword, 15 Rupees

> attack octoroks

You swing your sword in a wide arc! 

*SLASH!*

Two Octoroks pop into smoke, leaving behind glittering 
RUPEES. The third hops backward, preparing to spit!

[+5 Rupees collected!]

> attack

You thrust forward, catching the final Octorok mid-spit!

*POOF*

The clearing is safe. A small KEY glints in the grass 
where the last enemy fell.

[OBTAINED: Small Key]

HEARTS: ♥♥♡
Inventory: Wooden Sword, Small Key, 20 Rupees
```

### Phase 3: The Dungeon

```
DUNGEON 1 - EAGLE

You descend into darkness. Torches flicker on damp 
stone walls, casting dancing shadows. The dungeon 
stretches before you—a maze of rooms holding 
monsters, treasures, and somewhere... a piece of 
the Triforce.

DUNGEON ENTRANCE

Stone walls drip with moisture. Two STALFOS—skeleton 
warriors—pace the room, their bones clacking. A 
LOCKED DOOR bars the way north. An open passage 
leads east.

HEARTS: ♥♥♥ (healed at fountain)
Inventory: Wooden Sword, Small Key, 35 Rupees
MAP: [░░░]
     [░▓░] ← You are here
     [░░░]

> attack stalfos

You charge the skeleton warriors! Your sword cleaves 
through the first—bones scatter across the floor.

The second Stalfos lunges! You sidestep and counter!

*CRACK!*

Both Stalfos defeated. The room falls silent.

[+10 Rupees]

> use key on door

You insert the key. The ancient lock CLICKS open.

[KEY USED]

The door grinds upward, revealing a larger chamber 
beyond. You hear something large moving in the darkness...
```

### Phase 4: Boss - Aquamentus

```
DUNGEON 1 - BOSS CHAMBER

A massive dragon fills the chamber, its scales 
glinting sickly green in the torchlight. AQUAMENTUS 
turns its horned head toward you, smoke curling from 
its nostrils.

The beast rears back, preparing to unleash a spread 
of fireballs!

═══════════════════════════════════════════════════════════
  BOSS: AQUAMENTUS
  "The dragon guardian of the first Triforce piece"
═══════════════════════════════════════════════════════════

AQUAMENTUS: ████████████████████
YOUR HEARTS: ♥♥♥

Aquamentus ROARS and fires three fireballs in a spread!

> dodge left

You dive left! Two fireballs scorch past you, but 
one clips your shoulder!

[-1 Heart]

The dragon pauses, its mouth still smoking...

YOUR HEARTS: ♥♥♡

> attack

You rush forward, sword raised! The blade bites into 
Aquamentus's snout!

*CRITICAL HIT* - Struck while recovering!

AQUAMENTUS: ████████████░░░░░░░░

The dragon SHRIEKS and rears back, thrashing!

[... battle continues through phases ...]

> attack

With a final, desperate lunge, you drive your sword 
into Aquamentus's heart!

The dragon ROARS—a sound of ages ending—and 
explodes into a cascade of light!

╔═══════════════════════════════════════════════════════╗
║     ★ VICTORY ★                                      ║
║                                                       ║
║     AQUAMENTUS DEFEATED!                              ║
╚═══════════════════════════════════════════════════════╝

Where the dragon stood, a glowing TRIFORCE PIECE 
slowly descends. Golden light fills the chamber.

You reach out and touch the Triforce...

"The hero's journey has begun. Seven more pieces 
await. But for now... rest."

HEARTS: ♥♥ | TRIFORCE: 1/8

[The realm begins to fade around you...]
```

### Realm Complete

```
═══════════════════════════════════════════════════════════
  REALM COMPLETE: THE LEGEND OF ZELDA
═══════════════════════════════════════════════════════════

The golden light fades. You stand in the dungeon once 
more, the old arcade cabinet's screen dark. In your 
hand, you hold a small HEART CONTAINER that wasn't 
there before.

COMPLETION STATS:
├── Dungeon Cleared: Level 1 - Eagle
├── Enemies Defeated: 23
├── Rupees Collected: 87
├── Secrets Found: 2/4
├── Deaths: 1
└── Rating: ★★★★☆ (Great!)

REWARDS EARNED:
├── [UNLOCKED] The Legend of Zelda - Now playable!
├── [ITEM] Heart Container - +1 max inventory slot
├── [TOKENS] +25 Arcade Tokens
├── [LORE] "Shigeru Miyamoto's Childhood Caves"
└── [HINT] "The old man appears elsewhere in this dungeon..."

ACHIEVEMENT UNLOCKED: "It's Dangerous to Go Alone"
Complete your first Zelda realm.

The Triforce symbol glows faintly on the cabinet's 
bezel. Other legends await their hero...

[CONTINUE EXPLORING]
```

---

## 9. Scaling & Content Management

### 9.1 Realm Complexity Tiers

Not every game needs an elaborate realm:

| Tier | Phases | Depth | Games |
|------|--------|-------|-------|
| **Full** | 4-5 | Complete experience | Major titles (20%) |
| **Standard** | 2-3 | Core experience | Most games (50%) |
| **Quick** | 1 | Single scene | Minor titles (30%) |

### 9.2 Quick Realm Example

For simpler or less-known games:

```
═══════════════════════════════════════════════════════════
  ENTERING: BALLOON FIGHT
  Platform: NES (1985)
═══════════════════════════════════════════════════════════

BALLOON TRIP

You float through an endless night sky, two balloons 
keeping you aloft. Stars twinkle. Below, an ocean of 
clouds conceals danger. SPARKS drift lazily, deadly 
to the touch. BALLOONS float ahead—pop them for points!

BALLOONS: ●● | SCORE: 0

The peaceful journey stretches before you...

> fly forward

You pump your arms, drifting through the starfield. 
A SPARK crackles to your left!

> dodge right

You veer away, narrowly avoiding the electricity!

[Continue floating through obstacles for ~5 moves]

══════════════════════════════════════════════════════════
  REALM COMPLETE: BALLOON FIGHT
══════════════════════════════════════════════════════════

A pleasant journey through simpler times.

SCORE: 12,450

[UNLOCKED] Balloon Fight - Now playable!
[TOKENS] +5 Arcade Tokens

[CONTINUE EXPLORING]
```

---

## 10. Implementation Priorities

### Phase 1 (MVP)
- 10 Full Realms (mix of genres)
- 20 Standard Realms
- 20 Quick Realms
- Core genre mechanics (4 types)
- Basic phase transitions
- Entry/exit system

### Phase 2
- Expand to all 200 games
- All genre mechanics
- Cross-system items
- Achievements
- Secret content

### Phase 3
- User-submitted realm content
- Difficulty modifiers
- Speedrun modes
- Realm leaderboards

---

*Expansion Module Version: 1.0*
*Compatible with: Retro Realm PRD v1.0*
