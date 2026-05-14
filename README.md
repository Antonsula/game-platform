# Game Platform

A personal desktop game launcher built with Electron, React, and TypeScript. Launch your own games from one place, with two built-in games included.

![Platform](https://img.shields.io/badge/platform-Windows-blue) ![Electron](https://img.shields.io/badge/Electron-31-47848F) ![React](https://img.shields.io/badge/React-18-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

## Built-in games

- **Snake** — classic arcade snake with WASD controls, three difficulty levels, BFS AI auto-play mode, and a persistent leaderboard
- **Battleship** — naval strategy game with manual ship placement, vs AI mode, and local two-player hot-seat mode

## Prerequisites

**Node.js** must be installed before anything else.

1. Download the **LTS** installer from [nodejs.org](https://nodejs.org)
2. Run the installer and accept all defaults
3. Open a new PowerShell window and verify:

```powershell
node --version   # v20.x.x or higher
npm --version
```

## Getting started

```powershell
# 1. Clone the repo
git clone https://github.com/Antonsula/game-platform.git
cd game-platform

# 2. Install dependencies (~500 MB, first time only)
npm install

# 3. Start the app
npm run dev
```

The Electron window opens immediately. Hot-reload is active — save any source file and the UI updates instantly.

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start in development mode with hot-reload |
| `npm run build` | Compile TypeScript and bundle for production |
| `npm run typecheck` | Run TypeScript type checking without building |

## Project structure

```
src/
├── main/           # Electron main process (file storage, IPC handlers, game launch)
├── preload/        # Context bridge — exposes safe APIs to the renderer
├── shared/         # Types shared across all three processes
└── renderer/
    └── src/
        ├── components/   # Reusable UI (Sidebar, TitleBar, GameCard, etc.)
        ├── pages/        # Library page
        └── games/
            ├── snake/        # Snake game
            └── battleship/   # Battleship game
```

## Adding your own games

Click **Add Game** in the library, fill in the title and pick the `.exe` path. The launcher stores metadata in `%APPDATA%\game-platform\games.json` and copies cover images to `%APPDATA%\game-platform\covers\`.

## Tech stack

- [Electron 31](https://www.electronjs.org/) — desktop shell
- [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) — UI
- [electron-vite](https://electron-vite.org/) — build tooling
- [Tailwind CSS v3](https://tailwindcss.com/) — styling
- Plain `fs` JSON for storage (no database)
