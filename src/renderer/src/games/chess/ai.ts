import { Chess } from 'chess.js'
import type { Move, Color } from 'chess.js'
import type { ChessDifficulty } from './types'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEPTH_MAP: Record<ChessDifficulty, number> = {
  easy:   2,
  medium: 3,
  hard:   4,
}

const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20_000,
}

const CHECKMATE_SCORE = 1_000_000

// ---------------------------------------------------------------------------
// Piece-square tables (from White's perspective, rank 8 first)
// ---------------------------------------------------------------------------

const PST: Record<string, number[][]> = {
  p: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  r: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0],
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20],
  ],
}

// ---------------------------------------------------------------------------
// Static evaluation (positive = good for White)
// ---------------------------------------------------------------------------

function evaluate(chess: Chess): number {
  if (chess.isCheckmate())   return chess.turn() === 'w' ? -CHECKMATE_SCORE : CHECKMATE_SCORE
  if (chess.isDraw())        return 0

  let score = 0
  const board = chess.board()
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (!p) continue
      const pstRow = p.color === 'w' ? r : 7 - r
      const pst   = PST[p.type]?.[pstRow]?.[c] ?? 0
      const val   = PIECE_VALUES[p.type] + pst
      score += p.color === 'w' ? val : -val
    }
  }
  return score
}

// ---------------------------------------------------------------------------
// Move ordering: captures (MVV-LVA) first, then others
// ---------------------------------------------------------------------------

function moveScore(m: Move): number {
  if (m.captured) return 10 * (PIECE_VALUES[m.captured] ?? 0) - (PIECE_VALUES[m.piece] ?? 0)
  return 0
}

function sortMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => moveScore(b) - moveScore(a))
}

// ---------------------------------------------------------------------------
// Minimax with alpha-beta pruning
// ---------------------------------------------------------------------------

function minimax(chess: Chess, depth: number, alpha: number, beta: number): number {
  if (chess.isGameOver()) return evaluate(chess)
  if (depth === 0)        return evaluate(chess)

  const moves = sortMoves(chess.moves({ verbose: true }) as Move[])
  const maximising = chess.turn() === 'w'

  if (maximising) {
    let best = -Infinity
    for (const m of moves) {
      chess.move(m)
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta))
      chess.undo()
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      chess.move(m)
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta))
      chess.undo()
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the best move for `aiColor` at the given difficulty.
 *  Runs synchronously — call inside a setTimeout to avoid blocking the UI. */
export function getBestMove(fen: string, aiColor: Color, difficulty: ChessDifficulty): Move | null {
  const chess  = new Chess(fen)
  const depth  = DEPTH_MAP[difficulty]
  const moves  = sortMoves(chess.moves({ verbose: true }) as Move[])
  if (moves.length === 0) return null

  // Easy mode: 30% chance of a random legal move
  if (difficulty === 'easy' && Math.random() < 0.3) {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  let bestMove: Move | null = null
  let bestScore = aiColor === 'w' ? -Infinity : Infinity

  for (const m of moves) {
    chess.move(m)
    const score = minimax(chess, depth - 1, -Infinity, Infinity)
    chess.undo()
    const isBetter = aiColor === 'w' ? score > bestScore : score < bestScore
    if (isBetter) { bestScore = score; bestMove = m }
  }

  return bestMove
}
