# Game Platform — Setup Instructions

## 1. Install Node.js (one-time)

1. Go to https://nodejs.org and download the **LTS** installer for Windows.
2. Run the installer and accept all defaults.
3. Open a new PowerShell window after installation.
4. Verify it worked:
   ```powershell
   node --version   # should print v20.x.x or similar
   npm --version
   ```

## 2. Install project dependencies

Open PowerShell in the `game_platform` folder:

```powershell
cd C:\Users\anton\game_platform
npm install
```

This downloads Electron, React, TypeScript, Vite, and Tailwind (~500 MB first time).

## 3. Run in development mode

```powershell
npm run dev
```

The app window opens immediately. Hot-reload is active — save any file and the UI refreshes.

## 4. Build a production exe (optional)

```powershell
npm run build
```

Output goes to `out/`. Run `out\main\index.js` via Electron, or package with `electron-builder`.

---

## Where your data is stored

Game metadata: `%APPDATA%\game-platform\games.json`  
Cover images:  `%APPDATA%\game-platform\covers\`

You can open `games.json` in any text editor to inspect or manually edit entries.

---

## Expanding the project

| What you want to add | Where to start |
|---|---|
| New page (e.g. Settings) | `src/renderer/src/pages/` + add to `App.tsx` |
| New sidebar nav item | `src/renderer/src/components/Sidebar.tsx` |
| New game field | `src/shared/types.ts` → `AddGameModal.tsx` → `src/main/index.ts` |
| Sort/filter options | `src/renderer/src/pages/Library.tsx` |
| Custom themes | `tailwind.config.js` |
