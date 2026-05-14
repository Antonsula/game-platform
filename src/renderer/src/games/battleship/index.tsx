import { useState } from 'react'
import BattleshipMenu    from './BattleshipMenu'
import ShipPlacement     from './ShipPlacement'
import TurnTransition    from './TurnTransition'
import BattleshipGame    from './BattleshipGame'
import { Board, randomBoard } from './gameLogic'
import { AIState, initAI } from './aiLogic'

interface Props {
  onBack: () => void
}

type Phase =
  | { name: 'menu' }
  | { name: 'placeP1'; mode: '1p' | '2p'; p1Name: string; p2Name: string }
  | { name: 'transitionP2'; mode: '2p'; p1Name: string; p2Name: string; p1Board: Board }
  | { name: 'placeP2'; mode: '2p'; p1Name: string; p2Name: string; p1Board: Board }
  | { name: 'transitionStart'; mode: '1p' | '2p'; p1Name: string; p2Name: string; p1Board: Board; p2Board: Board; aiState: AIState | null }
  | { name: 'playing'; mode: '1p' | '2p'; p1Name: string; p2Name: string; p1Board: Board; p2Board: Board; aiState: AIState | null; gameKey: number }
  | { name: 'gameover'; winner: string; mode: '1p' | '2p'; p1Name: string; p2Name: string }

interface TurnOverlay {
  nextPlayer: string
  onReady: () => void
}

export default function BattleshipIndex({ onBack }: Props) {
  const [phase,   setPhase]   = useState<Phase>({ name: 'menu' })
  const [overlay, setOverlay] = useState<TurnOverlay | null>(null)

  function startPlacement(mode: '1p' | '2p', p1Name: string, p2Name: string) {
    setPhase({ name: 'placeP1', mode, p1Name, p2Name })
  }

  function handleP1Placed(mode: '1p' | '2p', p1Name: string, p2Name: string, p1Board: Board) {
    if (mode === '1p') {
      const p2Board = randomBoard()
      const aiState = initAI()
      setPhase({ name: 'transitionStart', mode, p1Name, p2Name, p1Board, p2Board, aiState })
    } else {
      setPhase({ name: 'transitionP2', mode: '2p', p1Name, p2Name, p1Board })
    }
  }

  function handleP2Placed(p1Name: string, p2Name: string, p1Board: Board, p2Board: Board) {
    setPhase({ name: 'transitionStart', mode: '2p', p1Name, p2Name, p1Board, p2Board, aiState: null })
  }

  function startGame(mode: '1p' | '2p', p1Name: string, p2Name: string, p1Board: Board, p2Board: Board, aiState: AIState | null, gameKey = 0) {
    setPhase({ name: 'playing', mode, p1Name, p2Name, p1Board, p2Board, aiState, gameKey })
  }

  function handleGameOver(winner: string) {
    const p = phase as Extract<Phase, { name: 'playing' }>
    setOverlay(null)
    setPhase({ name: 'gameover', winner, mode: p.mode, p1Name: p.p1Name, p2Name: p.p2Name })
  }

  // --- Render ---

  if (phase.name === 'menu') {
    return <BattleshipMenu onStart={startPlacement} onBack={onBack} />
  }

  if (phase.name === 'placeP1') {
    const { mode, p1Name, p2Name } = phase
    return (
      <ShipPlacement
        playerName={p1Name}
        onDone={board => handleP1Placed(mode, p1Name, p2Name, board)}
        onBack={() => setPhase({ name: 'menu' })}
      />
    )
  }

  if (phase.name === 'transitionP2') {
    const { p1Name, p2Name, p1Board } = phase
    return (
      <TurnTransition
        nextPlayer={p2Name}
        onReady={() => setPhase({ name: 'placeP2', mode: '2p', p1Name, p2Name, p1Board })}
      />
    )
  }

  if (phase.name === 'placeP2') {
    const { p1Name, p2Name, p1Board } = phase
    return (
      <ShipPlacement
        playerName={p2Name}
        onDone={board => handleP2Placed(p1Name, p2Name, p1Board, board)}
        onBack={() => setPhase({ name: 'transitionP2', mode: '2p', p1Name, p2Name, p1Board })}
      />
    )
  }

  if (phase.name === 'transitionStart') {
    const { mode, p1Name, p2Name, p1Board, p2Board, aiState } = phase
    return (
      <TurnTransition
        nextPlayer={p1Name}
        onReady={() => startGame(mode, p1Name, p2Name, p1Board, p2Board, aiState)}
      />
    )
  }

  if (phase.name === 'playing') {
    const { mode, p1Name, p2Name, p1Board, p2Board, aiState, gameKey } = phase
    return (
      <div className="relative h-full">
        <BattleshipGame
          key={gameKey}
          mode={mode}
          p1Name={p1Name}
          p2Name={p2Name}
          p1Board={p1Board}
          p2Board={p2Board}
          aiState={aiState}
          onGameOver={handleGameOver}
          onTransition={(nextPlayer, onReady) => {
            setOverlay({
              nextPlayer,
              onReady: () => {
                setOverlay(null)
                onReady()
              },
            })
          }}
        />
        {overlay && (
          <div className="absolute inset-0 z-10">
            <TurnTransition nextPlayer={overlay.nextPlayer} onReady={overlay.onReady} />
          </div>
        )}
      </div>
    )
  }

  if (phase.name === 'gameover') {
    const { winner, mode, p1Name, p2Name } = phase
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none">
        <div className="w-full max-w-sm bg-surface-700 rounded-2xl p-8 shadow-2xl border border-white/5 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-white mb-2">{winner} wins!</h2>
          <p className="text-gray-400 text-sm mb-8">The enemy fleet has been destroyed.</p>
          <button
            onClick={() => startPlacement(mode, p1Name, p2Name)}
            className="w-full bg-accent hover:bg-accent-light py-3 rounded-xl text-white font-bold
              text-sm transition-colors shadow-lg shadow-accent/20 mb-3"
          >
            Play Again
          </button>
          <button
            onClick={() => setPhase({ name: 'menu' })}
            className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl text-gray-300
              text-sm font-medium transition-colors mb-3"
          >
            Main Menu
          </button>
          <button
            onClick={onBack}
            className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl text-gray-400
              text-sm transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    )
  }

  return null
}
