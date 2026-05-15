import type { Pipe } from './types'
import type { DifficultySettings } from './physics'
import { BIRD_X, BIRD_R, CANVAS_H, PIPE_W } from './physics'

// ---------------------------------------------------------------------------
// Tuning knobs
// ---------------------------------------------------------------------------

/** Minimum frames between flaps — prevents machine-gun stutter. */
const MIN_FLAP_GAP = 8

/**
 * How far DOWN the gap the AI aims (0 = top edge, 1 = bottom edge).
 * 0.70 keeps the bird in the lower-centre of the gap, giving safe
 * clearance above the top pipe on every difficulty.
 */
const GAP_TARGET_RATIO = 0.70

/**
 * Hitbox forgiveness — must match the FORGIVE constant in FlappyGame.tsx.
 * Used when deriving the highest safe aim point inside the current gap.
 */
const FORGIVE = 3  // px

// ---------------------------------------------------------------------------
// Module state (one game at a time — call resetAI() on restart)
// ---------------------------------------------------------------------------

let _framesSinceFlap = 0

export function resetAI(): void {
  _framesSinceFlap = 0
}

// ---------------------------------------------------------------------------
// Main decision function
// ---------------------------------------------------------------------------

/**
 * Reactive bang-bang controller with one-pipe lookahead.
 *
 * Base rule — flap when birdY ≥ targetY AND already falling.
 *
 * Lookahead — when the pipe after next has a higher gap (smaller targetY),
 * the bird aims as high as possible INSIDE the current gap so it enters
 * the next gap closer to the right altitude.
 *
 * Safety: the maximum aim point is physics-derived —
 *
 *   peak after one flap  =  targetY − flapHeight
 *   must stay            ≥  p1.topHeight + BIRD_R − FORGIVE   (clear of top pipe)
 *   → safeTop            =  p1.topHeight + flapHeight + BIRD_R − FORGIVE
 *
 * There is intentionally NO distance gate: cutting off the lookahead early
 * was what made the transition feel sluggish — the bird dropped back to the
 * low target right when it needed to keep climbing.
 */
export function aiShouldFlap(
  birdY:    number,
  birdVy:   number,
  pipes:    Pipe[],
  settings: DifficultySettings,
): boolean {
  _framesSinceFlap++
  if (_framesSinceFlap < MIN_FLAP_GAP) return false

  // Upcoming pipes the bird hasn't cleared yet
  const upcoming = pipes.filter(p => p.x + PIPE_W > BIRD_X)
  const p1 = upcoming[0]   // next pipe
  const p2 = upcoming[1]   // pipe after next

  let targetY: number

  if (!p1) {
    // No pipe visible — hover at screen centre
    targetY = CANVAS_H * 0.5
  } else {
    const t1 = p1.topHeight + settings.gapH * GAP_TARGET_RATIO

    if (p2) {
      const t2 = p2.topHeight + settings.gapH * GAP_TARGET_RATIO

      if (t2 < t1) {
        // Next-next gap is higher — pre-climb as much as p1's gap safely allows.
        //
        // flapHeight: how far up a single flap carries the bird
        // (worst-case: birdVy ≈ 0 at the moment of flap, giving max upward travel).
        const flapHeight = (settings.flapVy * settings.flapVy) / (2 * settings.gravity)
        const safeTop    = p1.topHeight + flapHeight + BIRD_R - FORGIVE

        // Aim at t2 if it's above safeTop; otherwise use safeTop (highest safe point).
        targetY = Math.max(safeTop, t2)
      } else {
        // Next-next gap is same height or lower — no early climb needed.
        targetY = t1
      }
    } else {
      targetY = t1
    }
  }

  // Flap only when at/below the target AND the bird is falling.
  const shouldFlap = birdY >= targetY && birdVy > 0
  if (shouldFlap) _framesSinceFlap = 0
  return shouldFlap
}
