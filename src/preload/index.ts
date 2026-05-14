import { contextBridge, ipcRenderer } from 'electron'
import type { Game, GamePayload, LaunchResult, LeaderboardEntry } from '@shared/types'

const api = {
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
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
