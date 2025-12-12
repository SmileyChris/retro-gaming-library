# Phase 7 Implementation Plan: The Director & Advanced Systems

## Objective

Implement a "Director" system that orchestrates complex world generation, sophisticated NPC relationships, and graph-based puzzle dependencies.

## 1. The Director (`director.js`)

The Director is responsible for the high-level "Script" of the dungeon generation.

- **Themes**: Sets global flavor (e.g., "Cyber-Rot", "Neon-Noir").
- **Pacing**: Controls density of combat/puzzles vs exploration.
- **Plot**: Defines the ultimate goal (e.g., "Find the Root Key").

```javascript
const DIRECTOR_MODES = {
  EXPLORATION: { lockChance: 0.2, npcDensity: 0.1 },
  HEIST: { lockChance: 0.8, npcDensity: 0.3 },
  SOCIAL: { lockChance: 0.1, npcDensity: 0.8 }, // High interaction
};
```

## 2. Dependency Graph (`graph.js`)

Replace linear generation with a node-graph system.

1.  **GraphBuilder**: Creates nodes (Rooms).
2.  **Topology**: Connects nodes ensuring strict reachability (MST + cycles).
3.  **Key-Lock Placement**:
    - Identify "Chokepoints" (bridges between clusters).
    - Place Locks on Chokepoints.
    - Place Matching Keys in the _preceding_ subgraph (ensure solvability).

## 3. Advanced NPC System

- **Relationship Store**: `dungeon.relationships = { npcId: { trust: 0, fear: 0 } }`.
- **Dynamic Dialogue**: `handleTalk` checks relationship metrics to select dialogue tier (Friendly, Neutral, Hostile).
- **Memory**: NPCs remember past interactions (tags).

## 4. Implementation Steps

1.  Create `src/lib/dungeon/generation/director.js` to manage GenParams.
2.  Rewrite `generator.js` to use a Graph/Cluster approach instead of linear zones.
3.  Implement `DependencyGraph` logic to place Keys/Locks validly.
4.  Update `engine.js` to support Relationship modifications.
