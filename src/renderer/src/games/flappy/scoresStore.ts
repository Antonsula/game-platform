import type { FlappyScoreEntry } from '@shared/types'

export async function getFlappyScores(): Promise<FlappyScoreEntry[]> {
  return window.api.flappyScores.getAll()
}

export async function addFlappyScore(
  entry: Omit<FlappyScoreEntry, 'id'>,
): Promise<void> {
  return window.api.flappyScores.add(entry)
}
