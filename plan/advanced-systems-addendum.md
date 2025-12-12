# Retro Realm: Advanced Systems Addendum

## Object States, NPC Relationships & Procedural Fairness

---

## 1. Multi-State Object System

### 1.1 State Machine Architecture

Every interactive object can exist in multiple states, each with its own description, available interactions, and contained items.

```typescript
interface StatefulObject {
  id: string;
  name: string;
  aliases: string[];
  
  currentState: string;
  states: {
    [stateName: string]: ObjectState;
  };
  
  // Valid transitions between states
  transitions: StateTransition[];
  
  // Some state changes are permanent
  permanentStates: string[];         // Can't undo these
  
  // Track history for NPCs/puzzles that care
  stateHistory: {
    state: string;
    timestamp: number;
    trigger: string;
  }[];
}

interface ObjectState {
  name: string;
  description: string;               // How it looks in this state
  roomMention: string;               // How it appears in room description
  
  // What's accessible in this state
  revealedItems: string[];           // Items that become visible/takeable
  hiddenItems: string[];             // Items that become hidden
  
  // What you can do in this state
  availableActions: {
    [verb: string]: StateAction;
  };
  
  // Passive effects while in this state
  passiveEffects?: {
    blocksExit?: string;             // Blocks a direction
    revealsExit?: string;            // Shows hidden exit
    ambientSound?: string;           // Atmospheric text
    lightLevel?: 'dark' | 'dim' | 'lit';
  };
}

interface StateTransition {
  from: string;
  to: string;
  trigger: {
    verb: string;                    // "open", "smash", "burn"
    requiresItem?: string;           // "crowbar", "match"
    requiresState?: {                // Another object's state
      objectId: string;
      state: string;
    };
  };
  
  // What happens during transition
  transitionText: string;
  sound?: string;
  
  // Side effects
  sideEffects?: {
    spawnItems?: string[];           // Items appear in room
    destroyItems?: string[];         // Items are destroyed
    alertNPCs?: string[];            // NPCs react
    triggerEvent?: string;           // Game event fires
    modifyRelationship?: {           // NPC relationship change
      npcId: string;
      change: number;
    };
  };
  
  // Can this be undone?
  reversible: boolean;
  reverseTransition?: string;        // Which transition reverses this
}

interface StateAction {
  verb: string;
  response: string;                  // Default response
  
  // Conditional responses
  conditions?: {
    ifHasItem?: string;
    ifNpcPresent?: string;
    ifRelationship?: { npcId: string; min?: number; max?: number };
    response: string;
  }[];
  
  // Does this change state?
  triggersTransition?: string;
  
  // Does this give/take items?
  givesItems?: string[];
  takesItems?: string[];
}
```

### 1.2 Example: The Filing Cabinet

```yaml
object:
  id: "filing_cabinet_01"
  name: "Filing Cabinet"
  aliases: ["cabinet", "drawers", "files"]
  
  currentState: "closed"
  permanentStates: ["smashed", "burned"]
  
  states:
    closed:
      description: "A sturdy metal filing cabinet with three drawers. It looks like it hasn't been opened in years."
      roomMention: "A FILING CABINET stands against the wall."
      revealedItems: []
      hiddenItems: ["dusty_folder", "old_key", "faded_photo"]
      availableActions:
        examine:
          response: "A standard office filing cabinet, gray and utilitarian. The drawers have small labels: 'A-F', 'G-M', 'N-Z'. There's a small LOCK on the top drawer."
        open:
          response: "You try the drawers but they're locked tight. You'd need a key... or another approach."
          conditions:
            - ifHasItem: "cabinet_key"
              response: "You insert the small key and turn. *CLICK* The lock disengages."
              triggersTransition: "closed_to_open"
        kick:
          response: "You give the cabinet a frustrated kick. It wobbles but holds firm. That felt good, though."
        
    open:
      description: "The filing cabinet stands open, its drawers pulled out at various angles. Papers and folders are visible inside."
      roomMention: "An open FILING CABINET reveals scattered documents."
      revealedItems: ["dusty_folder", "faded_photo"]
      hiddenItems: ["old_key"]  # Key is under a false bottom
      availableActions:
        examine:
          response: "The drawers contain mostly useless paperwork - inventory lists, employee schedules from decades past. A DUSTY FOLDER and a FADED PHOTO catch your eye. The bottom drawer feels oddly shallow..."
        close:
          response: "You push the drawers closed. They slide shut with a metallic *clunk*."
          triggersTransition: "open_to_closed"
        search:
          response: "Rifling through the papers, you find mostly junk. But wait - the bottom drawer has a FALSE BOTTOM. Underneath, you find a small KEY!"
          givesItems: ["old_key"]
          triggersTransition: "open_to_searched"
        
    searched:
      description: "The filing cabinet hangs open, its contents disheveled. The false bottom in the lower drawer has been discovered."
      roomMention: "A ransacked FILING CABINET stands open, papers spilling out."
      revealedItems: ["dusty_folder", "faded_photo", "old_key"]
      hiddenItems: []
      availableActions:
        examine:
          response: "You've already thoroughly searched this cabinet. Nothing else of interest remains."
        close:
          response: "You push the drawers closed, though they don't sit quite right anymore."
          triggersTransition: "searched_to_closed_searched"
          
    closed_searched:
      description: "The filing cabinet is closed, but the drawers don't align properly - evidence of your earlier search."
      roomMention: "A slightly damaged FILING CABINET leans against the wall."
      revealedItems: []
      hiddenItems: []
      availableActions:
        open:
          response: "You pull the drawers open again. Nothing new here."
          triggersTransition: "closed_searched_to_searched"
          
    smashed:
      description: "The filing cabinet lies on its side, dented and broken. Papers are scattered across the floor. The drawers hang open at odd angles."
      roomMention: "A SMASHED FILING CABINET lies amid scattered papers."
      revealedItems: ["dusty_folder", "faded_photo", "old_key", "scattered_papers"]
      hiddenItems: []
      passiveEffects:
        ambientSound: "Papers rustle occasionally in the draft."
      availableActions:
        examine:
          response: "The cabinet is destroyed. Amid the wreckage you can see scattered papers, a dusty folder, a faded photo, and... a small key that was hidden in a false bottom."
        search:
          response: "You sift through the debris. Everything that was hidden is now exposed - there's nothing more to find."
          
  transitions:
    - from: "closed"
      to: "open"
      trigger: { verb: "open", requiresItem: "cabinet_key" }
      transitionText: "The key turns smoothly. You pull the drawers open, releasing a cloud of dust and the smell of old paper."
      reversible: true
      
    - from: "closed"
      to: "smashed"
      trigger: { verb: "smash", requiresItem: "crowbar" }
      transitionText: |
        You wedge the crowbar into the top drawer and HEAVE. Metal screams as the cabinet tips, crashes to the floor, and breaks open! Papers explode everywhere. 
        
        Well, it's open now.
      reversible: false
      sideEffects:
        spawnItems: ["scattered_papers"]
        alertNPCs: ["nearby_guard"]
        modifyRelationship:
          npcId: "archivist"
          change: -20
          
    - from: "open"
      to: "searched"
      trigger: { verb: "search" }
      transitionText: "You dig through the papers methodically. Under the false bottom of the lower drawer, your fingers close around a small metal object - a KEY!"
      reversible: false
      sideEffects:
        spawnItems: ["old_key"]
```

