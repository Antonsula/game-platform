import { useState, useEffect } from 'react'
import type { LeaderboardEntry, Difficulty } from '@shared/types'
import { getAllEntries } from './leaderboardStore'

interface Props {
  onBack: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

const DIFF_COLORS: Record<Difficulty, string> = {
  easy:   'text-green-400',
  medium: 'text-yellow-400',
  hard:   'text-red-400',
}

export default function LeaderboardView({ onBack }: Props) {
  const [entries,    setEntries]    = useState<LeaderboardEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [diffFilter, setDiffFilter] = useState<Difficulty | ''>('')

  useEffect(() => {
    getAllEntries().then(e => { setEntries(e); setLoading(false) })
  }, [])

  const filtered = diffFilter
    ? entries.filter(e => e.difficulty === diffFilter)
    : entries

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div>
          <h2 className="text-white font-bold text-xl">Leaderboard</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}
            {diffFilter ? ` · ${diffFilter}` : ' · all difficulties'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={diffFilter}
            onChange={e => setDiffFilter(e.target.value as Difficulty | '')}
            className="bg-surface-600 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white
              focus:outline-none focus:border-accent/60 transition cursor-pointer"
          >
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-600 hover:bg-surface-400
              border border-white/10 rounded-lg text-gray-300 hover:text-white text-sm font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd" />
            </svg>
            Back
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-600 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                  clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium mb-1">No scores yet</p>
            <p className="text-gray-600 text-sm">
              {diffFilter ? `No ${diffFilter} scores recorded.` : 'Play a game to appear here.'}
            </p>
          </div>
        ) : (
          <div className="w-full">
            {/* Column headers */}
            <div className="grid gap-3 px-4 py-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600"
              style={{ gridTemplateColumns: '2.5rem 1fr 4.5rem 6rem 5rem 7rem' }}>
              <span>#</span>
              <span>Player</span>
              <span className="text-right">Score</span>
              <span className="text-center">Difficulty</span>
              <span className="text-center">Mode</span>
              <span className="text-right">Date</span>
            </div>

            <div className="space-y-1">
              {filtered.map((entry, i) => {
                const isTop3 = i < 3
                const rank   = i + 1
                return (
                  <div
                    key={entry.id}
                    className={`grid gap-3 px-4 py-3 rounded-xl items-center transition-colors ${
                      isTop3
                        ? 'bg-surface-500 border border-white/5'
                        : 'hover:bg-surface-600'
                    }`}
                    style={{ gridTemplateColumns: '2.5rem 1fr 4.5rem 6rem 5rem 7rem' }}
                  >
                    <span className={`font-bold text-sm ${RANK_COLORS[i] ?? 'text-gray-600'}`}>
                      {rank}
                    </span>
                    <span className="text-white text-sm font-medium truncate">
                      {entry.playerName}
                    </span>
                    <span className="text-white text-sm font-bold text-right tabular-nums">
                      {entry.score}
                    </span>
                    <span className={`text-xs font-semibold text-center capitalize ${DIFF_COLORS[entry.difficulty]}`}>
                      {entry.difficulty}
                    </span>
                    <span className={`text-xs text-center capitalize ${
                      entry.mode === 'auto' ? 'text-sky-400' : 'text-gray-400'
                    }`}>
                      {entry.mode}
                    </span>
                    <span className="text-gray-500 text-xs text-right">
                      {formatDate(entry.date)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
