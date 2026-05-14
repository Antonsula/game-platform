import { useState } from 'react'
import type { Difficulty, SnakeMode } from '@shared/types'
import { DIFFICULTY_CONFIGS } from './gameLogic'

interface Props {
  onStart: (playerName: string, difficulty: Difficulty, mode: SnakeMode) => void
  onLeaderboard: () => void
  onBack: () => void
}

const DIFF_LABELS: Record<Difficulty, string> = {
  easy:   'Easy',
  medium: 'Medium',
  hard:   'Hard',
}

const DIFF_COLORS: Record<Difficulty, string> = {
  easy:   'bg-green-600  shadow-green-900/30  text-white',
  medium: 'bg-yellow-600 shadow-yellow-900/30 text-white',
  hard:   'bg-red-600    shadow-red-900/30    text-white',
}

export default function GameMenu({ onStart, onLeaderboard, onBack }: Props) {
  const [playerName, setPlayerName] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [mode,       setMode]       = useState<SnakeMode>('manual')
  const [nameError,  setNameError]  = useState(false)

  function handleStart() {
    if (!playerName.trim()) { setNameError(true); return }
    onStart(playerName.trim(), difficulty, mode)
  }

  const cfg = DIFFICULTY_CONFIGS[difficulty]
  const diffHint =
    difficulty === 'easy'
      ? `${cfg.obstacleCount} obstacles · ${cfg.baseInterval} ms/tick`
      : difficulty === 'medium'
      ? `${cfg.obstacleCount} obstacles · ${cfg.baseInterval} ms/tick`
      : `${cfg.obstacleCount} obstacles · ${cfg.baseInterval} ms/tick`

  return (
    <div className="flex flex-col items-center justify-center h-full gap-7 py-6 px-4 overflow-auto">
      {/* Title */}
      <div className="text-center select-none">
        <h1
          className="text-7xl font-black tracking-widest text-white leading-none"
          style={{ textShadow: '0 0 50px rgba(124,58,237,0.55)' }}
        >
          SNAKE
        </h1>
        <p className="text-gray-500 text-sm mt-2">Classic arcade · AI mode · Leaderboard</p>
      </div>

      <div className="w-full max-w-xs space-y-5">
        {/* Player name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Player Name
          </label>
          <input
            type="text"
            value={playerName}
            maxLength={20}
            placeholder="Enter your name…"
            onChange={e => { setPlayerName(e.target.value); setNameError(false) }}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            className={`w-full bg-surface-600 border ${
              nameError ? 'border-red-500' : 'border-white/10'
            } rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600
              focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition`}
          />
          {nameError && (
            <p className="text-red-400 text-xs mt-1">Please enter your name to continue.</p>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Difficulty
          </label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all no-select ${
                  difficulty === d
                    ? `${DIFF_COLORS[d]} shadow-lg`
                    : 'bg-surface-600 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                {DIFF_LABELS[d]}
              </button>
            ))}
          </div>
          <p className="text-gray-600 text-xs mt-1.5">{diffHint}</p>
        </div>

        {/* Mode */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Mode
          </label>
          <div className="flex gap-2">
            {(['manual', 'auto'] as SnakeMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all no-select ${
                  mode === m
                    ? m === 'auto'
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/30'
                      : 'bg-accent  text-white shadow-lg shadow-accent/25'
                    : 'bg-surface-600 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                {m === 'auto' ? 'Auto-play (AI)' : 'Manual'}
              </button>
            ))}
          </div>
          <p className="text-gray-600 text-xs mt-1.5">
            {mode === 'auto'
              ? 'BFS pathfinding AI navigates for you'
              : 'Control the snake with WASD keys'}
          </p>
        </div>

        {/* Actions */}
        <button
          onClick={handleStart}
          className="w-full py-3 bg-accent hover:bg-accent-light rounded-xl text-white font-bold text-base
            transition-colors shadow-lg shadow-accent/25 no-select"
        >
          Start Game
        </button>

        <button
          onClick={onLeaderboard}
          className="w-full py-2.5 bg-surface-600 hover:bg-surface-400 border border-white/10
            rounded-xl text-gray-300 hover:text-white font-semibold text-sm transition-colors no-select"
        >
          View Leaderboard
        </button>
      </div>

      {/* Back to launcher */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors no-select"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clipRule="evenodd" />
        </svg>
        Back to Launcher
      </button>
    </div>
  )
}