### 1.3 State Visualization (For Debug/Design)

```
                    ┌──────────────────┐
                    │     CLOSED       │
                    │  (initial state) │
                    └────────┬─────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           │ open            │ smash           │ burn
           │ (with key)      │ (with crowbar)  │ (with matches)
           ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │    OPEN      │  │   SMASHED    │  │   BURNED     │
    │              │  │  (permanent) │  │  (permanent) │
    └──────┬───────┘  └──────────────┘  └──────────────┘
           │
           │ search
           ▼
    ┌──────────────┐
    │   SEARCHED   │
    │              │
    └──────┬───────┘
           │
           │ close
           ▼
    ┌──────────────┐
    │CLOSED_SEARCHED│
    │              │
    └──────────────┘
```

### 1.4 Multiple Interaction Paths

The same goal can often be achieved through different means:

```yaml
goal: "Get the old_key from the filing cabinet"

paths:
  - name: "Legitimate"
    steps:
      - "Find cabinet_key in manager's office"
      - "Use cabinet_key on cabinet → opens normally"
      - "Search cabinet → find old_key"
    consequences:
      - No NPC relationship changes
      - Cabinet remains usable
      - Clean solution
      
  - name: "Brute Force"
    steps:
      - "Find crowbar in maintenance closet"
      - "Smash cabinet → breaks open, reveals all"
      - "Take old_key from wreckage"
    consequences:
      - Guard is alerted (if nearby)
      - Archivist relationship -20
      - Cabinet destroyed (can't close again)
      - Creates scattered_papers (might be useful/clue?)
      
  - name: "Destructive"
    steps:
      - "Find matches in break room"
      - "Burn cabinet → destroys everything"
      - "Sift through ashes → old_key survives (metal)"
    consequences:
      - Fire alarm triggers (time pressure?)
      - Documents destroyed (lose potential clues)
      - Archivist relationship -50
      - Some items are destroyed (faded_photo, dusty_folder)
      - old_key is scorched but functional
      
  - name: "Social Engineering"
    steps:
      - "Talk to archivist, build relationship to 50+"
      - "Ask archivist about cabinet"
      - "Archivist offers to open it for you"
    consequences:
      - Archivist relationship +10 (they feel helpful)
      - Learn additional lore about cabinet contents
      - Cleanest solution, rewards relationship building
```

### 1.5 Dynamic Room Descriptions

Room descriptions adapt to object states:

```typescript
function generateRoomDescription(room: Room): string {
  let description = room.baseDescription;
  
  // Add object mentions based on their current state
  for (const obj of room.objects) {
    const state = obj.states[obj.currentState];
    description += " " + state.roomMention;
  }
  
  // Add items that are revealed by object states
  const visibleItems = getVisibleItems(room);
  if (visibleItems.length > 0) {
    description += ` You can see ${formatItemList(visibleItems)}.`;
  }
  
  // Add ambient effects from object states
  const ambientEffects = room.objects
    .map(o => o.states[o.currentState].passiveEffects?.ambientSound)
    .filter(Boolean);
  if (ambientEffects.length > 0) {
    description += " " + ambientEffects.join(" ");
  }
  
  return description;
}
```

**Example Output:**

