import { Board, BOARD_SIZE, attack, AttackResult, isAlreadyAttacked } from './gameLogic'

type AIMode = 'hunt' | 'target'

export interface AIState {
  mode: AIMode
  /** Cells we know are hits but not yet sunk */
  hitQueue: [number, number][]
  /** Candidate cells to try around confirmed hits */
  targetQueue: [number, number][]
  /** Set of attacked cells as "r,c" strings */
  attacked: Set<string>
}

export function initAI(): AIState {
  return { mode: 'hunt', hitQueue: [], targetQueue: [], attacked: new Set() }
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function neighbours(row: number, col: number): [number, number][] {
  return ([[-1,0],[1,0],[0,-1],[0,1]] as [number,number][])
    .map(([dr,dc]) => [row+dr, col+dc] as [number,number])
    .filter(([r,c]) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE)
}

function directedCandidates(hits: [number, number][]): [number, number][] {
  if (hits.length < 2) return []
  const sameRow = hits.every(([r]) => r === hits[0][0])
  const candidates: [number, number][] = []
  if (sameRow) {
    const row = hits[0][0]
    const cols = hits.map(([,c]) => c).sort((a,b) => a-b)
    if (cols[0] > 0)                      candidates.push([row, cols[0] - 1])
    if (cols[cols.length-1] < BOARD_SIZE-1) candidates.push([row, cols[cols.length-1] + 1])
  } else {
    const col = hits[0][1]
    const rows = hits.map(([r]) => r).sort((a,b) => a-b)
    if (rows[0] > 0)                      candidates.push([rows[0] - 1, col])
    if (rows[rows.length-1] < BOARD_SIZE-1) candidates.push([rows[rows.length-1] + 1, col])
  }
  return candidates
}

export interface AIAttackResult {
  board: Board
  ai: AIState
  row: number
  col: number
  result: AttackResult
}

export function aiAttack(board: Board, ai: AIState): AIAttackResult {
  const newAI: AIState = {
    mode: ai.mode,
    hitQueue: [...ai.hitQueue],
    targetQueue: [...ai.targetQueue],
    attacked: new Set(ai.attacked),
  }

  let row!: number
  let col!: number

  if (newAI.mode === 'target' && newAI.hitQueue.length > 0) {
    const directed = directedCandidates(newAI.hitQueue)
      .filter(([r,c]) => !newAI.attacked.has(`${r},${c}`))

    const candidates = directed.length > 0
      ? directed
      : newAI.hitQueue
          .flatMap(([r,c]) => neighbours(r,c))
          .filter(([r,c]) => !newAI.attacked.has(`${r},${c}`))

    if (candidates.length > 0) {
      ;[row, col] = candidates[Math.floor(Math.random() * candidates.length)]
      newAI.attacked.add(`${row},${col}`)
      const { board: newBoard, result } = attack(board, row, col)
      if (result.result === 'hit') {
        newAI.hitQueue.push([row, col])
      } else if (result.result === 'sunk') {
        newAI.hitQueue = []
        newAI.mode = 'hunt'
      }
      return { board: newBoard, ai: newAI, row, col, result }
    }
    // All neighbours exhausted — clear queue and fall through to hunt
    newAI.hitQueue = []
    newAI.mode = 'hunt'
  }

  // Hunt: checkerboard pattern
  const candidates: [number, number][] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!newAI.attacked.has(`${r},${c}`) && (r + c) % 2 === 0) candidates.push([r, c])
    }
  }
  if (candidates.length === 0) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!newAI.attacked.has(`${r},${c}`)) candidates.push([r, c])
      }
    }
  }

  ;[row, col] = shuffle(candidates)[0]
  newAI.attacked.add(`${row},${col}`)

  const { board: newBoard, result } = attack(board, row, col)
  if (result.result === 'hit') {
    newAI.hitQueue.push([row, col])
    newAI.mode = 'target'
  } else if (result.result === 'sunk') {
    newAI.hitQueue = []
    newAI.mode = 'hunt'
  }

  return { board: newBoard, ai: newAI, row, col, result }
}

export { isAlreadyAttacked }
