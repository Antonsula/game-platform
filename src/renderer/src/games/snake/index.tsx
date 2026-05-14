/**
 * SnakeGame — top-level orchestrator.
 *
 * State machine:
 *   menu  →  playing  →  gameover  →  menu / leaderboard
 *   menu  →  leaderboard  →  menu
 *   gameover → leaderboard → gameover
 *   Any view → launcher (via onBack prop)
 */

import { useState, useRef } from 'react'
import type { Difficulty, SnakeMode } from '@shared/types'
import GameMenu      from './GameMenu'
import SnakeCanvas   from './SnakeCanvas'
import LeaderboardView from './LeaderboardView'
import { saveEntry } from './leaderboardStore'

type View = 'menu' | 'playing' | 'gameover' | 'leaderboard'

interface GameOverInfo {
  score:      number
  playerName: string
  difficulty: Difficulty
  mode:       SnakeMode
}

interface Props {
  /** Called when the user wants to go back to the launcher library */
  onBack: () => void
}

export default function SnakeGame({ onBack }: Props) {
  const [view,       setView]       = useState<View>('menu')
  const [playerName, setPlayerName] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [mode,       setMode]       = useState<SnakeMode>('manual')
  const [gameOver,   setGameOver]   = useState<GameOverInfo | null>(null)
  // Controls which view the leaderboard "Back" button returns to
  const leaderboardReturnRef = useRef<'menu' | 'gameover'>('menu')
  // Incremented every time a new game instance should mount
  const [instanceKey, setInstanceKey] = useState(0)

  function startGame(name: string, diff: Difficulty, m: SnakeMode) {
    setPlayerName(name)
    setDifficulty(diff)
    setMode(m)
    setInstanceKey(k => k + 1)
    setView('playing')
  }

  async function handleGameOver(score: number) {
    await saveEntry({ playerName, score, difficulty, mode })
    setGameOver({ score, playerName, difficulty, mode })
    setView('gameover')
  }

  function openLeaderboard(from: 'menu' | 'gameover') {
    leaderboardReturnRef.current = from
    setView('leaderboard')
  }

  function handleLeaderboardBack() {
    setView(leaderboardReturnRef.current)
  }

  return (
    <div className="flex flex-col h-full bg-surface-800 overflow-hidden">
      {view === 'menu' && (
        <GameMenu
          onStart={startGame}
          onLeaderboard={() => openLeaderboard('menu')}
          onBack={onBack}
        />
      )}

      {view === 'playing' && (
        <SnakeCanvas
          key={instanceKey}
          difficulty={difficulty}
          mode={mode}
          onGameOver={handleGameOver}
          onExitToMenu={() => setView('menu')}
        />
      )}

      {view === 'gameover' && gameOver && (
        <GameOverScreen
          info={gameOver}
          onPlayAgain={() => {
            setGameOver(null)
            setInstanceKey(k => k + 1)
            setView('playing')
          }}
          onLeaderboard={() => openLeaderboard('gameover')}
          onMenu={() => setView('menu')}
          onBack={onBack}
        />
      )}

      {view === 'leaderboard' && (
        <LeaderboardView onBack={handleLeaderboardBack} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Game-over screen (defined here since it's small and tightly coupled)
// ---------------------------------------------------------------------------

interface GameOverScreenProps {
  info: GameOverInfo
  onPlayAgain:   () => void
  onLeaderboard: () => void
  onMenu:        () => void
  onBack:        () => void
}

function GameOverScreen({ info, onPlayAgain, onLeaderboard, onMenu, onBack }: GameOverScreenProps) {
  const diffColor =
    info.difficulty === 'hard'   ? 'text-red-400'    :
    info.difficulty === 'medium' ? 'text-yellow-400' : 'text-green-400'

  return (
    <div className="flex flex-col items-center justify-center h-full gap-7 px-4">
      {/* Score display */}
      <div className="text-center">
        <p className="text-red-400 text-sm font-semibold uppercase tracking-widest mb-3">
          Game Over
        </p>
        <p
          className="text-white font-black leading-none"
          style={{ fontSize: '5rem', textShadow: '0 0 40px rgba(124,58,237,0.4)' }}
        >
          {info.score}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {info.playerName}
          <span className="mx-2 text-gray-600">·</span>
          <span className={`capitalize font-semibold ${diffColor}`}>{info.difficulty}</span>
          <span className="mx-2 text-gray-600">·</span>
          <span className={info.mode === 'auto' ? 'text-sky-400' : 'text-gray-400'}>
            {info.mode}
          </span>
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-stretch gap-3 w-52">
        <button
          onClick={onPlayAgain}
          className="py-3 bg-accent hover:bg-accent-light rounded-xl text-white font-bold
            transition-colors shadow-lg shadow-accent/25 no-select"
        >
          Play Again
        </button>
        <button
          onClick={onLeaderboard}
          className="py-2.5 bg-surface-600 hover:bg-surface-400 border border-white/10
            rounded-xl text-gray-300 hover:text-white font-semibold text-sm transition-colors no-select"
        >
          View Leaderboard
        </button>
        <button
          onClick={onMenu}
          className="py-2.5 bg-surface-600 hover:bg-surface-400 border border-white/10
            rounded-xl text-gray-300 hover:text-white font-semibold text-sm transition-colors no-select"
        >
          Back to Menu
        </button>
      </div>

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-white text-sm transition-colors no-select"
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