```
STATE: Cabinet closed
─────────────────────────────────────────────────────────
THE ARCHIVE

Dust motes dance in the pale light filtering through 
grimy windows. Shelves of forgotten records line the 
walls. A FILING CABINET stands against the wall. The 
ARCHIVIST sits at a cluttered desk, peering at yellowed 
documents through thick glasses.

Exits: SOUTH (hallway), EAST (restricted section - locked)


STATE: Cabinet smashed, papers scattered
─────────────────────────────────────────────────────────
THE ARCHIVE

Dust motes dance in the pale light filtering through 
grimy windows. Shelves of forgotten records line the 
walls. A SMASHED FILING CABINET lies amid scattered 
papers. Papers rustle occasionally in the draft. You 
can see a DUSTY FOLDER, a FADED PHOTO, an OLD KEY, and 
SCATTERED PAPERS.

The ARCHIVIST glares at you from behind her desk, fury 
barely contained.

Exits: SOUTH (hallway), EAST (restricted section - locked)
```

---

## 2. NPC Relationship System

### 2.1 Relationship Architecture

```typescript
interface NPCRelationship {
  npcId: string;
  
  // Core metrics
  disposition: number;              // -100 to +100, starts at 0
  trust: number;                    // -100 to +100, affects what they share
  fear: number;                     // 0 to 100, affects compliance
  
  // Relationship tier (derived from disposition)
  tier: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';
  
  // Memory of interactions
  memories: NPCMemory[];
  
  // Flags for specific events
  flags: {
    [flagName: string]: boolean;    // "helped_with_quest", "witnessed_crime"
  };
  
  // Conversation state
  conversationTopics: {
    [topic: string]: 'unknown' | 'available' | 'exhausted';
  };
}

interface NPCMemory {
  event: string;                    // What happened
  timestamp: number;
  dispositionChange: number;        // How it affected relationship
  persistent: boolean;              // Does this fade over time?
}

// Disposition thresholds
const DISPOSITION_TIERS = {
  hostile:    { min: -100, max: -50 },   // Will actively hinder
  unfriendly: { min: -49,  max: -20 },   // Won't help, may gossip
  neutral:    { min: -19,  max: 19 },    // Default interactions
  friendly:   { min: 20,   max: 49 },    // Helpful, shares info
  allied:     { min: 50,   max: 100 }    // Goes out of their way
};
```

### 2.2 Relationship Modifiers

```yaml
disposition_events:
  # Positive events
  - event: "completed_quest"
    change: +20
    message: "{npc} beams at you. 'You actually did it!'"
    
  - event: "gave_gift"
    change: +5 to +15  # Depends on gift value
    message: "{npc}'s eyes light up. 'For me? How thoughtful!'"
    
  - event: "helped_in_combat"
    change: +15
    message: "{npc} looks at you with newfound respect."
    
  - event: "shared_information"
    change: +5
    message: "{npc} nods appreciatively at your honesty."
    
  - event: "remembered_name"
    change: +3
    message: "{npc} smiles, pleased you remembered."
    
  # Negative events
  - event: "refused_quest"
    change: -10
    message: "{npc}'s expression falls. 'I see...'"
    
  - event: "caught_stealing"
    change: -30
    message: "{npc} recoils. 'A thief! I should have known!'"
    
  - event: "destroyed_property"
    change: -20
    message: "{npc} stares at the destruction, speechless with anger."
    
  - event: "insulted"
    change: -15
    message: "{npc} draws back, hurt flashing across their face."
    
  - event: "attacked"
    change: -50
    flags_set: ["was_attacked"]
    message: "{npc} scrambles away, terrified."
    
  # Witnessed events (secondhand)
  - event: "witnessed_helping_other"
    change: +5
    message: "{npc} watches approvingly as you help."
    
  - event: "witnessed_crime"
    change: -15
    flags_set: ["witnessed_crime"]
    message: "{npc} averts their eyes, pretending not to see."
```

### 2.3 Dialogue Variation by Relationship

```typescript
interface NPCDialogue {
  topic: string;
  
  // Different responses based on relationship tier
  responses: {
    hostile: DialogueResponse;
    unfriendly: DialogueResponse;
    neutral: DialogueResponse;
    friendly: DialogueResponse;
    allied: DialogueResponse;
  };
  
  // Additional conditions
  conditionalResponses?: {
    condition: DialogueCondition;
    response: DialogueResponse;
  }[];
}

interface DialogueResponse {
  text: string;
  revealsInfo?: string[];           // What info they share
  unlocksTopics?: string[];         // New conversation topics
  offersQuest?: string;             // Quest they might offer
  offersItem?: string;              // Item they might give
  dispositionChange?: number;       // Talking affects relationship
}
```

### 2.4 Example NPC: The Archivist

