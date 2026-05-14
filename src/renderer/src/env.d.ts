/// <reference types="vite/client" />

import type { Game, GamePayload, LaunchResult, LeaderboardEntry } from '@shared/types'

// Mirrors the API shape from src/preload/index.ts.
// Update both files together if the API changes.
interface ElectronAPI {
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
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
