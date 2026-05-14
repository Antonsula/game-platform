/**
 * Pure Snake game logic — no React or DOM dependencies.
 * All functions return new state objects; nothing is mutated in place.
 */

import type { Difficulty } from '@shared/types'
export type { Difficulty } from '@shared/types'

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export type Point = { x: number; y: number }
export type GameStatus = 'running' | 'dead'

// ---------------------------------------------------------------------------
// Board constants
// ---------------------------------------------------------------------------

export const GRID_W = 28
export const GRID_H = 22
export const CELL_SIZE = 22
export const CANVAS_W = GRID_W * CELL_SIZE // 616
export const CANVAS_H = GRID_H * CELL_SIZE // 484

// ---------------------------------------------------------------------------
// Difficulty configuration — tweak these numbers to change feel
// ---------------------------------------------------------------------------

export interface DifficultyConfig {
  /** Milliseconds between ticks at game start */
  baseInterval: number
  /** Number of obstacle tiles placed on the board */
  obstacleCount: number
  /** Milliseconds subtracted from interval each time food is eaten */
  speedIncrement: number
  /** Minimum allowed interval (speed cap) */
  minInterval: number
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy:   { baseInterval: 180, obstacleCount: 3,  speedIncrement: 3, minInterval: 80 },
  medium: { baseInterval: 120, obstacleCount: 10, speedIncrement: 5, minInterval: 50 },
  hard:   { baseInterval: 70,  obstacleCount: 20, speedIncrement: 7, minInterval: 30 },
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export interface GameState {
  /** snake[0] is the head, snake[length-1] is the tail */
  snake: Point[]
  food: Point
  obstacles: Point[]
  /** Last committed direction of travel */
  direction: Direction
  /** Queued direction from player input — applied on next tick */
  pendingDirection: Direction
  score: number
  status: GameStatus
  difficulty: Difficulty
  /** Current ms between ticks; decreases as the snake eats food */
  currentInterval: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function movePoint(p: Point, dir: Direction): Point {
  switch (dir) {
    case 'UP':    return { x: p.x,     y: p.y - 1 }
    case 'DOWN':  return { x: p.x,     y: p.y + 1 }
    case 'LEFT':  return { x: p.x - 1, y: p.y     }
    case 'RIGHT': return { x: p.x + 1, y: p.y     }
  }
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return (a === 'UP'    && b === 'DOWN')  ||
         (a === 'DOWN'  && b === 'UP')    ||
         (a === 'LEFT'  && b === 'RIGHT') ||
         (a === 'RIGHT' && b === 'LEFT')
}

export function inBounds(p: Point): boolean {
  return p.x >= 0 && p.x < GRID_W && p.y >= 0 && p.y < GRID_H
}

function ptKey(p: Point): string { return `${p.x},${p.y}` }

function inSet(p: Point, arr: Point[]): boolean {
  return arr.some(a => a.x === p.x && a.y === p.y)
}

function randomFree(occupied: Point[]): Point {
  const used = new Set(occupied.map(ptKey))
  const free: Point[] = []
  for (let x = 0; x < GRID_W; x++)
    for (let y = 0; y < GRID_H; y++)
      if (!used.has(`${x},${y}`)) free.push({ x, y })
  if (free.length === 0) return { x: 0, y: 0 }
  return free[Math.floor(Math.random() * free.length)]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create a fresh game state for the given difficulty. */
export function initGame(difficulty: Difficulty): GameState {
  const config = DIFFICULTY_CONFIGS[difficulty]

  // Snake starts in the centre of the board, 3 segments long, heading right
  const cx = Math.floor(GRID_W / 2)
  const cy = Math.floor(GRID_H / 2)
  const snake: Point[] = [
    { x: cx,     y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ]

  // Clear zone: a rectangle in the centre kept free of obstacles
  const safeZone = new Set<string>()
  for (let dx = -6; dx <= 6; dx++)
    for (let dy = -3; dy <= 3; dy++)
      safeZone.add(`${cx + dx},${cy + dy}`)

  const obstacles: Point[] = []
  let attempts = 0
  while (obstacles.length < config.obstacleCount && attempts < 2000) {
    attempts++
    const c: Point = {
      x: Math.floor(Math.random() * GRID_W),
      y: Math.floor(Math.random() * GRID_H),
    }
    if (!safeZone.has(ptKey(c)) && !inSet(c, obstacles)) obstacles.push(c)
  }

  const food = randomFree([...snake, ...obstacles])

  return {
    snake,
    food,
    obstacles,
    direction: 'RIGHT',
    pendingDirection: 'RIGHT',
    score: 0,
    status: 'running',
    difficulty,
    currentInterval: config.baseInterval,
  }
}

/** Queue a direction change. Ignored if it would reverse the snake. */
export function applyDirection(state: GameState, dir: Direction): GameState {
  if (isOpposite(dir, state.direction)) return state
  return { ...state, pendingDirection: dir }
}

/** Advance the game by one tick. Returns a new GameState. */
export function tick(state: GameState): GameState {
  if (state.status === 'dead') return state

  // Commit the queued direction (double-check it's still valid)
  const dir = isOpposite(state.pendingDirection, state.direction)
    ? state.direction
    : state.pendingDirection

  const newHead = movePoint(state.snake[0], dir)

  // Wall collision
  if (!inBounds(newHead)) return { ...state, direction: dir, status: 'dead' }

  // Self collision — exclude the tail because it moves away this tick
  if (inSet(newHead, state.snake.slice(0, -1)))
    return { ...state, direction: dir, status: 'dead' }

  // Obstacle collision
  if (inSet(newHead, state.obstacles))
    return { ...state, direction: dir, status: 'dead' }

  const ateFood = newHead.x === state.food.x && newHead.y === state.food.y
  const newSnake = ateFood
    ? [newHead, ...state.snake]               // grow: keep tail
    : [newHead, ...state.snake.slice(0, -1)]  // move: drop tail

  const cfg = DIFFICULTY_CONFIGS[state.difficulty]
  const newInterval = ateFood
    ? Math.max(cfg.minInterval, state.currentInterval - cfg.speedIncrement)
    : state.currentInterval

  return {
    ...state,
    snake:           newSnake,
    food:            ateFood ? randomFree([...newSnake, ...state.obstacles]) : state.food,
    direction:       dir,
    pendingDirection: dir,
    score:           state.score + (ateFood ? 1 : 0),
    currentInterval: newInterval,
  }
}
