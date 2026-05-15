import { contextBridge, ipcRenderer } from 'electron'
import type { Game, GamePayload, LaunchResult, LeaderboardEntry, ChessStatsEntry, FlappyScoreEntry } from '@shared/types'

const api = {
  /** LAN multiplayer — WebSocket host/join via main process */
  net: {
    host:          (): Promise<{ ip: string; port: number }> =>
                     ipcRenderer.invoke('net:host'),
    join:          (ip: string, port: number): Promise<void> =>
                     ipcRenderer.invoke('net:join', ip, port),
    send:          (msg: object): Promise<void> =>
                     ipcRenderer.invoke('net:send', msg),
    stop:          (): Promise<void> =>
                     ipcRenderer.invoke('net:stop'),
    /** Register a callback for incoming peer messages. */
    onMessage:     (cb: (msg: any) => void): void => {
                     ipcRenderer.on('net:message', (_e, msg) => cb(msg))
                   },
    /** Register a callback for when the peer disconnects. */
    onDisconnect:  (cb: () => void): void => {
                     ipcRenderer.on('net:peer-disconnected', () => cb())
                   },
    /** Register a callback for when a peer connects (host side only). */
    onPeerConnect: (cb: () => void): void => {
                     ipcRenderer.on('net:peer-connected', () => cb())
                   },
    /** Remove ALL net listeners (call on component unmount / game exit). */
    offAll:        (): void => {
                     ipcRenderer.removeAllListeners('net:message')
                     ipcRenderer.removeAllListeners('net:peer-disconnected')
                     ipcRenderer.removeAllListeners('net:peer-connected')
                   },
  },
  games: {
    getAll:  (): Promise<Game[]>         => ipcRenderer.invoke('games:getAll'),
    add:     (payload: GamePayload): Promise<Game> => ipcRenderer.invoke('games:add', payload),
    update:  (id: string, payload: GamePayload): Promise<Game> =>
               ipcRenderer.invoke('games:update', id, payload),
    remove:  (id: string): Promise<void>          => ipcRenderer.invoke('games:remove', id),
    launch:  (id: string): Promise<LaunchResult>  => ipcRenderer.invoke('games:launch', id),
  },
  dialog: {
    openExe:   (): Promise<string | null> => ipcRenderer.invoke('dialog:openExe'),
    openImage: (): Promise<string | null> => ipcRenderer.invoke('dialog:openImage'),
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close:    () => ipcRenderer.send('window:close'),
  },
  leaderboard: {
    getAll: (): Promise<LeaderboardEntry[]>             => ipcRenderer.invoke('leaderboard:getAll'),
    add:    (entry: Omit<LeaderboardEntry, 'id'>): Promise<void> =>
              ipcRenderer.invoke('leaderboard:add', entry),
  },
  chessStats: {
    getAll: (): Promise<ChessStatsEntry[]>                   => ipcRenderer.invoke('chess-stats:getAll'),
    add:    (entry: Omit<ChessStatsEntry, 'id'>): Promise<void> =>
              ipcRenderer.invoke('chess-stats:add', entry),
  },
  flappyScores: {
    getAll: (): Promise<FlappyScoreEntry[]>                    => ipcRenderer.invoke('flappy-scores:getAll'),
    add:    (entry: Omit<FlappyScoreEntry, 'id'>): Promise<void> =>
              ipcRenderer.invoke('flappy-scores:add', entry),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
