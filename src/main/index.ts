import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
} from 'electron'
import { join, extname, dirname } from 'path'
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs'
import { networkInterfaces } from 'os'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { is } from '@electron-toolkit/utils'
import WebSocket, { WebSocketServer } from 'ws'
import type { Game, GamePayload, LaunchResult, LeaderboardEntry, ChessStatsEntry, FlappyScoreEntry } from '@shared/types'

// ---------------------------------------------------------------------------
// LAN network layer
// ---------------------------------------------------------------------------

let _netServer: WebSocketServer | null = null
let _netPeer:   WebSocket | null = null
let _mainWin:   BrowserWindow | null = null

function getLanIp(): string {
  for (const list of Object.values(networkInterfaces())) {
    for (const addr of (list ?? [])) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address
    }
  }
  return '127.0.0.1'
}

function attachPeerHandlers(ws: WebSocket): void {
  ws.on('message', data => {
    try {
      _mainWin?.webContents.send('net:message', JSON.parse(data.toString()))
    } catch { /* malformed JSON — ignore */ }
  })
  ws.on('close', () => {
    _netPeer = null
    _mainWin?.webContents.send('net:peer-disconnected')
  })
}

ipcMain.handle('net:host', (): Promise<{ ip: string; port: number }> => {
  _netPeer?.close();  _netPeer  = null
  _netServer?.close(); _netServer = null

  return new Promise((resolve, reject) => {
    const server = new WebSocketServer({ port: 0 })
    server.once('error', reject)
    server.once('listening', () => {
      const { port } = server.address() as { port: number }
      _netServer = server
      server.on('connection', ws => {
        _netPeer = ws
        attachPeerHandlers(ws)
        _mainWin?.webContents.send('net:peer-connected')
      })
      resolve({ ip: getLanIp(), port })
    })
  })
})

