import { useState, useCallback } from 'react'
import { Board, BOARD_SIZE, SHIP_DEFS, emptyBoard, placeShip, randomBoard, canPlace } from './gameLogic'

interface Props {
  playerName: string
  onDone: (board: Board) => void
  onBack: () => void
}

export default function ShipPlacement({ playerName, onDone, onBack }: Props) {
  const [board,      setBoard]      = useState<Board>(emptyBoard())
  const [shipIdx,    setShipIdx]    = useState(0)
  const [horizontal, setHorizontal] = useState(true)
  const [hover,      setHover]      = useState<[number,number] | null>(null)

  const currentDef = SHIP_DEFS[shipIdx]
  const done = shipIdx >= SHIP_DEFS.length

  const getHoverCells = useCallback((): Set<string> => {
    if (!hover || !currentDef) return new Set()
    const [row, col] = hover
    const cells = new Set<string>()
    for (let i = 0; i < currentDef.size; i++) {
      const r = horizontal ? row : row + i
      const c = horizontal ? col + i : col
      cells.add(`${r},${c}`)
    }
    return cells
  }, [hover, currentDef, horizontal])

  const isHoverValid = useCallback((): boolean => {
    if (!hover || !currentDef) return false
    const [row, col] = hover
    const ship = { id: currentDef.id, name: currentDef.name, size: currentDef.size, row, col, horizontal, hits: 0 }
    return canPlace(board, ship)
  }, [hover, currentDef, horizontal, board])

  function handleCellClick(row: number, col: number) {
    if (done) return
    const def = SHIP_DEFS[shipIdx]
    const next = placeShip(board, def, row, col, horizontal)
    if (next !== board) {
      setBoard(next)
      setShipIdx(i => i + 1)
    }
  }

  function handleRandom() {
    setBoard(randomBoard())
    setShipIdx(SHIP_DEFS.length)
  }

  function handleReset() {
    setBoard(emptyBoard())
    setShipIdx(0)
  }

  const hoverCells = getHoverCells()
  const hoverValid = isHoverValid()

  function cellClass(row: number, col: number): string {
    const key = `${row},${col}`
    const cell = board.cells[row][col]
    const inHover = hoverCells.has(key)

    if (inHover) {
      return hoverValid
        ? 'bg-accent/50 border-accent/80'
        : 'bg-red-500/40 border-red-500/70'
    }
    if (cell === 'ship') return 'bg-cyan-500/70 border-cyan-400/60'
    return 'bg-surface-600/60 border-white/5 hover:bg-surface-500/60'
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none p-6">
      <div className="flex gap-8 items-start">

        {/* Board */}
        <div className="flex flex-col items-center">
          <h2 className="text-white font-bold text-lg mb-1">{playerName}</h2>
          <p className="text-gray-400 text-xs mb-4">
            {done ? 'Fleet ready!' : `Place your ${currentDef.name} (${currentDef.size} cells)`}
          </p>

          {/* Column labels */}
          <div className="flex mb-0.5 ml-6">
            {'ABCDEFGHIJ'.split('').map(l => (
              <div key={l} className="w-8 text-center text-xs text-gray-500">{l}</div>
            ))}
          </div>

          <div className="flex">
            {/* Row labels */}
            <div className="flex flex-col mr-0.5">
              {Array.from({ length: BOARD_SIZE }, (_, i) => (
                <div key={i} className="h-8 flex items-center justify-center text-xs text-gray-500 w-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div
              className="grid border border-white/10 rounded"
              style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 2rem)` }}
              onMouseLeave={() => setHover(null)}
            >
              {Array.from({ length: BOARD_SIZE }, (_, r) =>
                Array.from({ length: BOARD_SIZE }, (_, c) => (
                  <div
                    key={`${r},${c}`}
                    className={`w-8 h-8 border cursor-pointer transition-colors ${cellClass(r, c)}`}
                    onMouseEnter={() => !done && setHover([r, c])}
                    onClick={() => handleCellClick(r, c)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4 w-48 pt-10">
          {/* Ship list */}
          <div className="bg-surface-700 rounded-xl p-3 border border-white/5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Fleet</p>
            {SHIP_DEFS.map((def, i) => {
              const placed = i < shipIdx
              const active = i === shipIdx
              return (
                <div key={def.id} className={`flex items-center justify-between py-1.5 px-2 rounded-lg mb-0.5 text-sm ${
                  active ? 'bg-accent/20 text-white' : placed ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  <span>{def.name}</span>
                  <span className="text-xs">
                    {placed ? '✓' : active ? '▶' : `×${def.size}`}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Controls */}
          {!done && (
            <button
              onClick={() => setHorizontal(h => !h)}
              className="bg-surface-600 hover:bg-surface-500 py-2 rounded-lg text-gray-200 text-sm
                font-medium transition-colors border border-white/5"
            >
              Rotate ({horizontal ? 'Horizontal' : 'Vertical'})
            </button>
          )}

          <button
            onClick={handleRandom}
            className="bg-surface-600 hover:bg-surface-500 py-2 rounded-lg text-gray-200 text-sm
              font-medium transition-colors border border-white/5"
          >
            Random Fleet
          </button>

          {shipIdx > 0 && (
            <button
              onClick={handleReset}
              className="bg-surface-600 hover:bg-surface-500 py-2 rounded-lg text-gray-400 text-sm
                font-medium transition-colors border border-white/5"
            >
              Reset
            </button>
          )}

          {done && (
            <button
              onClick={() => onDone(board)}
              className="bg-accent hover:bg-accent-light py-3 rounded-xl text-white font-bold
                text-sm transition-colors shadow-lg shadow-accent/20"
            >
              Ready!
            </button>
          )}

          <button
            onClick={onBack}
            className="bg-surface-600 hover:bg-surface-500 py-2 rounded-lg text-gray-400 text-sm
              transition-colors border border-white/5"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
