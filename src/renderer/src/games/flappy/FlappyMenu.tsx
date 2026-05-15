import { useState } from 'react'
import type { FlappyConfig, FlappyDifficulty, FlappyMode } from './types'

interface Props {
  onStart:       (config: FlappyConfig) => void
  onLeaderboard: () => void
  onBack:        () => void
}

export default function FlappyMenu({ onStart, onLeaderboard, onBack }: Props) {
  const [playerName, setPlayerName] = useState('')
  const [difficulty, setDifficulty] = useState<FlappyDifficulty>('medium')
  const [mode,       setMode]       = useState<FlappyMode>('manual')

  const nameOk = playerName.trim().length > 0

  function handleStart() {
    if (!nameOk) return
    onStart({ playerName: playerName.trim(), difficulty, mode })
  }

  const diffColors: Record<FlappyDifficulty, string> = {
    easy:   'bg-green-600 hover:bg-green-500',
    medium: 'bg-yellow-600 hover:bg-yellow-500',
    hard:   'bg-red-700 hover:bg-red-600',
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none overflow-y-auto py-6">
      <div className="w-full max-w-sm bg-surface-700 rounded-2xl p-8 shadow-2xl border border-white/5">

        <h1 className="text-3xl font-bold text-white text-center mb-1 tracking-tight">
          FLAPPY BIRD
        </h1>
        <p className="text-gray-400 text-sm text-center mb-8">Tap to fly. Don't hit the pipes.</p>

        {/* Player name */}
        <div className="mb-6">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
            Player Name
          </label>
          <input
            className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2
              text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-accent/60"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            maxLength={20}
            placeholder="Enter your name…"
            autoFocus
          />
          {playerName.length > 0 && !nameOk && (
            <p className="text-red-400 text-xs mt-1">Name cannot be empty.</p>
          )}
        </div>

        {/* Difficulty */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
            Difficulty
          </p>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                  difficulty === d
                    ? `${diffColors[d]} text-white shadow-lg`
                    : 'bg-surface-600 text-gray-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div className="mb-8">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
            Game Mode
          </p>
          <div className="flex gap-2">
            {([
              ['manual', '🕹 Manual'],
              ['ai',     '🤖 Auto AI'],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'bg-accent text-white shadow-lg shadow-accent/30'
                    : 'bg-surface-600 text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'ai' && (
            <p className="text-gray-500 text-xs mt-2 text-center">
              Watch the AI predict pipes and auto-flap.
            </p>
          )}
        </div>

        {/* Start */}
        <button
          onClick={handleStart}
          disabled={!nameOk}
          className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-colors
            shadow-lg mb-3 ${
            nameOk
              ? 'bg-accent hover:bg-accent-light shadow-accent/20'
              : 'bg-surface-500 text-gray-600 cursor-not-allowed'
          }`}
        >
          Start Game
        </button>

        {/* Leaderboard */}
        <button
          onClick={onLeaderboard}
          className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl text-gray-300
            text-sm font-medium transition-colors mb-2"
        >
          Leaderboard
        </button>

        {/* Back */}
        <button
          onClick={onBack}
          className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl text-gray-400
            text-sm font-medium transition-colors"
        >
          Back to Library
        </button>
      </div>
    </div>
  )
}
