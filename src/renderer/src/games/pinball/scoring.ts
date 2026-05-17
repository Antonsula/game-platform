// Configurable score values — edit these to tune the game
export const SCORE_VALUES = {
  bumper:       100,
  bumperLit:    300,    // when jackpot is active
  target:       500,
  targetBank:   2000,   // bonus when all targets in one bank are hit
  ramp:         1500,
  topLane:      300,
  outlane:      0,
  skillShot:    5000,   // awarded for hitting specific lane immediately after launch
  jackpot:      50000,  // center bumper while jackpot is lit
  multiBallHit: 10000,  // any bumper hit during multiball
}

export const COMBO_WINDOW_MS = 3000   // ms before combo resets
export const MAX_MULTIPLIER  = 6
export const BALLS_PER_GAME  = 3

export interface ScoringState {
  score:       number
  multiplier:  number
  combo:       number       // consecutive hits within window
  comboTimer:  number       // ms remaining
}

export function initialScoringState(): ScoringState {
  return { score: 0, multiplier: 1, combo: 0, comboTimer: 0 }
}

/** Returns new score after adding points with current multiplier and incrementing combo. */
export function addPoints(
  state: ScoringState,
  base: number,
  _dt: number
): ScoringState {
  const comboTimer = COMBO_WINDOW_MS
  const combo = state.comboTimer > 0 ? state.combo + 1 : 1
  const comboBonus = combo >= 5 ? 3 : combo >= 3 ? 2 : 1
  const points = base * state.multiplier * comboBonus
  return { ...state, score: state.score + points, combo, comboTimer }
}

export function tickScoring(state: ScoringState, dt: number): ScoringState {
  if (state.comboTimer <= 0) return state
  const comboTimer = Math.max(0, state.comboTimer - dt)
  const combo = comboTimer === 0 ? 0 : state.combo
  return { ...state, comboTimer, combo }
}

export function advanceMultiplier(state: ScoringState): ScoringState {
  return { ...state, multiplier: Math.min(MAX_MULTIPLIER, state.multiplier + 1) }
}
