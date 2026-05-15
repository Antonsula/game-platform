import { useState, useEffect } from 'react'
import type { FlappyScoreEntry, FlappyDifficulty } from '@shared/types'
import { getFlappyScores } from './scoresStore'

interface Props {
  onBack: () => void
}

type Filter = 'all' | FlappyDifficulty

const DIFF_LABEL: Record<FlappyDifficulty, string> = {
  easy:   'Easy',
  medium: 'Medium',
  hard:   'Hard',
}

const DIFF_COLOR: Record<FlappyDifficulty, string> = {
  easy:   'text-green-400',
  medium: 'text-yellow-400',
  hard:   'text-red-400',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '—' }
}

export default function FlappyLeaderboard({ onBack }: Props) {
  const [scores,  setScores]  = useState<FlappyScoreEntry[]>([])
  const [filter,  setFilter]  = useState<Filter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFlappyScores()
      .then(setScores)
      .finally(() => setLoading(false))
  }, [])

  const visible = filter === 'all'
    ? scores
    : scores.filter(s => s.difficulty === filter)

  const top = visible.slice(0, 50)

  return (
    <div className="flex flex-col h-full bg-surface-800 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
        <span className="text-white font-bold text-sm tracking-wide">FLAPPY BIRD — LEADERBOARD</span>
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-6 py-3 border-b border-white/5 shrink-0">
        {(['all', 'easy', 'medium', 'hard'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filter === f
                ? 'bg-accent text-white'
                : 'bg-surface-600 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : DIFF_LABEL[f as FlappyDifficulty]}
          </button>
        ))}
        <span className="ml-auto text-gray-600 text-xs self-center">
          {visible.length} {visible.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && (
          <p className="text-gray-500 text-sm text-center mt-8">Loading…</p>
        )}

        {!loading && top.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-gray-500 text-sm">No scores yet.</p>
            <p className="text-gray-600 text-xs mt-1">Play a game to get on the board!</p>
          </div>
        )}

        {!loading && top.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="text-left pb-2 w-8">#</th>
                <th className="text-left pb-2">Player</th>
                <th className="text-right pb-2">Score</th>
                <th className="text-center pb-2">Difficulty</th>
                <th className="text-center pb-2">Mode</th>
                <th className="text-right pb-2 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {top.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`border-b border-white/5 transition-colors hover:bg-white/3 ${
                    i === 0 ? 'text-yellow-300' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-400'
                  }`}
                >
                  <td className="py-2 text-xs font-bold">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="py-2 font-medium truncate max-w-[120px]">{entry.playerName}</td>
                  <td className="py-2 text-right font-mono font-bold">{entry.score}</td>
                  <td className={`py-2 text-center text-xs capitalize ${DIFF_COLOR[entry.difficulty]}`}>
                    {entry.difficulty}
                  </td>
                  <td className="py-2 text-center text-xs text-gray-500">
                    {entry.mode === 'ai' ? '🤖' : '🕹'}
                  </td>
                  <td className="py-2 text-right text-xs text-gray-600 hidden sm:table-cell">
                    {formatDate(entry.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
