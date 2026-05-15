import { useState, useEffect, useRef } from 'react'
import { Board, attack, isAlreadyAttacked } from './gameLogic'
import { AIState, aiAttack } from './aiLogic'
import GameBoard from './GameBoard'

interface LogEntry {
  text: string
  type: 'hit' | 'miss' | 'sunk' | 'info'
}

interface Props {
  mode: '1p' | '2p' | 'lan'
  p1Name: string
  p2Name: string
  p1Board: Board
  p2Board: Board
  /** Only in '1p' mode */
  aiState?: AIState | null
  /** LAN only — 'host' = p1, goes first; 'join' = p2, goes second */
  lanRole?: 'host' | 'join'
  onGameOver: (winnerName: string) => void
  onTransition?: (nextPlayer: string, onReady: () => void) => void
}

export default function BattleshipGame({
  mode, p1Name, p2Name,
  p1Board: initP1Board, p2Board: initP2Board,
  aiState: initAIState, lanRole,
  onGameOver, onTransition,
}: Props) {
  const [p1Board,   setP1Board]   = useState(initP1Board)
  const [p2Board,   setP2Board]   = useState(initP2Board)
  const [aiState,   setAIState]   = useState(initAIState ?? null)

  // Refs so the LAN effect handler always reads the latest board without re-registering
  const p1BoardRef = useRef(p1Board)
  const p2BoardRef = useRef(p2Board)
  p1BoardRef.current = p1Board
  p2BoardRef.current = p2Board
  const [turn,      setTurn]      = useState<1 | 2>(1)
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null)
  const [lastP1Atk, setLastP1Atk] = useState<[number, number] | null>(null)
  const [lastP2Atk, setLastP2Atk] = useState<[number, number] | null>(null)
  const [log,       setLog]       = useState<LogEntry[]>([
    { text: `${p1Name} opens fire!`, type: 'info' },
  ])
  const [waiting,   setWaiting]   = useState(false)

  function addLog(text: string, type: LogEntry['type']) {
    setLog(prev => [{ text, type }, ...prev].slice(0, 30))
  }

  // ── LAN: listen for incoming shots ──────────────────────────────────────
  // Registered once; reads live board state via refs to avoid stale closures.
  useEffect(() => {
    if (mode !== 'lan') return

    window.api.net.onMessage((msg: any) => {
      if (msg.type !== 'battle:shot') return
      const { row, col } = msg as { type: string; row: number; col: number }

      if (lanRole === 'host') {
        // I am p1 — peer (p2) fired at my board
        const { board: newBoard, result } = attack(p1BoardRef.current, row, col)
        setP1Board(newBoard)
        setLastP2Atk([row, col])
        const coord = `${'ABCDEFGHIJ'[col]}${row + 1}`
        if      (result.result === 'sunk') addLog(`${p2Name} sunk your ${result.sunkShip!.name}!`, 'sunk')
        else if (result.result === 'hit')  addLog(`${p2Name} hit at ${coord}!`, 'hit')
        else                               addLog(`${p2Name} missed at ${coord}.`, 'miss')
        if (result.won) { onGameOver(p2Name); return }
        setWaiting(false)
        setTurn(1)
        addLog(`${p1Name} takes aim…`, 'info')
      } else {
        // I am p2 — peer (p1) fired at my board
        const { board: newBoard, result } = attack(p2BoardRef.current, row, col)
        setP2Board(newBoard)
        setLastP1Atk([row, col])
        const coord = `${'ABCDEFGHIJ'[col]}${row + 1}`
        if      (result.result === 'sunk') addLog(`${p1Name} sunk your ${result.sunkShip!.name}!`, 'sunk')
        else if (result.result === 'hit')  addLog(`${p1Name} hit at ${coord}!`, 'hit')
        else                               addLog(`${p1Name} missed at ${coord}.`, 'miss')
        if (result.won) { onGameOver(p1Name); return }
        setWaiting(false)
        setTurn(2)
        addLog(`${p2Name} takes aim…`, 'info')
      }
    })

    window.api.net.onDisconnect(() => {
      addLog('Opponent disconnected.', 'info')
      setWaiting(true)  // freeze the board
    })

    return () => {
      // Only remove listeners here — do NOT call stop().
      // React StrictMode runs cleanup+remount once in dev, and calling stop()
      // would close the live WebSocket before the second mount re-registers handlers.
      // stop() is called explicitly when the user navigates away (lan-gameover buttons).
      window.api.net.offAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lanRole])

  // ── Attack handlers ──────────────────────────────────────────────────────
  function handleP1Attack(row: number, col: number) {
    if (turn !== 1 || waiting) return
    if (isAlreadyAttacked(p2Board, row, col)) return

    const { board: newBoard, result } = attack(p2Board, row, col)
    setP2Board(newBoard)
    setLastP1Atk([row, col])
    setHoverCell(null)

    const coord = `${'ABCDEFGHIJ'[col]}${row + 1}`
    if      (result.result === 'sunk') addLog(`${p1Name} sunk ${p2Name}'s ${result.sunkShip!.name}!`, 'sunk')
    else if (result.result === 'hit')  addLog(`${p1Name} hit at ${coord}!`, 'hit')
    else                               addLog(`${p1Name} missed at ${coord}.`, 'miss')

    if (result.won) { onGameOver(p1Name); return }

    if (mode === 'lan') {
      // Send shot to peer; wait for their turn
      window.api.net.send({ type: 'battle:shot', row, col })
      setWaiting(true)
      setTurn(2)
      addLog(`${p2Name} taking aim…`, 'info')
    } else if (mode === '2p') {
      setWaiting(true)
      onTransition?.(p2Name, () => {
        setWaiting(false)
        setTurn(2)
        addLog(`${p2Name} takes aim…`, 'info')
      })
    } else {
      // AI turn
      setWaiting(true)
      setTimeout(() => {
        if (!aiState) return
        const { board: newP1Board, ai: newAI, row: ar, col: ac, result: ar2 } = aiAttack(p1Board, aiState)
        setP1Board(newP1Board)
        setAIState(newAI)
        setLastP2Atk([ar, ac])
        const coord2 = `${'ABCDEFGHIJ'[ac]}${ar + 1}`
        if      (ar2.result === 'sunk') addLog(`AI sunk your ${ar2.sunkShip!.name}!`, 'sunk')
        else if (ar2.result === 'hit')  addLog(`AI hit at ${coord2}!`, 'hit')
        else                            addLog(`AI missed at ${coord2}.`, 'miss')
        if (ar2.won) { onGameOver(p2Name); return }
        setWaiting(false)
        setTurn(1)
        addLog(`${p1Name}'s turn.`, 'info')
      }, 600)
    }
  }

  function handleP2Attack(row: number, col: number) {
    if (turn !== 2 || waiting) return
    if (mode !== '2p' && mode !== 'lan') return
    if (isAlreadyAttacked(p1Board, row, col)) return

    const { board: newBoard, result } = attack(p1Board, row, col)
    setP1Board(newBoard)
    setLastP2Atk([row, col])
    setHoverCell(null)

    const coord = `${'ABCDEFGHIJ'[col]}${row + 1}`
    if      (result.result === 'sunk') addLog(`${p2Name} sunk ${p1Name}'s ${result.sunkShip!.name}!`, 'sunk')
    else if (result.result === 'hit')  addLog(`${p2Name} hit at ${coord}!`, 'hit')
    else                               addLog(`${p2Name} missed at ${coord}.`, 'miss')

    if (result.won) { onGameOver(p2Name); return }

    if (mode === 'lan') {
      window.api.net.send({ type: 'battle:shot', row, col })
      setWaiting(true)
      setTurn(1)
      addLog(`${p1Name} taking aim…`, 'info')
    } else {
      setWaiting(true)
      onTransition?.(p1Name, () => {
        setWaiting(false)
        setTurn(1)
        addLog(`${p1Name} takes aim…`, 'info')
      })
    }
  }

  // ── Derived view ─────────────────────────────────────────────────────────
  // In LAN mode, always show from local player's perspective:
  //   host = p1 → own fleet on left, p2 board on right
  //   join = p2 → own fleet on left, p1 board on right

  let myBoard: Board, enemyBoard: Board
  let myName: string, enemyName: string
  let myLastAtk: [number, number] | null, enemyLastAtk: [number, number] | null
  let attackFn: (r: number, c: number) => void
  let isMyTurn: boolean

  if (mode === 'lan') {
    if (lanRole === 'host') {
      myBoard    = p1Board;  enemyBoard   = p2Board
      myName     = p1Name;   enemyName    = p2Name
      myLastAtk  = lastP1Atk; enemyLastAtk = lastP2Atk
      attackFn   = handleP1Attack
      isMyTurn   = turn === 1
    } else {
      myBoard    = p2Board;  enemyBoard   = p1Board
      myName     = p2Name;   enemyName    = p1Name
      myLastAtk  = lastP2Atk; enemyLastAtk = lastP1Atk
      attackFn   = handleP2Attack
      isMyTurn   = turn === 2
    }
  } else {
    // Non-LAN: same layout as before
    myBoard      = turn === 1 ? p1Board : p2Board
    enemyBoard   = turn === 1 ? p2Board : p1Board
    myName       = turn === 1 ? p1Name  : p2Name
    enemyName    = turn === 1 ? p2Name  : p1Name
    myLastAtk    = turn === 1 ? lastP2Atk : lastP1Atk
    enemyLastAtk = turn === 1 ? lastP1Atk : lastP2Atk
    attackFn     = turn === 1 ? handleP1Attack : handleP2Attack
    isMyTurn     = !waiting
  }

  const currentName = mode === 'lan'
    ? (isMyTurn ? myName : enemyName)
    : (turn === 1 ? p1Name : p2Name)

  return (
    <div className="flex flex-col h-full bg-surface-800 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
        <div className="text-white font-bold text-sm">BATTLESHIP</div>
        <div className="text-gray-400 text-xs">
          {waiting
            ? (mode === 'lan' ? `${enemyName}'s turn…` : 'Waiting…')
            : `${currentName}'s turn`}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Center: boards */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-4 overflow-hidden">
          <div className="flex gap-8 items-start">
            {/* Own fleet */}
            <GameBoard
              board={mode === 'lan' ? myBoard : (mode === '2p' ? myBoard : p1Board)}
              revealShips
              lastAttack={mode === 'lan' ? enemyLastAtk : lastP2Atk}
              label={mode === 'lan' ? `${myName}'s Fleet` : (mode === '2p' ? `${myName}'s Fleet` : `${p1Name}'s Fleet`)}
              disabled
            />

            {/* Enemy board */}
            <GameBoard
              board={mode === 'lan' ? enemyBoard : p2Board}
              revealShips={false}
              onAttack={!waiting ? attackFn : undefined}
              hoverCell={hoverCell}
              onHover={setHoverCell}
              lastAttack={mode === 'lan' ? myLastAtk : lastP1Atk}
              label={mode === 'lan' ? `${enemyName}'s Waters` : 'Enemy Waters'}
              disabled={waiting || (mode === 'lan' ? !isMyTurn : turn !== 1)}
            />
          </div>
        </div>

        {/* Right: log */}
        <div className="w-44 shrink-0 flex flex-col border-l border-white/5 py-4 px-3 overflow-hidden">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Battle Log</p>
          <div className="flex-1 overflow-y-auto space-y-1">
            {log.map((entry, i) => (
              <div
                key={i}
                className={`text-xs px-2 py-1 rounded ${
                  entry.type === 'sunk' ? 'text-red-300 bg-red-500/10' :
                  entry.type === 'hit'  ? 'text-orange-300' :
                  entry.type === 'miss' ? 'text-blue-300/60' :
                  'text-gray-500'
                }`}
              >
                {entry.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
