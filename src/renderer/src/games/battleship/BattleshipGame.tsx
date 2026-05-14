import { useState } from 'react'
import { Board, attack, isAlreadyAttacked } from './gameLogic'
import { AIState, aiAttack } from './aiLogic'
import GameBoard from './GameBoard'

interface LogEntry {
  text: string
  type: 'hit' | 'miss' | 'sunk' | 'info'
}

interface Props {
  mode: '1p' | '2p'
  p1Name: string
  p2Name: string
  p1Board: Board
  p2Board: Board
  /** Only in '2p' mode — the AI state */
  aiState?: AIState | null
  onGameOver: (winnerName: string) => void
  onTransition?: (nextPlayer: string, onReady: () => void) => void
}

export default function BattleshipGame({
  mode, p1Name, p2Name, p1Board: initP1Board, p2Board: initP2Board,
  aiState: initAIState, onGameOver, onTransition,
}: Props) {
  const [p1Board,    setP1Board]    = useState(initP1Board)
  const [p2Board,    setP2Board]    = useState(initP2Board)
  const [aiState,    setAIState]    = useState(initAIState ?? null)
  const [turn,       setTurn]       = useState<1 | 2>(1)
  const [hoverCell,  setHoverCell]  = useState<[number, number] | null>(null)
  const [lastP1Atk,  setLastP1Atk]  = useState<[number, number] | null>(null)
  const [lastP2Atk,  setLastP2Atk]  = useState<[number, number] | null>(null)
  const [log,        setLog]        = useState<LogEntry[]>([
    { text: `${p1Name} opens fire!`, type: 'info' },
  ])
  const [waiting,    setWaiting]    = useState(false)

  function addLog(text: string, type: LogEntry['type']) {
    setLog(prev => [{ text, type }, ...prev].slice(0, 30))
  }

  function handleP1Attack(row: number, col: number) {
    if (turn !== 1 || waiting) return
    if (isAlreadyAttacked(p2Board, row, col)) return

    const { board: newBoard, result } = attack(p2Board, row, col)
    setP2Board(newBoard)
    setLastP1Atk([row, col])
    setHoverCell(null)

    const coord = `${'ABCDEFGHIJ'[col]}${row + 1}`

    if (result.result === 'sunk') {
      addLog(`${p1Name} sunk ${p2Name}'s ${result.sunkShip!.name}!`, 'sunk')
    } else if (result.result === 'hit') {
      addLog(`${p1Name} hit at ${coord}!`, 'hit')
    } else {
      addLog(`${p1Name} missed at ${coord}.`, 'miss')
    }

    if (result.won) {
      onGameOver(p1Name)
      return
    }

    // Switch turns
    if (mode === '2p') {
      setWaiting(true)
      onTransition?.(p2Name, () => {
        setWaiting(false)
        setTurn(2)
        addLog(`${p2Name} takes aim…`, 'info')
      })
    } else {
      // AI turn after short delay
      setWaiting(true)
      setTimeout(() => {
        if (!aiState) return
        const { board: newP1Board, ai: newAI, row, col, result } = aiAttack(p1Board, aiState)
        setP1Board(newP1Board)
        setAIState(newAI)
        setLastP2Atk([row, col])

        const coord = `${'ABCDEFGHIJ'[col]}${row + 1}`
        if (result.result === 'sunk') {
          addLog(`AI sunk your ${result.sunkShip!.name}!`, 'sunk')
        } else if (result.result === 'hit') {
          addLog(`AI hit at ${coord}!`, 'hit')
        } else {
          addLog(`AI missed at ${coord}.`, 'miss')
        }

        if (result.won) {
          onGameOver(p2Name)
          return
        }

        setWaiting(false)
        setTurn(1)
        addLog(`${p1Name}'s turn.`, 'info')
      }, 600)
    }
  }

  function handleP2Attack(row: number, col: number) {
    if (turn !== 2 || waiting || mode !== '2p') return
    if (isAlreadyAttacked(p1Board, row, col)) return

    const { board: newBoard, result } = attack(p1Board, row, col)
    setP1Board(newBoard)
    setLastP2Atk([row, col])
    setHoverCell(null)

    const coord = `${'ABCDEFGHIJ'[col]}${row + 1}`

    if (result.result === 'sunk') {
      addLog(`${p2Name} sunk ${p1Name}'s ${result.sunkShip!.name}!`, 'sunk')
    } else if (result.result === 'hit') {
      addLog(`${p2Name} hit at ${coord}!`, 'hit')
    } else {
      addLog(`${p2Name} missed at ${coord}.`, 'miss')
    }

    if (result.won) {
      onGameOver(p2Name)
      return
    }

    setWaiting(true)
    onTransition?.(p1Name, () => {
      setWaiting(false)
      setTurn(1)
      addLog(`${p1Name} takes aim…`, 'info')
    })
  }

  // Determine which board to attack (from current player's perspective)
  const attackBoard  = turn === 1 ? p2Board : p1Board
  const ownBoard     = turn === 1 ? p1Board : p2Board
  const attackFn     = turn === 1 ? handleP1Attack : handleP2Attack
  const lastAtk      = turn === 1 ? lastP1Atk : lastP2Atk
  const currentName  = turn === 1 ? p1Name : p2Name
  const opponentName = turn === 1 ? p2Name : p1Name

  return (
    <div className="flex flex-col h-full bg-surface-800 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
        <div className="text-white font-bold text-sm">BATTLESHIP</div>
        <div className="text-gray-400 text-xs">
          {waiting ? 'Waiting…' : `${currentName}'s turn`}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Center: boards */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-4 overflow-hidden">
          <div className="flex gap-8 items-start">
            {/* Own board */}
            {mode === '2p' ? (
              <GameBoard
                board={ownBoard}
                revealShips
                lastAttack={turn === 1 ? lastP2Atk : lastP1Atk}
                label={`${currentName}'s Fleet`}
                disabled
              />
            ) : (
              <GameBoard
                board={p1Board}
                revealShips
                lastAttack={lastP2Atk}
                label={`${p1Name}'s Fleet`}
                disabled
              />
            )}

            {/* Enemy board */}
            {mode === '2p' ? (
              <GameBoard
                board={attackBoard}
                revealShips={false}
                onAttack={!waiting ? attackFn : undefined}
                hoverCell={hoverCell}
                onHover={setHoverCell}
                lastAttack={lastAtk}
                label={`${opponentName}'s Waters`}
                disabled={waiting}
              />
            ) : (
              <GameBoard
                board={p2Board}
                revealShips={false}
                onAttack={!waiting && turn === 1 ? handleP1Attack : undefined}
                hoverCell={hoverCell}
                onHover={setHoverCell}
                lastAttack={lastP1Atk}
                label="Enemy Waters"
                disabled={waiting || turn !== 1}
              />
            )}
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