```yaml
npc:
  id: "archivist"
  name: "Evelyn"
  title: "The Archivist"
  
  appearance: |
    An elderly woman with silver hair pinned in a severe bun. 
    Her glasses are thick, her cardigan threadbare but clean. 
    She moves slowly but her eyes miss nothing.
    
  personality: |
    Protective of the archives. Values order and respect. 
    Warms slowly but genuinely to those who show interest 
    in history. Despises carelessness and vandalism.
    
  starting_disposition: 0
  
  # Dialogue varies by relationship
  greetings:
    hostile: 
      text: "You. Get out of my archives before I call security."
      
    unfriendly:
      text: "What do you want? And don't touch anything."
      
    neutral:
      text: "Can I help you find something? Please be careful with the documents."
      
    friendly:
      text: "Ah, back again! Looking for something specific today?"
      revealsTopics: ["restricted_section"]
      
    allied:
      text: "My favorite visitor! Come, I've set aside some fascinating items for you."
      revealsTopics: ["hidden_collection", "personal_story"]
      offersItem: "archive_master_key"
      
  topics:
    cabinet_contents:
      neutral:
        text: "That cabinet? Personnel files, mostly. Nothing interesting."
        
      friendly:
        text: "Ah, that cabinet. It belonged to the old director. There might be something of interest in there—here, let me find my key..."
        offersAction: "opens_cabinet"
        dispositionChange: +5
        
    restricted_section:
      requiresRelationship: "friendly"
      neutral:
        text: "The restricted section is off-limits. Don't ask again."
        
      friendly:
        text: "The restricted section... well, I suppose I could look the other way for a moment. Just don't make a mess."
        unlocksExit: "east"
        
    personal_story:
      requiresRelationship: "allied"
      text: |
        "I've worked here for forty years, you know. Seen things 
        come and go. But there's one thing that's always bothered 
        me—a gap in the records from 1987. Something happened 
        that year. Something they don't want remembered..."
      revealsInfo: ["1987_mystery"]
      startsQuest: "the_missing_year"
      
  reactions:
    # React to player actions in the room
    on_smash_cabinet:
      dispositionChange: -30
      text: |
        Evelyn LEAPS from her chair with surprising speed.
        
        "WHAT ARE YOU DOING?! Those records are irreplaceable! 
        Get out! GET OUT OF MY ARCHIVES!"
        
        She points at the door, shaking with fury.
      flags_set: ["banned_from_archives"]
      
    on_gentle_handling:
      dispositionChange: +5
      text: |
        Evelyn glances up from her work, watching you carefully 
        handle the old documents.
        
        "You have respectful hands," she murmurs approvingly. 
        "So few do, these days."
        
    on_ask_permission:
      dispositionChange: +10
      text: |
        Evelyn pauses, surprised.
        
        "You're... asking? Most people just barge in and 
        take what they want." She adjusts her glasses. 
        "I appreciate that. What do you need?"
```

### 2.5 Relationship Memory & Decay

```typescript
class RelationshipManager {
  // Process relationship changes
  modifyRelationship(npcId: string, event: string, change: number) {
    const rel = this.getRelationship(npcId);
    
    // Add memory
    rel.memories.push({
      event,
      timestamp: Date.now(),
      dispositionChange: change,
      persistent: Math.abs(change) >= 20  // Major events don't fade
    });
    
    // Apply change
    rel.disposition = clamp(rel.disposition + change, -100, 100);
    
    // Update tier
    rel.tier = this.calculateTier(rel.disposition);
    
    // Propagate to related NPCs (gossip!)
    if (change < -20) {
      this.spreadNegativeGossip(npcId, event);
    }
  }
  
  // NPCs talk to each other
  spreadNegativeGossip(sourceNpcId: string, event: string) {
    const sourceNpc = this.getNPC(sourceNpcId);
    const nearbyNpcs = this.getNPCsInZone(sourceNpc.zone);
    
    for (const npc of nearbyNpcs) {
      if (npc.id !== sourceNpcId && npc.traits.includes('gossips')) {
        // Secondhand reputation hit
        this.modifyRelationship(npc.id, 'heard_about_' + event, -5);
      }
    }
  }
  
  // Over time, minor grievances fade
  decayRelationships(daysPassed: number) {
    for (const rel of this.relationships.values()) {
      // Remove non-persistent memories older than X
      rel.memories = rel.memories.filter(m => 
        m.persistent || (Date.now() - m.timestamp) < MEMORY_DURATION
      );
      
      // Slowly drift toward neutral
      if (rel.disposition > 0 && rel.disposition < 30) {
        rel.disposition -= daysPassed * 0.5;
      } else if (rel.disposition < 0 && rel.disposition > -30) {
        rel.disposition += daysPassed * 0.5;
      }
    }
  }
}
```

### 2.6 Relationship UI Indicators

```
> talk to evelyn

EVELYN THE ARCHIVIST
[FRIENDLY ████████░░░░░░░░░░░░ +35]

She looks up from her work with a warm smile.

"Back so soon? I found something you might like—an old 
map of the basement levels. Take it, please."

[RECEIVED: Basement Map]

Topics: [Archives] [The Cabinet] [Restricted Section*] [Rumors]
        (* = New topic available!)

> _
```

---

## 3. Procedural Generation Fairness

### 3.1 The Core Challenge

```
PROBLEM: Random generation can create unwinnable scenarios

Examples of unfair generation:
- Key spawns behind the door it unlocks
- Required item placed in room that requires that item to enter
- NPC quest requires item that doesn't exist
- Puzzle solution depends on destroyed object
- Critical path blocked by unsolvable puzzle
```

### 3.2 Dependency Graph System

Every element that affects progression is tracked in a dependency graph:

```typescript
interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

interface DependencyNode {
  id: string;
  type: 'item' | 'room' | 'npc' | 'puzzle' | 'exit' | 'game';
  
  // Where can this be accessed from?
  accessibleFrom: string[];         // Room IDs player can reach it from
  
  // What does this unlock?
  unlocks: string[];
  
  // What is required to obtain/access this?
  requires: Requirement[];
}

interface Requirement {
  type: 'item' | 'puzzle_solved' | 'npc_relationship' | 'room_visited';
  id: string;
  minValue?: number;                // For relationships
}

interface DependencyEdge {
  from: string;                     // Required thing
  to: string;                       // Thing it unlocks
  type: 'hard' | 'soft';            // Hard = required, Soft = one of many ways
}
```

