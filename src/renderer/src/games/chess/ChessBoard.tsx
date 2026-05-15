import { useState, useCallback, useEffect } from 'react'
import type { Chess, Square, PieceSymbol, Color } from 'chess.js'
import { displaySquare, isLightSquare, legalDestsFrom, isPromotionMove, kingSquare } from './engine'

// ---------------------------------------------------------------------------
// Piece glyphs — solid Unicode chess pieces, colored with CSS
// ---------------------------------------------------------------------------

const GLYPHS: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
}

function Piece({ type, color, size = 32 }: { type: string; color: Color; size?: number }) {
  const isWhite = color === 'w'
  return (
    <span
      style={{
        fontSize:   `${size}px`,
        lineHeight: '1',
        display:    'block',
        userSelect: 'none',
        color:      isWhite ? '#ffffff' : '#1a1a2e',
        filter: isWhite
          ? 'drop-shadow(0 0 1px #000) drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
          : 'drop-shadow(0 0 1px rgba(255,255,255,0.25))',
      }}
    >
      {GLYPHS[type] ?? '?'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Promotion modal
// ---------------------------------------------------------------------------

const PROMO_PIECES: PieceSymbol[] = ['q', 'r', 'b', 'n']
const PROMO_LABELS: Record<string, string> = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }

function PromotionModal({ color, onSelect }: { color: Color; onSelect: (p: PieceSymbol) => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
      <div className="bg-surface-700 rounded-2xl p-6 border border-white/10 shadow-2xl">
        <p className="text-white text-sm font-semibold text-center mb-4">Promote pawn to:</p>
        <div className="flex gap-3">
          {PROMO_PIECES.map(p => (
            <button
              key={p}
              onClick={() => onSelect(p)}
              className="flex flex-col items-center gap-1 w-16 py-3 bg-surface-600 hover:bg-accent
                rounded-xl transition-colors border border-white/10"
            >
              <Piece type={p} color={color} />
              <span className="text-gray-300 text-xs">{PROMO_LABELS[p]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

interface Props {
  chess:            Chess
  perspective:      Color
  disabled:         boolean
  lastMove:         { from: Square; to: Square } | null
  onMove:           (from: Square, to: Square, promotion?: PieceSymbol) => void
  cellSize?:        number
  showLastMove?:    boolean
  premovesEnabled?: boolean
  premove?:         { from: Square; to: Square } | null
  onPremoveChange?: (pm: { from: Square; to: Square } | null) => void
  humanColor?:      Color
}

export default function ChessBoard({
  chess,
  perspective,
  disabled,
  lastMove,
  onMove,
  cellSize    = 56,
  showLastMove = true,
  premovesEnabled = false,
  premove,
  onPremoveChange,
  humanColor,
}: Props) {
  const [selected,     setSelected]     = useState<Square | null>(null)
  const [dests,        setDests]        = useState<Set<Square>>(new Set())
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square } | null>(null)
  const [hovering,     setHovering]     = useState<Square | null>(null)
  const [premoveFrom,  setPremoveFrom]  = useState<Square | null>(null)

  const pieceSize = Math.round(cellSize * 0.6)

  // Clear premove selection when board becomes enabled (human's turn starts)
  useEffect(() => {
    if (!disabled) {
      setPremoveFrom(null)
    }
  }, [disabled])

  const currentTurn = chess.turn()
  const inCheckKing = chess.isCheck() ? kingSquare(chess, currentTurn) : null

  const selectSquare = useCallback((sq: Square) => {
    const newDests = new Set<Square>(legalDestsFrom(chess, sq))
    setSelected(sq)
    setDests(newDests)
  }, [chess])

  function handleClick(sq: Square) {
    // ── Premove mode: board is disabled but premoves are enabled ──────────
    if (disabled && premovesEnabled) {
      const piece = chess.get(sq)

      if (premoveFrom) {
        if (sq === premoveFrom) {
          // Cancel premove selection
          setPremoveFrom(null)
        } else {
          // Commit the premove (from → to)
          onPremoveChange?.({ from: premoveFrom, to: sq })
          setPremoveFrom(null)
        }
      } else {
        // Only let the human select their own pieces
        if (piece && piece.color === humanColor) {
          setPremoveFrom(sq)
        }
      }
      return
    }

    if (disabled) return

    const piece = chess.get(sq)

    // If a pawn-promotion destination is already pending, ignore board clicks
    if (pendingPromo) return

    if (selected) {
      if (dests.has(sq)) {
        if (isPromotionMove(chess, selected, sq)) {
          setPendingPromo({ from: selected, to: sq })
          setSelected(null)
          setDests(new Set())
        } else {
          onMove(selected, sq)
          setSelected(null)
          setDests(new Set())
        }
      } else if (piece && piece.color === currentTurn) {
        selectSquare(sq)
      } else {
        setSelected(null)
        setDests(new Set())
      }
    } else {
      if (piece && piece.color === currentTurn) {
        selectSquare(sq)
      }
    }
  }

  function handlePromoSelect(p: PieceSymbol) {
    if (!pendingPromo) return
    onMove(pendingPromo.from, pendingPromo.to, p)
    setPendingPromo(null)
  }

  // Determine which color should be shown at the bottom (for coordinate labels)
  const rankLabels = perspective === 'w'
    ? ['8','7','6','5','4','3','2','1']
    : ['1','2','3','4','5','6','7','8']
  const fileLabels = perspective === 'w'
    ? ['a','b','c','d','e','f','g','h']
    : ['h','g','f','e','d','c','b','a']

  const LABEL_W = 20
  const boardPx  = cellSize * 8

  return (
    <div
      className="relative select-none"
      style={{ width: boardPx + LABEL_W + 4, height: boardPx + LABEL_W + 4, flexShrink: 0 }}
    >
      {/* Rank labels */}
      <div
        className="absolute left-0 top-0 flex flex-col"
        style={{ width: LABEL_W, height: boardPx }}
      >
        {rankLabels.map(r => (
          <div
            key={r}
            className="flex items-center justify-center text-xs font-medium text-gray-400"
            style={{ height: cellSize }}
          >
            {r}
          </div>
        ))}
      </div>

      {/* Board grid */}
      <div
        className="absolute border-2 border-surface-600 rounded overflow-hidden"
        style={{ left: LABEL_W, top: 0, width: boardPx, height: boardPx }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(8, ${cellSize}px)`,
            gridTemplateRows:    `repeat(8, ${cellSize}px)`,
          }}
        >
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => {
              const sq      = displaySquare(r, c, perspective)
              const piece   = chess.get(sq)
              const light   = isLightSquare(sq)
              const isSel   = selected === sq
              const isDest  = dests.has(sq)
              const isLast  = showLastMove && (lastMove?.from === sq || lastMove?.to === sq)
              const isChk   = inCheckKing === sq
              const isHov   = hovering === sq && !disabled
              const isPMSrc = premove?.from === sq  // committed premove from-square
              const isPMDst = premove?.to   === sq  // committed premove to-square
              const isPMSel = premoveFrom   === sq  // in-progress premove selection

              // --- background colour ---
              let bg = light ? '#eeeed2' : '#769656'
              if (isLast)  bg = light ? '#cdd16f' : '#aaa23a'
              if (isSel)   bg = '#f6f669'
              // Premove highlights (override last-move, but not selected)
              if (isPMSrc || isPMDst) bg = light ? '#6ec6e8' : '#3a9ec0'
              if (isPMSel)            bg = light ? '#90d8f4' : '#58b8e0'

              return (
                <div
                  key={sq}
                  style={{ width: cellSize, height: cellSize, background: bg, position: 'relative' }}
                  className="flex items-center justify-center cursor-pointer"
                  onClick={() => handleClick(sq)}
                  onMouseEnter={() => setHovering(sq)}
                  onMouseLeave={() => setHovering(null)}
                >
                  {/* Check highlight */}
                  {isChk && (
                    <div className="absolute inset-0 rounded-sm"
                      style={{ background: 'radial-gradient(circle, rgba(255,0,0,0.6) 20%, rgba(255,0,0,0) 70%)' }} />
                  )}

                  {/* Legal move dot / capture ring */}
                  {isDest && !piece && (
                    <div className="absolute rounded-full" style={{
                      width: cellSize * 0.3, height: cellSize * 0.3,
                      background: 'rgba(0,0,0,0.2)',
                      pointerEvents: 'none',
                    }} />
                  )}
                  {isDest && piece && (
                    <div className="absolute inset-0 rounded-sm" style={{
                      boxShadow: 'inset 0 0 0 4px rgba(0,0,0,0.35)',
                      pointerEvents: 'none',
                    }} />
                  )}

                  {/* Hover tint */}
                  {isHov && !isSel && (
                    <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
                  )}

                  {/* Piece */}
                  {piece && <Piece type={piece.type} color={piece.color} size={pieceSize} />}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* File labels */}
      <div
        className="absolute flex"
        style={{ left: LABEL_W, top: boardPx + 2, width: boardPx, height: LABEL_W }}
      >
        {fileLabels.map(f => (
          <div
            key={f}
            className="flex items-center justify-center text-xs font-medium text-gray-400"
            style={{ width: cellSize }}
          >
            {f}
          </div>
        ))}
      </div>

      {/* Promotion overlay */}
      {pendingPromo && (
        <div className="absolute inset-0 z-20" style={{ left: LABEL_W }}>
          <PromotionModal
            color={chess.get(pendingPromo.from)?.color ?? 'w'}
            onSelect={handlePromoSelect}
          />
        </div>
      )}
    </div>
  )
}
