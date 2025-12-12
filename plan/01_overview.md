# 01. Overview: The Dungeon Crawler Browser

## 1. Concept

The **Dungeon Crawler Browser** is an alternate, immersive interface for the Retro Gaming Library. It reimagines the static act of browsing a database as a **Text-Based Adventure RPG** (like Zork or Colossal Cave Adventure).

Instead of clicking filters, the user acts as an **Explorer** navigating the "infinite archives" of gaming history. The AI acts as the **Dungeon Master (DM)**, dynamically describing games and genres as physical spaces and artifacts.

## 2. Core Metaphor

| Regular Play  | Dungeon Metaphor                                                    |
| :------------ | :------------------------------------------------------------------ |
| **Genre**     | A "District", "Hall", or "Cavern" (e.g., _The Hall of Platformers_) |
| **Platform**  | A "Region" or "Era" (e.g., _The 16-Bit Kingdom_)                    |
| **Game**      | An "Artifact", "Relic", or "Tome" on a pedestal.                    |
| **Play Game** | "Attuning" to or "Invoking" the artifact.                           |
| **Search**    | "Scrying" or "Divination".                                          |
| **Favorites** | "Inventory" or "Backpack".                                          |

## 3. User Journey

### Entry

The user presses a secret key (e.g., `~` tilde or Konami Code) or clicks a "Terminal" icon. A retro CRT terminal overlay slides down, covering the screen.

### Navigation (The Loop)

1.  **Look (`ls`)**: The DM describes the current room.
    > "You stand in the Grand Foyer. To the North lies the Hall of Action. To the East, the moody swamps of RPGS. A strange glow emanates from the 'Hidden Gems' alcove."
2.  **Move (`cd`)**: User types `enter action` or `go north`.
3.  **Inspect (`cat`)**: User types `examine sonic`.
    > "You wipe the dust off the blue cartridge. It vibrates with kinetic energy. Run fast, hedgehog. Run fast."
4.  **Action (`run`)**: User types `play sonic`. The terminal dissolves, and the game launches in the main emulator.

## 4. Scope

- **MVP**:
  - Text-only interface.
  - Navigate Genres and Platforms.
  - "Examine" games (hit LLM for description).
  - "Play" games (navigate to URL).
- **Future**:
  - ASCII art generation for game covers.
  - XP system and leveling up.
  - Unlockable themes based on exploration.
