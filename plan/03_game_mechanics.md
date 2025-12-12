# 03. Game Mechanics & Commands

## 1. The Shell Interface

The user perceives the system as a retro OS (like MS-DOS or Unix) running on a CRT monitor.

### Standard Commands

| Command      | Alias             | Description                                                   | Arguments      |
| :----------- | :---------------- | :------------------------------------------------------------ | :------------- |
| `ls`         | `look`, `dir`     | Lists contents (sub-genres or games) in the current location. | None           |
| `cd <name>`  | `go`, `enter`     | Moves to a sub-directory, genre, or platform.                 | Directory Name |
| `cd ..`      | `back`, `up`      | Moves up to the parent directory.                             | None           |
| `cat <game>` | `examine`, `read` | Inspects a game, triggering the LLM Lore generation.          | Game Name      |
| `run <game>` | `play`, `start`   | Launches the game (exits terminal, goes to emulator).         | Game Name      |
| `help`       | `?`               | Lists available commands.                                     | None           |
| `clear`      | `cls`             | Clears the screen.                                            | None           |

## 2. The "Magic" Commands (Easter Eggs)

- `sudo <command>`: The DM responds with "You have no power here" or a humorous error.
- `xyzzy`: "Nothing happens."
- `inventory`: Lists your "Favorite" games.

## 3. Progression Mechanics (Future Scope)

To make it a "Game" and not just a fancy menu:

### The Bestiary (Collection)

When a user "examines" a game for the first time, it is added to their **Codex**.

- **Goal**: Fill the Codex by exploring different genres.
- **Reward**: Unlock new CSS themes (e.g., "Matrix Mode", "Amber Terminal", "Vaporwave") for the main website.

### Hidden Gems

The system already has a `gem` boolean in the data.

- In the terminal, these items glow or have a special unicode indicator (e.g., `*Earthbound*`).
- Finding and examining a Hidden Gem grants bonus XP.

## 4. Navigation Structure

We treat the data as a file tree:

```text
/
├── Platforms/
│   ├── SNES/
│   │   ├── Chrono Trigger
│   │   └── ...
│   └── Genesis/
├── Genres/
│   ├── RPG/
│   │   ├── Chrono Trigger (same item, symlink)
│   │   └── ...
│   └── Action/
└── Hidden Gems/ (Special Directory)
```

User starts at `/`.
User types `cd Genres`.
User types `ls` -> sees list of genres.
User types `cd RPG`.
User types `ls` -> sees list of RPG games.
User types `examine Chrono Trigger`.
User types `play Chrono Trigger`.
