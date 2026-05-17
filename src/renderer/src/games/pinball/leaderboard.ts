export interface HighScore {
  name:  string
  score: number
  date:  string
}

const KEY = 'pinball-leaderboard'

export function getHighScores(): HighScore[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HighScore[]
    return parsed.sort((a, b) => b.score - a.score).slice(0, 10)
  } catch {
    return []
  }
}

export function saveHighScore(entry: HighScore): void {
  try {
    const scores = getHighScores()
    scores.push(entry)
    scores.sort((a, b) => b.score - a.score)
    localStorage.setItem(KEY, JSON.stringify(scores.slice(0, 10)))
  } catch {
    // localStorage may fail in some Electron configs — silently ignore
  }
}

export function isHighScore(score: number): boolean {
  const scores = getHighScores()
  return scores.length < 10 || score > (scores[scores.length - 1]?.score ?? 0)
}
