import type { FlappyDifficulty, FlappyMode } from '@shared/types'

export type { FlappyDifficulty, FlappyMode }

export interface FlappyConfig {
  playerName: string
  difficulty: FlappyDifficulty
  mode:       FlappyMode
}

export interface Pipe {
  x:         number
  topHeight: number
  passed:    boolean
}
