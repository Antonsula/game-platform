/**
 * Snake AI using BFS pathfinding with flood-fill safety checks.
 *
 * Primary strategy : find the shortest path to food (BFS).
 * Safety check     : after simulating eating, verify the snake still has
 *                    enough reachable space via flood fill.
 * Fallback         : when no safe food path exists, pick the move that
 *                    maximises reachable free space (survival heuristic).
 */

import {
  Direction, GameState, Point,
  movePoint, isOpposite, inBounds,
  GRID_W, GRID_H,
} from './gameLogic'

const ALL_DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT']

function key(p: Point): string { return `${p.x},${p.y}` }

/**
 * Build the set of cells the snake cannot enter.
 * When excludeTail is true, the tail cell is omitted because it moves away
 * by the time the head would reach it.
 */
function buildBlocked(state: GameState, excludeTail: boolean): Set<string> {
  const blocked = new Set<string>()
  const body = excludeTail ? state.snake.slice(0, -1) : state.snake
  body.forEach(p => blocked.add(key(p)))
  state.obstacles.forEach(p => blocked.add(key(p)))
  return blocked
}

/** BFS from `from` to `to`. Returns the first direction to take, or null. */
function bfsPath(state: GameState, from: Point, to: Point): Direction | null {
  const blocked = buildBlocked(state, true)
  const visited = new Set<string>([key(from)])
  const queue: { p: Point; firstDir: Direction }[] = []

  for (const dir of ALL_DIRS) {
    const np = movePoint(from, dir)
    if (!inBounds(np)) continue
    const k = key(np)
    if (blocked.has(k)) continue
    if (np.x === to.x && np.y === to.y) return dir  // food is adjacent
    visited.add(k)
    queue.push({ p: np, firstDir: dir })
  }

  while (queue.length > 0) {
    const { p, firstDir } = queue.shift()!
    for (const dir of ALL_DIRS) {
      const np = movePoint(p, dir)
      if (!inBounds(np)) continue
      const k = key(np)
      if (blocked.has(k) || visited.has(k)) continue
      if (np.x === to.x && np.y === to.y) return firstDir
      visited.add(k)
      queue.push({ p: np, firstDir })
    }
  }

  return null
}

/** Count cells reachable from `from` given an already-built blocked set. */
function floodFill(blocked: Set<string>, from: Point): number {
  const visited = new Set<string>([key(from)])
  const queue: Point[] = [from]
  while (queue.length > 0) {
    const p = queue.shift()!
    for (const dir of ALL_DIRS) {
      const np = movePoint(p, dir)
      if (!inBounds(np)) continue
      const k = key(np)
      if (!blocked.has(k) && !visited.has(k)) {
        visited.add(k)
        queue.push(np)
      }
    }
  }
  return visited.size
}

/** Return the best direction for the AI to move this tick. */
export function getAIMove(state: GameState): Direction {
  const head = state.snake[0]

  // --- Attempt 1: follow BFS path to food ---
  const foodDir = bfsPath(state, head, state.food)
  if (foodDir !== null) {
    const nextHead = movePoint(head, foodDir)
    const willEat  = nextHead.x === state.food.x && nextHead.y === state.food.y

    if (!willEat) {
      // Still en-route to food; no need to check safety yet
      return foodDir
    }

    // Simulate eating: snake grows by one cell
    const hypoSnake  = [nextHead, ...state.snake]
    const hypoBlock  = new Set<string>()
    hypoSnake.forEach(p => hypoBlock.add(key(p)))
    state.obstacles.forEach(p => hypoBlock.add(key(p)))

    // Require enough space for at least half the (grown) snake to be reachable
    const space   = floodFill(hypoBlock, nextHead)
    const minSafe = Math.ceil(hypoSnake.length / 2)
    if (space >= minSafe) return foodDir
    // Eating here looks dangerous — fall through to survival mode
  }

  // --- Fallback: maximise reachable free space ---
  const blocked = buildBlocked(state, true)
  let bestDir: Direction = state.direction  // keep going if nothing better
  let bestSpace = -1

  for (const dir of ALL_DIRS) {
    if (isOpposite(dir, state.direction)) continue
    const np = movePoint(head, dir)
    if (!inBounds(np)) continue
    if (blocked.has(key(np))) continue

    const tempBlocked = new Set(blocked)
    tempBlocked.add(key(np))
    const space = floodFill(tempBlocked, np)

    if (space > bestSpace) {
      bestSpace = space
      bestDir   = dir
    }
  }

  return bestDir
}
