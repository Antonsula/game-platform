import { useState } from 'react'
import PinballGame from './PinballGame'
import { getHighScores, saveHighScore, isHighScore } from './leaderboard'

interface Props { onBack: () => void }

export default function PinballIndex({ onBack }: Props) {
  const [phase,      setPhase]      = useState<'menu' | 'playing' | 'gameover'>('menu')
  const [playerName, setPlayerName] = useState('Player')
  const [finalScore, setFinalScore] = useState(0)
  const [newHiScore, setNewHiScore] = useState(false)

  function handleStart() {
    setPhase('playing')
  }

  function handleGameOver(score: number) {
    setFinalScore(score)
    const isNew = isHighScore(score)
    if (isNew) {
      saveHighScore({ name: playerName.trim() || 'Player', score, date: new Date().toISOString() })
      setNewHiScore(true)
    } else {
      setNewHiScore(false)
    }
    setPhase('gameover')
  }

  if (phase === 'playing') {
    return (
      <PinballGame
        playerName={playerName.trim() || 'Player'}
        onBack={() => setPhase('menu')}
        onGameOver={handleGameOver}
      />
    )
  }

  const scores = getHighScores()

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-800 select-none overflow-y-auto py-6">
      <div className="w-full max-w-md bg-slate-700 rounded-2xl p-8 shadow-2xl border border-white/5">
        {phase === 'menu' && (
          <>
            <h1 className="text-4xl font-black text-white text-center mb-1 tracking-tight">PINBALL</h1>
            <p className="text-gray-400 text-sm text-center mb-6">Flippers • Bumpers • Jackpots</p>

            <div className="mb-6">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
                Player Name
              </label>
              <input
                className="w-full bg-slate-600 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-400/60"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                maxLength={20}
                placeholder="Player"
                autoFocus
              />
            </div>

            {scores.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">High Scores</p>
                <div className="space-y-1">
                  {scores.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-slate-600/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                        <span className="text-sm text-white font-medium">{s.name}</span>
                      </div>
                      <span className="text-sm font-mono text-yellow-400 font-bold">{s.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleStart}
                className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-900/40"
              >
                Start Game
              </button>
              <button
                onClick={onBack}
                className="w-full bg-slate-600 hover:bg-slate-500 py-2.5 rounded-xl text-gray-300 text-sm font-medium transition-colors"
              >
                Back to Library
              </button>
            </div>
          </>
        )}

        {phase === 'gameover' && (
          <>
            <h2 className="text-3xl font-black text-white text-center mb-1">GAME OVER</h2>
            <p className="text-gray-400 text-sm text-center mb-4">{playerName.trim() || 'Player'}</p>
            {newHiScore && (
              <p className="text-yellow-400 text-center font-bold mb-2 animate-pulse">🏆 NEW HIGH SCORE!</p>
            )}
            <div className="text-5xl font-black text-yellow-400 font-mono text-center mb-6">
              {finalScore.toLocaleString()}
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setPhase('playing')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-900/40"
              >
                Play Again
              </button>
              <button
                onClick={() => setPhase('menu')}
                className="w-full bg-slate-600 hover:bg-slate-500 py-2.5 rounded-xl text-gray-300 text-sm font-medium transition-colors"
              >
                Back to Menu
              </button>
              <button
                onClick={onBack}
                className="w-full bg-slate-600 hover:bg-slate-500 py-2.5 rounded-xl text-gray-400 text-sm transition-colors"
              >
                Back to Library
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