### 3.3 Generation Validation

```typescript
class DungeonValidator {
  
  // Main validation entry point
  validate(dungeon: Dungeon): ValidationResult {
    const issues: ValidationIssue[] = [];
    
    // Check all critical paths
    issues.push(...this.validateCriticalPath(dungeon));
    
    // Check all locks have reachable keys
    issues.push(...this.validateLockKeyPairs(dungeon));
    
    // Check all puzzles are solvable
    issues.push(...this.validatePuzzles(dungeon));
    
    // Check all games are discoverable
    issues.push(...this.validateGameAccess(dungeon));
    
    // Check NPC quests are completable
    issues.push(...this.validateQuests(dungeon));
    
    return {
      valid: issues.filter(i => i.severity === 'fatal').length === 0,
      issues
    };
  }
  
  // Ensure player can reach the end from the start
  validateCriticalPath(dungeon: Dungeon): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const reachable = this.calculateReachableRooms(
      dungeon, 
      dungeon.startRoom,
      []  // No items yet
    );
    
    // Check if all zones are reachable
    for (const zone of dungeon.zones) {
      const zoneRooms = zone.rooms.map(r => r.id);
      const reachableInZone = zoneRooms.filter(r => reachable.has(r));
      
      if (reachableInZone.length === 0) {
        issues.push({
          severity: 'fatal',
          message: `Zone "${zone.name}" is completely unreachable`,
          affectedIds: [zone.id]
        });
      }
    }
    
    return issues;
  }
  
  // For every locked door, verify its key is reachable without going through that door
  validateLockKeyPairs(dungeon: Dungeon): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    for (const lock of dungeon.locks) {
      const keyLocation = dungeon.getItemLocation(lock.keyId);
      
      // Calculate rooms reachable WITHOUT this lock's key
      const reachableWithoutKey = this.calculateReachableRooms(
        dungeon,
        dungeon.startRoom,
        [],
        [lock.id]  // Exclude this lock from consideration
      );
      
      if (!reachableWithoutKey.has(keyLocation.roomId)) {
        issues.push({
          severity: 'fatal',
          message: `Key "${lock.keyId}" is behind the lock "${lock.id}" it opens`,
          affectedIds: [lock.id, lock.keyId],
          autoFix: () => this.relocateKey(dungeon, lock)
        });
      }
    }
    
    return issues;
  }
  
  // Verify all puzzles can be solved with available resources
  validatePuzzles(dungeon: Dungeon): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    for (const puzzle of dungeon.puzzles) {
      // Check required items exist and are reachable before puzzle
      for (const reqItem of puzzle.requiredItems) {
        if (!dungeon.hasItem(reqItem)) {
          issues.push({
            severity: 'fatal',
            message: `Puzzle "${puzzle.id}" requires non-existent item "${reqItem}"`,
            affectedIds: [puzzle.id],
            autoFix: () => this.spawnRequiredItem(dungeon, puzzle, reqItem)
          });
        }
        
        // Check item is reachable before puzzle room
        const reachable = this.calculateReachableRooms(
          dungeon,
          dungeon.startRoom,
          [],
          [puzzle.id]  // Without solving this puzzle
        );
        
        const itemLocation = dungeon.getItemLocation(reqItem);
        if (!reachable.has(itemLocation.roomId)) {
          issues.push({
            severity: 'fatal',
            message: `Required item "${reqItem}" for puzzle "${puzzle.id}" is not reachable before puzzle`,
            affectedIds: [puzzle.id, reqItem],
            autoFix: () => this.relocateItem(dungeon, reqItem, reachable)
          });
        }
      }
    }
    
    return issues;
  }
  
  // Calculate all rooms reachable from a starting point
  calculateReachableRooms(
    dungeon: Dungeon,
    startRoom: string,
    startingItems: string[],
    excludeLocks: string[] = []
  ): Set<string> {
    const reachable = new Set<string>();
    const inventory = new Set(startingItems);
    const toVisit = [startRoom];
    
    while (toVisit.length > 0) {
      const roomId = toVisit.shift()!;
      if (reachable.has(roomId)) continue;
      
      reachable.add(roomId);
      const room = dungeon.getRoom(roomId);
      
      // Collect items in this room
      for (const item of room.items) {
        if (item.canTake) {
          inventory.add(item.id);
        }
      }
      
      // Check exits
      for (const [direction, exit] of Object.entries(room.exits)) {
        if (excludeLocks.includes(exit.lockId)) continue;
        
        if (!exit.locked || this.canUnlock(exit, inventory, dungeon)) {
          if (!reachable.has(exit.roomId)) {
            toVisit.push(exit.roomId);
          }
        }
      }
    }
    
    return reachable;
  }
}
```

### 3.4 Auto-Fix Strategies

When validation fails, automatic fixes can be applied:

