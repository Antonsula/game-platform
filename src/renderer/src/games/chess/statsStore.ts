import type { ChessStatsEntry } from '@shared/types'

export async function addChessStats(entry: Omit<ChessStatsEntry, 'id'>): Promise<void> {
  try {
    await window.api.chessStats.add(entry)
  } catch {
    // Stats are optional; never crash the game on storage failure
  }
}

export async function getAllChessStats(): Promise<ChessStatsEntry[]> {
  try {
    return await window.api.chessStats.getAll()
  } catch {
    return []
  }
}
