export const BOARD_SIZE = 10

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk'

export interface Ship {
  id: string
  name: string
  size: number
  /** top-left corner */
  row: number
  col: number
  horizontal: boolean
  hits: number
}

export interface Board {
  cells: CellState[][]
  ships: Ship[]
}

export const SHIP_DEFS: { id: string; name: string; size: number }[] = [
  { id: 'carrier',    name: 'Carrier',    size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser',    name: 'Cruiser',    size: 3 },
  { id: 'submarine',  name: 'Submarine',  size: 3 },
  { id: 'destroyer',  name: 'Destroyer',  size: 2 },
]

export function emptyBoard(): Board {
  return {
    cells: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill('empty')),
    ships: [],
  }
}

export function canPlace(board: Board, ship: Omit<Ship, 'hits'>): boolean {
  const { row, col, size, horizontal } = ship
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i
    const c = horizontal ? col + i : col
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false
    if (board.cells[r][c] === 'ship') return false
  }
  return true
}

export function placeShip(board: Board, def: { id: string; name: string; size: number }, row: number, col: number, horizontal: boolean): Board {
  const ship: Ship = { ...def, row, col, horizontal, hits: 0 }
  if (!canPlace(board, ship)) return board

  const cells = board.cells.map(r => [...r]) as CellState[][]
  for (let i = 0; i < ship.size; i++) {
    const r = horizontal ? row : row + i
    const c = horizontal ? col + i : col
    cells[r][c] = 'ship'
  }
  return { cells, ships: [...board.ships, ship] }
}

export function randomBoard(): Board {
  let board = emptyBoard()
  for (const def of SHIP_DEFS) {
    let placed = false
    while (!placed) {
      const horizontal = Math.random() < 0.5
      const maxRow = horizontal ? BOARD_SIZE : BOARD_SIZE - def.size
      const maxCol = horizontal ? BOARD_SIZE - def.size : BOARD_SIZE
      const row = Math.floor(Math.random() * maxRow)
      const col = Math.floor(Math.random() * maxCol)
      const next = placeShip(board, def, row, col, horizontal)
      if (next !== board) { board = next; placed = true }
    }
  }
  return board
}

export interface AttackResult {
  result: 'miss' | 'hit' | 'sunk' | 'already'
  sunkShip?: Ship
  won: boolean
}

export function attack(board: Board, row: number, col: number): { board: Board; result: AttackResult } {
  const cell = board.cells[row][col]
  if (cell === 'hit' || cell === 'miss' || cell === 'sunk') {
    return { board, result: { result: 'already', won: false } }
  }

  const cells = board.cells.map(r => [...r]) as CellState[][]

  if (cell === 'empty') {
    cells[row][col] = 'miss'
    return { board: { ...board, cells }, result: { result: 'miss', won: false } }
  }

  // Hit a ship
  const ships = board.ships.map(s => ({ ...s }))
  const hitShip = ships.find(s => {
    for (let i = 0; i < s.size; i++) {
      const r = s.horizontal ? s.row : s.row + i
      const c = s.horizontal ? s.col + i : s.col
      if (r === row && c === col) return true
    }
    return false
  })

  if (!hitShip) {
    cells[row][col] = 'miss'
    return { board: { ...board, cells }, result: { result: 'miss', won: false } }
  }

  hitShip.hits++
  cells[row][col] = 'hit'

  if (hitShip.hits === hitShip.size) {
    // Mark all cells of this ship as sunk
    for (let i = 0; i < hitShip.size; i++) {
      const r = hitShip.horizontal ? hitShip.row : hitShip.row + i
      const c = hitShip.horizontal ? hitShip.col + i : hitShip.col
      cells[r][c] = 'sunk'
    }
    const won = ships.every(s => s.hits === s.size)
    return { board: { cells, ships }, result: { result: 'sunk', sunkShip: hitShip, won } }
  }

  return { board: { cells, ships }, result: { result: 'hit', won: false } }
}

export function shipCells(ship: Ship): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < ship.size; i++) {
    out.push(ship.horizontal ? [ship.row, ship.col + i] : [ship.row + i, ship.col])
  }
  return out
}

export function isAlreadyAttacked(board: Board, row: number, col: number): boolean {
  const c = board.cells[row][col]
  return c === 'hit' || c === 'miss' || c === 'sunk'
}