```typescript
class DungeonFixer {
  
  // Move a key to a valid location
  relocateKey(dungeon: Dungeon, lock: Lock): void {
    const validLocations = this.calculateReachableRooms(
      dungeon,
      dungeon.startRoom,
      [],
      [lock.id]
    );
    
    // Find a suitable room (preferably in same zone, with a container)
    const candidates = Array.from(validLocations)
      .map(id => dungeon.getRoom(id))
      .filter(room => 
        room.zone === lock.zone &&  // Same zone preferred
        room.objects.some(o => o.canContainItems)  // Has container
      );
    
    if (candidates.length === 0) {
      // Fallback: any reachable room
      candidates.push(...Array.from(validLocations)
        .map(id => dungeon.getRoom(id))
        .slice(0, 5)
      );
    }
    
    const targetRoom = this.rng.choice(candidates);
    const container = targetRoom.objects.find(o => o.canContainItems);
    
    if (container) {
      container.containedItems.push(lock.keyId);
    } else {
      targetRoom.items.push(dungeon.getItem(lock.keyId));
    }
    
    console.log(`Relocated key ${lock.keyId} to ${targetRoom.id}`);
  }
  
  // Ensure alternative paths exist
  createAlternativePath(dungeon: Dungeon, blockedPath: string[]): void {
    const start = blockedPath[0];
    const end = blockedPath[blockedPath.length - 1];
    
    // Find or create an alternate route
    const alternates = this.findIndirectPaths(dungeon, start, end, blockedPath);
    
    if (alternates.length === 0) {
      // Create a new connection
      const midpoint = this.findNearestUnblockedRoom(dungeon, start, blockedPath);
      dungeon.addConnection(midpoint, end, {
        type: 'secret_passage',
        discoverable: true
      });
      
      console.log(`Created alternate path via ${midpoint}`);
    }
  }
}
```

### 3.5 Generation Constraints

Rules applied DURING generation to prevent issues:

```typescript
interface GenerationConstraints {
  
  // Lock/Key constraints
  lockKey: {
    // Key must be N rooms away from lock (minimum)
    minDistanceFromLock: 2;
    
    // Key must NOT be past the lock
    keyMustPrecedeLock: true;
    
    // Prefer keys in same zone as lock
    preferSameZone: true;
    
    // Backup keys can exist for critical locks
    criticalLocksHaveBackup: true;
  };
  
  // Puzzle constraints
  puzzles: {
    // All required items must exist before puzzle room
    itemsMustPrecedePuzzle: true;
    
    // Clues must be findable before puzzle
    cluesMustPrecedePuzzle: true;
    
    // Alternative solutions preferred
    preferMultipleSolutions: true;
    
    // Hard puzzles need hint NPCs nearby
    hardPuzzlesNeedHints: true;
  };
  
  // Item distribution
  items: {
    // Critical items can't be in destructible-only containers
    criticalItemsInSafeContainers: true;
    
    // Don't cluster all items in one area
    maxItemsPerRoom: 4;
    
    // Ensure some items in each zone
    minItemsPerZone: 3;
  };
  
  // NPC constraints
  npcs: {
    // Quest items must exist and be reachable
    questItemsMustExist: true;
    
    // Don't require hostile NPC for critical path
    criticalPathNoHostileRequired: true;
    
    // Info NPCs must be before what they describe
    infoNPCsMustPrecedeRelevantArea: true;
  };
  
  // Game (collectible) distribution
  games: {
    // Every zone must have some games
    minGamesPerZone: 15;
    
    // Don't put all rare games behind hardest puzzles
    rareGameDifficultySpread: true;
    
    // At least some games are freely accessible
    minFreelyAccessibleGames: 20;
  };
}
```

### 3.6 Coherence Rules

Ensuring the generated world makes narrative sense:

```typescript
interface CoherenceRules {
  
  // Thematic consistency
  thematic: {
    // Items match their zone's theme
    itemsMatchZoneTheme: 0.8;  // 80% should match
    
    // NPCs have appropriate occupations for location
    npcsMatchLocation: true;
    
    // Puzzle themes match zone
    puzzlesMatchZoneTheme: true;
  };
  
  // Spatial logic
  spatial: {
    // Outdoor zones connect to outdoor zones sensibly
    outdoorIndoorTransitions: 'require_doorway';
    
    // Upper floors accessible from lower floors
    verticalConnectivity: 'stairs_or_elevator';
    
    // Locked areas should have visible locks
    lockedDoorsAreVisible: true;
  };
  
  // NPC logic
  npcLogic: {
    // Shopkeepers near entrances
    shopkeepersNearAccessible: true;
    
    // Guards near valuable/restricted areas
    guardsNearRestrictedAreas: true;
    
    // Quest givers before quest areas
    questGiversBeforeQuestAreas: true;
  };
  
  // Object logic
  objectLogic: {
    // Filing cabinets in offices, not caves
    furnitureMatchesLocation: true;
    
    // Light sources in dark areas
    darkAreasHaveLightSources: true;
    
    // Containers have thematically appropriate contents
    containerContentsMakesSense: true;
  };
}
```

### 3.7 Playtest Simulation

Automated testing of generated dungeons:

