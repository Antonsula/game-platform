import type { LeaderboardEntry, Difficulty, SnakeMode } from '@shared/types'

export async function getAllEntries(): Promise<LeaderboardEntry[]> {
  return window.api.leaderboard.getAll()
}

export async function saveEntry(entry: {
  playerName: string
  score: number
  difficulty: Difficulty
  mode: SnakeMode
}): Promise<void> {
  await window.api.leaderboard.add({
    ...entry,
    date: new Date().toISOString(),
  })
}
