import { useState, useEffect } from 'react'
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
  // ── Local modes ──────────────────────────────────────────────────────────
  | { name: 'placeP1';       mode: '1p' | '2p'; p1Name: string; p2Name: string }
  | { name: 'transitionP2';  mode: '2p';        p1Name: string; p2Name: string; p1Board: Board }
  | { name: 'placeP2';       mode: '2p';        p1Name: string; p2Name: string; p1Board: Board }
  | { name: 'transitionStart'; mode: '1p' | '2p'; p1Name: string; p2Name: string; p1Board: Board; p2Board: Board; aiState: AIState | null }
  | { name: 'playing';       mode: '1p' | '2p'; p1Name: string; p2Name: string; p1Board: Board; p2Board: Board; aiState: AIState | null; gameKey: number }
  | { name: 'gameover';      winner: string;    mode: '1p' | '2p'; p1Name: string; p2Name: string }
  // ── LAN mode ─────────────────────────────────────────────────────────────
  | { name: 'lan-place';   role: 'host' | 'join'; myName: string }
  | { name: 'lan-waiting'; role: 'host' | 'join'; myName: string; myBoard: Board }
  | { name: 'lan-playing'; role: 'host' | 'join'; myName: string; peerName: string; myBoard: Board; peerBoard: Board; gameKey: number }
  | { name: 'lan-gameover'; myName: string; peerName: string; winnerName: string }

interface TurnOverlay {
  nextPlayer: string
  onReady: () => void
}

export default function BattleshipIndex({ onBack }: Props) {
  const [phase,   setPhase]   = useState<Phase>({ name: 'menu' })
  const [overlay, setOverlay] = useState<TurnOverlay | null>(null)

  // NOTE: board-exchange listeners are registered in handleLanPlaced (see below),
  // not in a useEffect. This avoids a race condition where the peer sends their
  // board while we are still in 'lan-place' phase (before any useEffect for
  // 'lan-waiting' has run). Event handlers are never double-invoked by React
  // StrictMode, so registering there is safe.

  // ── Local helpers ─────────────────────────────────────────────────────────
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

  function handleLanGameOver(winnerName: string) {
    const p = phase as Extract<Phase, { name: 'lan-playing' }>
    setPhase({ name: 'lan-gameover', myName: p.myName, peerName: p.peerName, winnerName })
  }

  // ── LAN helpers ───────────────────────────────────────────────────────────
  function handleLanStart(role: 'host' | 'join', myName: string) {
    setPhase({ name: 'lan-place', role, myName })
  }

  function handleLanPlaced(board: Board) {
    const p = phase as Extract<Phase, { name: 'lan-place' }>
    const { role, myName } = p

    // Register the listener BEFORE sending our board.
    // If the peer clicked Ready first, their board message may arrive the moment
    // we send ours — registering first ensures we never miss it.
    window.api.net.offAll()
    window.api.net.onMessage((msg: any) => {
      if (msg.type !== 'battle:board') return
      const peerBoard = msg.board as Board
      const peerName  = msg.playerName as string
      window.api.net.offAll()
      setPhase({ name: 'lan-playing', role, myName, peerName, myBoard: board, peerBoard, gameKey: 0 })
    })
    window.api.net.onDisconnect(() => {
      window.api.net.offAll()
      setPhase({ name: 'menu' })
    })

    // Now send our board and show the waiting screen
    window.api.net.send({ type: 'battle:board', board, playerName: myName })
    setPhase({ name: 'lan-waiting', role, myName, myBoard: board })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase.name === 'menu') {
    return (
      <BattleshipMenu
        onStart={startPlacement}
        onStartLan={handleLanStart}
        onBack={onBack}
      />
    )
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
              onReady: () => { setOverlay(null); onReady() },
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

  // ── LAN phases ────────────────────────────────────────────────────────────

  if (phase.name === 'lan-place') {
    const { myName } = phase
    return (
      <ShipPlacement
        playerName={myName}
        onDone={handleLanPlaced}
        onBack={() => {
          window.api.net.stop()
          setPhase({ name: 'menu' })
        }}
      />
    )
  }

  if (phase.name === 'lan-waiting') {
    const { myName } = phase
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none">
        <div className="w-full max-w-sm bg-surface-700 rounded-2xl p-8 shadow-2xl border border-white/5 text-center space-y-4">
          <div className="text-4xl">⚓</div>
          <h2 className="text-xl font-bold text-white">Fleet deployed, {myName}!</h2>
          <p className="text-gray-400 text-sm animate-pulse">Waiting for opponent to finish placing ships…</p>
          <button
            onClick={() => { window.api.net.stop(); setPhase({ name: 'menu' }) }}
            className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl text-gray-400
              text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (phase.name === 'lan-playing') {
    const { role, myName, peerName, myBoard, peerBoard, gameKey } = phase
    // host = p1 (goes first), join = p2 (goes second)
    const p1Board = role === 'host' ? myBoard  : peerBoard
    const p2Board = role === 'host' ? peerBoard : myBoard
    const p1Name  = role === 'host' ? myName   : peerName
    const p2Name  = role === 'host' ? peerName  : myName
    return (
      <BattleshipGame
        key={gameKey}
        mode="lan"
        p1Name={p1Name}
        p2Name={p2Name}
        p1Board={p1Board}
        p2Board={p2Board}
        lanRole={role}
        onGameOver={handleLanGameOver}
      />
    )
  }

  if (phase.name === 'lan-gameover') {
    const { myName, peerName, winnerName } = phase
    const iWon = winnerName === myName
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none">
        <div className="w-full max-w-sm bg-surface-700 rounded-2xl p-8 shadow-2xl border border-white/5 text-center space-y-4">
          <div className="text-5xl">{iWon ? '🎉' : '💀'}</div>
          <h2 className="text-3xl font-bold text-white">{winnerName} wins!</h2>
          <p className="text-gray-400 text-sm">
            {iWon
              ? `You sank ${peerName}'s entire fleet!`
              : `${peerName} sank your entire fleet.`}
          </p>
          <button
            onClick={() => { window.api.net.stop(); setPhase({ name: 'menu' }) }}
            className="w-full bg-accent hover:bg-accent-light py-3 rounded-xl text-white font-bold
              text-sm transition-colors shadow-lg shadow-accent/20"
          >
            Back to Menu
          </button>
          <button
            onClick={() => { window.api.net.stop(); onBack() }}
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
