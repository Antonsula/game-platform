/// <reference types="vite/client" />

import type { Game, GamePayload, LaunchResult, LeaderboardEntry, ChessStatsEntry, FlappyScoreEntry } from '@shared/types'

// Mirrors the API shape from src/preload/index.ts.
// Update both files together if the API changes.
interface ElectronAPI {
  net: {
    host:          () => Promise<{ ip: string; port: number }>
    join:          (ip: string, port: number) => Promise<void>
    send:          (msg: object) => Promise<void>
    stop:          () => Promise<void>
    onMessage:     (cb: (msg: any) => void) => void
    onDisconnect:  (cb: () => void) => void
    onPeerConnect: (cb: () => void) => void
    offAll:        () => void
  }
  games: {
    getAll:  () => Promise<Game[]>
    add:     (payload: GamePayload) => Promise<Game>
    update:  (id: string, payload: GamePayload) => Promise<Game>
    remove:  (id: string) => Promise<void>
    launch:  (id: string) => Promise<LaunchResult>
  }
  dialog: {
    openExe:   () => Promise<string | null>
    openImage: () => Promise<string | null>
  }
  window: {
    minimize: () => void
    maximize: () => void
    close:    () => void
  }
  leaderboard: {
    getAll: () => Promise<LeaderboardEntry[]>
    add:    (entry: Omit<LeaderboardEntry, 'id'>) => Promise<void>
  }
  chessStats: {
    getAll: () => Promise<ChessStatsEntry[]>
    add:    (entry: Omit<ChessStatsEntry, 'id'>) => Promise<void>
  }
  flappyScores: {
    getAll: () => Promise<FlappyScoreEntry[]>
    add:    (entry: Omit<FlappyScoreEntry, 'id'>) => Promise<void>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