ipcMain.handle('net:join', (_e, ip: string, port: number): Promise<void> => {
  _netPeer?.close(); _netPeer = null

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${ip}:${port}`)
    ws.once('error', reject)
    ws.once('open', () => {
      _netPeer = ws
      attachPeerHandlers(ws)
      resolve()
    })
  })
})

ipcMain.handle('net:send', (_e, msg: unknown): void => {
  if (_netPeer?.readyState === WebSocket.OPEN) {
    _netPeer.send(JSON.stringify(msg))
  }
})

ipcMain.handle('net:stop', (): void => {
  _netPeer?.close();   _netPeer  = null
  _netServer?.close(); _netServer = null
})

// ---------------------------------------------------------------------------
// Games store — plain JSON in %APPDATA%\game-platform\games.json
// ---------------------------------------------------------------------------

function storePath(): string {
  return join(app.getPath('userData'), 'games.json')
}

function readGames(): Game[] {
  const p = storePath()
  if (!existsSync(p)) return []
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as Game[]
  } catch {
    return []
  }
}

function writeGames(games: Game[]): void {
  writeFileSync(storePath(), JSON.stringify(games, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// Leaderboard store — %APPDATA%\game-platform\leaderboard.json
// ---------------------------------------------------------------------------

function leaderboardPath(): string {
  return join(app.getPath('userData'), 'leaderboard.json')
}

function readLeaderboard(): LeaderboardEntry[] {
  const p = leaderboardPath()
  if (!existsSync(p)) return []
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as LeaderboardEntry[]
  } catch {
    return []
  }
}

function writeLeaderboard(entries: LeaderboardEntry[]): void {
  writeFileSync(leaderboardPath(), JSON.stringify(entries, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// Cover image helpers
// ---------------------------------------------------------------------------

function coversDir(): string {
  const dir = join(app.getPath('userData'), 'covers')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function saveCoverImage(id: string, tempCoverPath: string): string {
  if (!tempCoverPath || !existsSync(tempCoverPath)) return ''
  const ext  = extname(tempCoverPath)
  const dest = join(coversDir(), `${id}${ext}`)
  copyFileSync(tempCoverPath, dest)
  return dest
}

// ---------------------------------------------------------------------------
// Built-in game seeding
// Adds the Snake game entry the first time the app runs.
// Safe to call on every launch — it checks before inserting.
// ---------------------------------------------------------------------------

function seedBuiltInGames(): void {
  let games = readGames()
  let changed = false

  if (!games.some(g => g.executablePath === 'builtin://snake')) {
    const snake: Game = {
      id:             'builtin-snake',
      title:          'Snake',
      description:    'Classic arcade snake with BFS AI auto-play, three difficulty levels, and a persistent leaderboard.',
      executablePath: 'builtin://snake',
      genre:          'Arcade',
      coverPath:      '',
      addedAt:        new Date().toISOString(),
      lastPlayed:     null,
    }
    games = [snake, ...games]
    changed = true
  }

  if (!games.some(g => g.executablePath === 'builtin://battleship')) {
    const battleship: Game = {
      id:             'builtin-battleship',
      title:          'Battleship',
      description:    'Classic naval strategy game. Place your fleet and sink the enemy ships before they sink yours.',
      executablePath: 'builtin://battleship',
      genre:          'Strategy',
      coverPath:      '',
      addedAt:        new Date().toISOString(),
      lastPlayed:     null,
    }
    // Insert after Snake if it exists, otherwise prepend
    const snakeIdx = games.findIndex(g => g.executablePath === 'builtin://snake')
    if (snakeIdx >= 0) {
      games = [...games.slice(0, snakeIdx + 1), battleship, ...games.slice(snakeIdx + 1)]
    } else {
      games = [battleship, ...games]
    }
    changed = true
  }

  if (!games.some(g => g.executablePath === 'builtin://chess')) {
    const chess: Game = {
      id:             'builtin-chess',
      title:          'Chess',
      description:    'Classic strategy game with full rules, local 1v1, and a built-in AI opponent named Chess-master.',
      executablePath: 'builtin://chess',
      genre:          'Strategy',
      coverPath:      '',
      addedAt:        new Date().toISOString(),
      lastPlayed:     null,
    }
    const battleshipIdx = games.findIndex(g => g.executablePath === 'builtin://battleship')
    if (battleshipIdx >= 0) {
      games = [...games.slice(0, battleshipIdx + 1), chess, ...games.slice(battleshipIdx + 1)]
    } else {
      games = [...games, chess]
    }
    changed = true
  }

  if (!games.some(g => g.executablePath === 'builtin://flappy')) {
    const flappy: Game = {
      id:             'builtin-flappy',
      title:          'Flappy Bird',
      description:    'Classic tap-to-fly game. Dodge the pipes, beat your high score, or watch the AI show you how it\'s done.',
      executablePath: 'builtin://flappy',
      genre:          'Arcade',
      coverPath:      '',
      addedAt:        new Date().toISOString(),
      lastPlayed:     null,
    }
    const chessIdx = games.findIndex(g => g.executablePath === 'builtin://chess')
    if (chessIdx >= 0) {
      games = [...games.slice(0, chessIdx + 1), flappy, ...games.slice(chessIdx + 1)]
    } else {
      games = [...games, flappy]
    }
    changed = true
  }

  if (changed) writeGames(games)
}

// ---------------------------------------------------------------------------
// Chess stats store — %APPDATA%\game-platform\chess-stats.json
// ---------------------------------------------------------------------------

function chessStatsPath(): string {
  return join(app.getPath('userData'), 'chess-stats.json')
}

function readChessStats(): ChessStatsEntry[] {
  const p = chessStatsPath()
  if (!existsSync(p)) return []
  try { return JSON.parse(readFileSync(p, 'utf-8')) as ChessStatsEntry[] } catch { return [] }
}

function writeChessStats(entries: ChessStatsEntry[]): void {
  writeFileSync(chessStatsPath(), JSON.stringify(entries, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// Flappy Bird scores store — %APPDATA%\game-platform\flappy-scores.json
// ---------------------------------------------------------------------------

function flappyScoresPath(): string {
  return join(app.getPath('userData'), 'flappy-scores.json')
}

function readFlappyScores(): FlappyScoreEntry[] {
  const p = flappyScoresPath()
  if (!existsSync(p)) return []
  try { return JSON.parse(readFileSync(p, 'utf-8')) as FlappyScoreEntry[] } catch { return [] }
}

function writeFlappyScores(entries: FlappyScoreEntry[]): void {
  writeFileSync(flappyScoresPath(), JSON.stringify(entries, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

function createWindow(): void {
  const win = new BrowserWindow({
    width:     1280,
    height:    800,
    minWidth:  920,
    minHeight: 600,
    frame:          false,
    backgroundColor: '#0f0f17',
    show: false,
    webPreferences: {
      preload:  join(__dirname, '../preload/index.js'),
      sandbox:  false,
      // Allows <img src="file:///..."> for cover art from the local disk.
      // Intentional and safe for a fully local personal app.
      webSecurity: false,
    },
  })

  _mainWin = win
  win.on('ready-to-show', () => win.show())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  seedBuiltInGames()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---------------------------------------------------------------------------
// Window controls (custom title bar)
// ---------------------------------------------------------------------------

ipcMain.on('window:minimize', () => BrowserWindow.getFocusedWindow()?.minimize())

ipcMain.on('window:maximize', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return
  win.isMaximized() ? win.restore() : win.maximize()
})

ipcMain.on('window:close', () => BrowserWindow.getFocusedWindow()?.close())

// ---------------------------------------------------------------------------
// Games IPC
// ---------------------------------------------------------------------------

ipcMain.handle('games:getAll', (): Game[] => readGames())

ipcMain.handle('games:add', (_e, payload: GamePayload): Game => {
  const id        = randomUUID()
  const coverPath = saveCoverImage(id, payload.tempCoverPath)

  const game: Game = {
    id,
    title:          payload.title,
    description:    payload.description,
    executablePath: payload.executablePath,
    genre:          payload.genre,
    coverPath,
    addedAt:    new Date().toISOString(),
    lastPlayed: null,
  }

  writeGames([...readGames(), game])
  return game
})

ipcMain.handle('games:update', (_e, id: string, payload: GamePayload): Game => {
  const games    = readGames()
  const existing = games.find(g => g.id === id)
  if (!existing) throw new Error('Game not found')

  const coverPath = payload.tempCoverPath
    ? saveCoverImage(id, payload.tempCoverPath)
    : (payload.existingCoverPath ?? existing.coverPath)

  const updated: Game = {
    ...existing,
    title:          payload.title,
    description:    payload.description,
    executablePath: payload.executablePath,
    genre:          payload.genre,
    coverPath,
  }

  writeGames(games.map(g => g.id === id ? updated : g))
  return updated
})

ipcMain.handle('games:remove', (_e, id: string): void => {
  writeGames(readGames().filter(g => g.id !== id))
})

ipcMain.handle('games:launch', (_e, id: string): LaunchResult => {
  const games = readGames()
  const game  = games.find(g => g.id === id)

  if (!game) return { success: false, error: 'Game not found in library.' }

  // Built-in games are handled entirely in the renderer via navigation.
  // The renderer should intercept these before calling this handler,
  // but we guard here as a safety net.
  if (game.executablePath.startsWith('builtin://')) {
    return { success: true }
  }

  if (!existsSync(game.executablePath)) {
    return { success: false, error: `Executable not found:\n${game.executablePath}` }
  }

  try {
    const child = spawn(game.executablePath, [], {
      detached: true,
      stdio:    'ignore',
      cwd:      dirname(game.executablePath),
    })
    child.unref()

    writeGames(
      games.map(g => g.id === id ? { ...g, lastPlayed: new Date().toISOString() } : g)
    )
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// ---------------------------------------------------------------------------
// Dialog IPC
// ---------------------------------------------------------------------------

ipcMain.handle('dialog:openExe', async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    title:      'Select Game Executable',
    filters:    [{ name: 'Windows Executables', extensions: ['exe'] }],
    properties: ['openFile'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openImage', async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    title:      'Select Cover Image',
    filters:    [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    properties: ['openFile'],
  })
  return result.canceled ? null : result.filePaths[0]
})

// ---------------------------------------------------------------------------
// Leaderboard IPC
// ---------------------------------------------------------------------------

ipcMain.handle('leaderboard:getAll', (): LeaderboardEntry[] => {
  // Return entries sorted by score descending; ties broken by most recent date
  return readLeaderboard().sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : new Date(b.date).getTime() - new Date(a.date).getTime()
  )
})

ipcMain.handle(
  'leaderboard:add',
  (_e, entry: Omit<LeaderboardEntry, 'id'>): void => {
    const entries = readLeaderboard()
    writeLeaderboard([...entries, { ...entry, id: randomUUID() }])
  },
)

// ---------------------------------------------------------------------------
// Chess stats IPC
// ---------------------------------------------------------------------------

ipcMain.handle('chess-stats:getAll', (): ChessStatsEntry[] => readChessStats())

ipcMain.handle(
  'chess-stats:add',
  (_e, entry: Omit<ChessStatsEntry, 'id'>): void => {
    const entries = readChessStats()
    writeChessStats([...entries, { ...entry, id: randomUUID() }])
  },
)

// ---------------------------------------------------------------------------
// Flappy Bird scores IPC
// ---------------------------------------------------------------------------

ipcMain.handle('flappy-scores:getAll', (): FlappyScoreEntry[] =>
  readFlappyScores().sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : new Date(b.date).getTime() - new Date(a.date).getTime()
  )
)

ipcMain.handle(
  'flappy-scores:add',
  (_e, entry: Omit<FlappyScoreEntry, 'id'>): void => {
    const entries = readFlappyScores()
    writeFlappyScores([...entries, { ...entry, id: randomUUID() }])
  },
)