```typescript
class AutoPlaytester {
  
  // Simulate optimal play to verify completability
  async runOptimalPlaythrough(dungeon: Dungeon): Promise<PlaytestResult> {
    const solver = new DungeonSolver(dungeon);
    
    try {
      const solution = solver.findOptimalPath();
      
      return {
        completable: true,
        optimalMoves: solution.moves.length,
        criticalPath: solution.rooms,
        itemsRequired: solution.items,
        puzzlesSolved: solution.puzzles
      };
    } catch (e) {
      return {
        completable: false,
        blockedAt: e.location,
        reason: e.message
      };
    }
  }
  
  // Simulate random exploration to find soft locks
  async runRandomPlaythrough(
    dungeon: Dungeon, 
    iterations: number = 100
  ): Promise<RandomPlaytestResult> {
    const results: PlaythroughAttempt[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const attempt = this.simulateRandomPlayer(dungeon);
      results.push(attempt);
    }
    
    return {
      completionRate: results.filter(r => r.completed).length / iterations,
      averageMoves: average(results.map(r => r.moves)),
      commonStuckPoints: this.findCommonStuckPoints(results),
      softLocks: results.filter(r => r.softLocked).map(r => r.softLockReason)
    };
  }
  
  // Simulate a player making random (but logical) choices
  simulateRandomPlayer(dungeon: Dungeon): PlaythroughAttempt {
    const state = new GameState(dungeon);
    let moves = 0;
    const maxMoves = 1000;
    
    while (moves < maxMoves) {
      const options = this.getValidActions(state);
      
      if (options.length === 0) {
        return {
          completed: false,
          softLocked: true,
          softLockReason: `No valid actions in ${state.currentRoom}`,
          moves
        };
      }
      
      // Random but weighted choice (prefer unexplored)
      const action = this.weightedChoice(options, state);
      state.apply(action);
      moves++;
      
      if (state.allGamesDiscovered()) {
        return { completed: true, moves };
      }
    }
    
    return {
      completed: false,
      softLocked: false,
      moves,
      gamesFound: state.discoveredGames.length
    };
  }
}
```

### 3.8 Seed Quality Rating

Rate generated dungeons before presenting to players:

```typescript
interface SeedQuality {
  seed: number;
  
  // Validation results
  validation: {
    passed: boolean;
    issuesFixed: number;
  };
  
  // Playtest results
  playtest: {
    optimalMoves: number;
    randomCompletionRate: number;
    averageRandomMoves: number;
  };
  
  // Quality metrics
  metrics: {
    // Is difficulty progression smooth?
    difficultyProgression: number;        // 0-100
    
    // Are zones well-connected?
    zoneConnectivity: number;             // 0-100
    
    // Are games well-distributed?
    gameDistribution: number;             // 0-100
    
    // Do puzzles have variety?
    puzzleVariety: number;                // 0-100
    
    // Is there enough content in each area?
    contentDensity: number;               // 0-100
  };
  
  // Overall quality score
  overallScore: number;                   // 0-100
  
  // Should this seed be used?
  usable: boolean;                        // Score > 70
}
```

---

## 4. Putting It All Together

### 4.1 Generation Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    GENERATION PIPELINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SEED INITIALIZATION                                     │
│     └─→ Create deterministic RNG from seed                  │
│                                                             │
│  2. ZONE GENERATION                                         │
│     └─→ Create 8 themed zones with room templates           │
│                                                             │
│  3. ROOM POPULATION                                         │
│     ├─→ Place objects (with initial states)                 │
│     ├─→ Place items (in objects or loose)                   │
│     ├─→ Assign exits and locks                              │
│     └─→ Apply coherence rules                               │
│                                                             │
│  4. GAME DISTRIBUTION                                       │
│     ├─→ Categorize games by theme                           │
│     ├─→ Assign discovery methods                            │
│     └─→ Place in appropriate locations                      │
│                                                             │
│  5. PUZZLE GENERATION                                       │
│     ├─→ Create puzzles for locked areas                     │
│     ├─→ Distribute required items                           │
│     └─→ Place clues                                         │
│                                                             │
│  6. NPC PLACEMENT                                           │
│     ├─→ Assign NPCs to zones                                │
│     ├─→ Generate quests                                     │
│     └─→ Initialize relationships                            │
│                                                             │
│  7. VALIDATION                                              │
│     ├─→ Run dependency graph checks                         │
│     ├─→ Auto-fix any issues                                 │
│     └─→ Re-validate until clean                             │
│                                                             │
│  8. PLAYTEST SIMULATION                                     │
│     ├─→ Optimal path check                                  │
│     ├─→ Random exploration check                            │
│     └─→ Calculate quality score                             │
│                                                             │
│  9. QUALITY GATE                                            │
│     ├─→ Score ≥ 70: Accept seed                             │
│     └─→ Score < 70: Generate new seed                       │
│                                                             │
│  10. FINALIZATION                                           │
│      ├─→ Generate room descriptions                         │
│      ├─→ Generate NPC dialogue                              │
│      └─→ Save to localStorage                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Runtime State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER ACTION FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INPUT: "smash cabinet with crowbar"                        │
│                                                             │
│  1. PARSE                                                   │
│     └─→ { verb: "smash", target: "cabinet", tool: "crowbar"}│
│                                                             │
│  2. VALIDATE                                                │
│     ├─→ Does cabinet exist in room? ✓                       │
│     ├─→ Does player have crowbar? ✓                         │
│     └─→ Can cabinet be smashed? ✓                           │
│                                                             │
│  3. EXECUTE STATE TRANSITION                                │
│     ├─→ cabinet: "closed" → "smashed"                       │
│     ├─→ Spawn: scattered_papers                             │
│     └─→ Reveal: dusty_folder, faded_photo, old_key          │
│                                                             │
│  4. PROCESS SIDE EFFECTS                                    │
│     ├─→ Alert NPC: nearby_guard                             │
│     ├─→ Modify relationship: archivist -20                  │
│     └─→ Add memory: archivist.witnessed_destruction         │
│                                                             │
│  5. UPDATE NPC STATES                                       │
│     ├─→ archivist: neutral → unfriendly                     │
│     ├─→ archivist dialogue updated                          │
│     └─→ guard: begins patrol to this room                   │
│                                                             │
│  6. GENERATE RESPONSE                                       │
│     └─→ Combine transition text + NPC reactions             │
│                                                             │
│  7. UPDATE ROOM DESCRIPTION                                 │
│     └─→ Regenerate based on new object states               │
│                                                             │
│  8. SAVE STATE                                              │
│     └─→ Persist to localStorage                             │
│                                                             │
│  OUTPUT: "You wedge the crowbar into the drawer..."         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Example: Full Interaction Chain

