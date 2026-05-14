export interface Game {
  id: string
  title: string
  description: string
  /** Absolute path to the copied cover image in userData/covers/, or empty string */
  coverPath: string
  executablePath: string
  genre: string
  lastPlayed: string | null
  addedAt: string
}

/** Data the renderer sends when adding or editing a game */
export interface GamePayload {
  title: string
  description: string
  executablePath: string
  genre: string
  /** Absolute path to the original image file chosen by the user (temp, will be copied) */
  tempCoverPath: string
  /** Existing coverPath when editing — preserved if tempCoverPath is empty */
  existingCoverPath?: string
}

export interface LaunchResult {
  success: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Snake game types (shared so the main process can persist leaderboard entries)
// ---------------------------------------------------------------------------

export type Difficulty = 'easy' | 'medium' | 'hard'
export type SnakeMode = 'manual' | 'auto'

export interface LeaderboardEntry {
  id: string
  playerName: string
  score: number
  difficulty: Difficulty
  mode: SnakeMode
  date: string
}
