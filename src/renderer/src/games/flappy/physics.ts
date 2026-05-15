import type { FlappyDifficulty } from '@shared/types'

// ---------------------------------------------------------------------------
// Canvas dimensions (logical pixels — CSS scales the element to fit)
// ---------------------------------------------------------------------------
export const CANVAS_W   = 360
export const CANVAS_H   = 580
export const GROUND_H   = 60
export const BIRD_X     = 90     // fixed horizontal position
export const BIRD_R     = 14     // circle radius
export const PIPE_W     = 58     // pipe shaft width
export const PIPE_CAP_H = 14     // height of the cap at the opening
export const PIPE_CAP_X = 6      // how much cap extends beyond shaft on each side
export const MIN_PIPE_H = 62     // minimum top-pipe height (px)

// ---------------------------------------------------------------------------
// Difficulty settings — tweak here to adjust gameplay feel
// ---------------------------------------------------------------------------
export interface DifficultySettings {
  gravity:            number   // px per frame²
  flapVy:             number   // upward velocity on flap (negative = up)
  maxFallVy:          number   // terminal downward velocity
  pipeSpeed:          number   // px per frame pipes move left
  pipeIntervalFrames: number   // frames between pipe spawns
  gapH:               number   // vertical gap between pipes (px)
}

export const DIFFICULTY: Record<FlappyDifficulty, DifficultySettings> = {
  easy: {
    gravity:            0.24,
    flapVy:             -5.4,
    maxFallVy:           7.0,
    pipeSpeed:           2.0,
    pipeIntervalFrames: 115,
    gapH:               168,
  },
  medium: {
    gravity:            0.34,
    flapVy:             -6.4,
    maxFallVy:           8.5,
    pipeSpeed:           2.8,
    pipeIntervalFrames:  92,
    gapH:               142,
  },
  hard: {
    gravity:            0.42,
    flapVy:             -7.0,
    maxFallVy:           9.5,
    pipeSpeed:           3.8,
    pipeIntervalFrames:  70,
    gapH:               112,
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a random top-pipe height that leaves at least MIN_PIPE_H on both sides. */
export function randomPipeTopHeight(gapH: number): number {
  const maxTop = CANVAS_H - GROUND_H - MIN_PIPE_H - gapH
  return MIN_PIPE_H + Math.floor(Math.random() * (maxTop - MIN_PIPE_H))
}
