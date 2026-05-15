import type { Chess, Square, PieceSymbol, Color } from 'chess.js'

/** Squares in display order for a given perspective.
 *  Returns the Square name at grid position (displayRow, displayCol). */
export function displaySquare(row: number, col: number, perspective: Color): Square {
  if (perspective === 'w') {
    return `${'abcdefgh'[col]}${8 - row}` as Square
  }
  return `${'hgfedcba'[col]}${row + 1}` as Square
}

/** True if the square is a light-coloured square. */
export function isLightSquare(sq: Square): boolean {
  const fileIdx = 'abcdefgh'.indexOf(sq[0])
  const rank    = parseInt(sq[1])
  return (fileIdx + rank) % 2 === 0
}

/** All legal destination squares for pieces on `from`. */
export function legalDestsFrom(chess: Chess, from: Square): Square[] {
  return chess.moves({ verbose: true })
    .filter(m => m.from === from)
    .map(m => m.to)
}

/** True if moving the piece on `from` to `to` triggers pawn promotion. */
export function isPromotionMove(chess: Chess, from: Square, to: Square): boolean {
  return chess.moves({ verbose: true })
    .some(m => m.from === from && m.to === to && m.promotion !== undefined)
}

/** Returns the square the current player's king sits on (for check highlight). */
export function kingSquare(chess: Chess, color: Color): Square | null {
  const board = chess.board()
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p?.type === 'k' && p.color === color) {
        return `${'abcdefgh'[c]}${8 - r}` as Square
      }
    }
  }
  return null
}

/** Pieces captured by each side, derived from move history. */
export function capturedPieces(chess: Chess): { byWhite: PieceSymbol[]; byBlack: PieceSymbol[] } {
  const byWhite: PieceSymbol[] = []
  const byBlack: PieceSymbol[] = []
  for (const move of chess.history({ verbose: true })) {
    if (move.captured) {
      if (move.color === 'w') byWhite.push(move.captured)
      else                    byBlack.push(move.captured)
    }
  }
  return { byWhite, byBlack }
}

/** Move history paired into [whiteMove, blackMove] rows. */
export function pairedHistory(chess: Chess): { num: number; white: string; black: string }[] {
  const h = chess.history()
  const pairs: { num: number; white: string; black: string }[] = []
  for (let i = 0; i < h.length; i += 2) {
    pairs.push({ num: Math.floor(i / 2) + 1, white: h[i], black: h[i + 1] ?? '' })
  }
  return pairs
}

/** Human-readable game result string. */
export function gameResultText(chess: Chess, whiteName: string, blackName: string): string {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? blackName : whiteName
    return `${winner} wins by checkmate`
  }
  if (chess.isStalemate())           return 'Draw by stalemate'
  if (chess.isThreefoldRepetition()) return 'Draw by threefold repetition'
  if (chess.isInsufficientMaterial()) return 'Draw — insufficient material'
  if (chess.isDraw())                return 'Draw by fifty-move rule'
  return 'Game over'
}

const PIECE_VALUES: Partial<Record<PieceSymbol, number>> = {
  p: 1, n: 3, b: 3, r: 5, q: 9,
}
/** Material advantage in pawns (positive = white ahead). */
export function materialDiff(chess: Chess): number {
  let diff = 0
  for (const row of chess.board()) {
    for (const p of row) {
      if (!p) continue
      const v = PIECE_VALUES[p.type] ?? 0
      diff += p.color === 'w' ? v : -v
    }
  }
  return diff
}
