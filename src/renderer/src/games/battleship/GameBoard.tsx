import { Board, BOARD_SIZE } from './gameLogic'

interface Props {
  board: Board
  /** If true, show ship positions (own board). If false, hide un-hit ships (enemy board). */
  revealShips: boolean
  /** If provided, cells are clickable and this is called on click */
  onAttack?: (row: number, col: number) => void
  /** Hover state for attack preview */
  hoverCell?: [number, number] | null
  onHover?: (cell: [number, number] | null) => void
  /** Highlight the last attack */
  lastAttack?: [number, number] | null
  label?: string
  disabled?: boolean
}

export default function GameBoard({
  board, revealShips, onAttack, hoverCell, onHover, lastAttack, label, disabled,
}: Props) {
  function cellStyle(row: number, col: number): string {
    const cell = board.cells[row][col]
    const isLast = lastAttack?.[0] === row && lastAttack?.[1] === col
    const isHover = hoverCell?.[0] === row && hoverCell?.[1] === col

    let base = 'w-8 h-8 border flex items-center justify-center text-xs font-bold transition-colors relative'

    if (isHover && onAttack && !disabled) {
      base += ' bg-yellow-400/30 border-yellow-400/60 cursor-crosshair'
      return base
    }

    switch (cell) {
      case 'hit':
        base += ` bg-red-500/70 border-red-400/80 ${isLast ? 'ring-2 ring-white/60' : ''}`
        break
      case 'sunk':
        // On the enemy board never distinguish sunk from hit — revealing the full
        // ship outline in a different colour exposes its shape and orientation.
        if (revealShips) {
          base += ` bg-red-900/80 border-red-700/60 ${isLast ? 'ring-2 ring-white/60' : ''}`
        } else {
          base += ` bg-red-500/70 border-red-400/80 ${isLast ? 'ring-2 ring-white/60' : ''}`
        }
        break
      case 'miss':
        base += ` bg-surface-600/60 border-white/10 ${isLast ? 'ring-2 ring-white/20' : ''}`
        break
      case 'ship':
        if (revealShips) {
          base += ' bg-cyan-500/70 border-cyan-400/60'
        } else {
          base += ' bg-surface-600/40 border-white/5'
          if (onAttack && !disabled) base += ' hover:bg-surface-500/60 cursor-crosshair'
        }
        break
      default:
        base += ' bg-surface-600/40 border-white/5'
        if (onAttack && !disabled) base += ' hover:bg-surface-500/60 cursor-crosshair'
    }

    return base
  }

  function cellContent(row: number, col: number) {
    const cell = board.cells[row][col]
    if (cell === 'hit')                          return <span className="text-red-200">✕</span>
    if (cell === 'sunk' && revealShips)          return <span className="text-red-400">✕</span>
    if (cell === 'sunk' && !revealShips)         return <span className="text-red-200">✕</span>
    if (cell === 'miss')                         return <span className="text-blue-300/50">•</span>
    return null
  }

  function handleClick(row: number, col: number) {
    const cell = board.cells[row][col]
    if (cell === 'hit' || cell === 'miss' || cell === 'sunk') return
    if (disabled) return
    onAttack?.(row, col)
  }

  return (
    <div className="flex flex-col items-center">
      {label && <p className="text-gray-300 text-sm font-medium mb-2">{label}</p>}

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
          onMouseLeave={() => onHover?.(null)}
        >
          {Array.from({ length: BOARD_SIZE }, (_, r) =>
            Array.from({ length: BOARD_SIZE }, (_, c) => (
              <div
                key={`${r},${c}`}
                className={cellStyle(r, c)}
                onMouseEnter={() => {
                  const cell = board.cells[r][c]
                  if (cell !== 'hit' && cell !== 'miss' && cell !== 'sunk' && !disabled) {
                    onHover?.([r, c])
                  } else {
                    onHover?.(null)
                  }
                }}
                onClick={() => handleClick(r, c)}
              >
                {cellContent(r, c)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