```
STARTING STATE:
- Cabinet: closed
- Archivist disposition: +15 (neutral, leaning friendly)
- Player has: crowbar

═══════════════════════════════════════════════════════════════

> examine cabinet

The filing cabinet is sturdy metal, painted industrial gray. 
Three drawers are held shut by a small lock. Years of dust 
coat its surface. The Archivist glances up at your interest.

> smash cabinet with crowbar

You wedge the crowbar into the top drawer and HEAVE. Metal 
screams in protest—

"NO! STOP!" Evelyn leaps from her chair, but it's too late.

The cabinet CRASHES to the floor, drawers bursting open, 
papers exploding across the room like startled birds. Among 
the debris you spot a DUSTY FOLDER, a FADED PHOTO, and 
glinting beneath the wreckage, a small KEY.

Evelyn stands frozen, her face cycling through shock, 
disbelief, and settling on cold fury.

"Those records were... irreplaceable. Decades of history. 
And you—" She can barely speak. "Get out. Get out of my 
archives and don't come back."

[ITEMS NOW VISIBLE: Dusty Folder, Faded Photo, Old Key, 
 Scattered Papers]

[ARCHIVIST: Disposition -20 → Now Unfriendly]
[WARNING: Archivist may refuse to help in the future]

> talk to evelyn

Evelyn turns her back to you, shoulders trembling. She 
won't even look at you.

"I have nothing to say to you. Leave."

[Relationship too damaged for conversation]
[TIP: Some NPCs may forgive over time, or with the right gift]

> take key

You pluck the key from the wreckage. It's small and brass, 
with an unusual square head. The Archivist makes a sound 
of disgust but doesn't stop you.

[OBTAINED: Old Key]
[The key's origin suggests it opens something in the 
 basement levels...]

═══════════════════════════════════════════════════════════════

STATE CHANGES SUMMARY:
- Cabinet: closed → smashed (permanent)
- Revealed items: 4
- Archivist disposition: +15 → -5 (unfriendly)
- Archivist flag: "witnessed_destruction" = true
- Archivist dialogue: switched to unfriendly variants
- Topic "restricted_section": now locked (was becoming available)
- Alternate path to restricted section: now required
```

---

## 5. AI Prompt Templates for Dynamic Content

### 5.1 State-Aware Room Description

```markdown
## ROOM DESCRIPTION WITH OBJECT STATES

Generate a room description accounting for current object states.

**Room Base:**
{base_description}

**Objects and Current States:**
{for each object:}
- {object.name}: {object.currentState}
  - Appearance: {state.roomMention}
  - Revealed items: {state.revealedItems}
  - Ambient effects: {state.passiveEffects}

**NPCs Present:**
{for each npc:}
- {npc.name}: Disposition {npc.disposition} ({npc.tier})
  - Current behavior: {based on tier and flags}

**Requirements:**
1. Weave object states naturally into description
2. Reflect NPC attitudes through body language/positioning
3. Mention visible items naturally
4. Include ambient effects from object states
5. 3-4 sentences maximum

**Output:**
{integrated room description}
```

### 5.2 NPC Dialogue Based on Relationship

```markdown
## RELATIONSHIP-AWARE DIALOGUE

Generate NPC response based on current relationship state.

**NPC:** {npc.name}
**Personality:** {npc.personality}
**Current Disposition:** {disposition} ({tier})

**Relationship History:**
{recent memories, especially strong ones}

**Player's Action:** {what they said/did}

**Context:**
- In room: {room.name}
- Recent player actions: {recent_actions}
- Relevant flags: {npc.flags}

**Dialogue Requirements:**
1. Match tone to relationship tier
2. Reference relevant memories if appropriate
3. Stay in character personality
4. If negative relationship, show it subtly (or not so subtly)
5. If positive, be warmer/more helpful
6. Include non-verbal cues (body language)

**Output:**
{npc response with stage directions}
```

### 5.3 Object Interaction Response

```markdown
## OBJECT STATE TRANSITION RESPONSE

Generate response for an object state change.

**Object:** {object.name}
**Transition:** {from_state} → {to_state}
**Trigger:** {verb} (with {tool} if applicable)

**Transition Template:** {transition.transitionText}

**Side Effects Occurring:**
- Items spawned: {items}
- NPCs alerted: {npcs}
- Relationships changed: {changes}

**NPCs in Room:** {present_npcs with dispositions}

**Requirements:**
1. Describe the action viscerally
2. Show immediate physical results
3. Include NPC reactions if present
4. Hint at consequences (items revealed, sounds made)
5. Match tone to action (violent action = dramatic prose)

**Output:**
{action description}
{npc reactions if any}
{revealed items/consequences}
```

---

*Addendum Version: 1.0*
*Compatible with: Retro Realm PRD v1.0*
