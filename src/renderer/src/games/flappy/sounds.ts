// ---------------------------------------------------------------------------
// Sound effects — generated with the Web Audio API (no asset files needed).
// Set SOUNDS_ENABLED = false to mute everything.
// ---------------------------------------------------------------------------

export const SOUNDS_ENABLED = true

let _ctx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (!SOUNDS_ENABLED) return null
  try {
    if (!_ctx) _ctx = new AudioContext()
    // Resume if suspended (browser auto-play policy)
    if (_ctx.state === 'suspended') void _ctx.resume()
    return _ctx
  } catch {
    return null
  }
}

function tone(
  freq:     number,
  duration: number,
  type:     OscillatorType = 'sine',
  vol       = 0.22,
  freqEnd?: number,
) {
  const c = ctx()
  if (!c) return
  try {
    const osc  = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime)
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + duration)
    }
    gain.gain.setValueAtTime(vol, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    osc.start()
    osc.stop(c.currentTime + duration)
  } catch { /* ignore audio errors */ }
}

/** Short whoosh on flap */
export function playFlap(): void {
  tone(520, 0.07, 'triangle', 0.18, 360)
}

/** Cheerful ding when passing a pipe */
export function playScore(): void {
  const c = ctx()
  if (!c) return
  try {
    const freqs = [880, 1100]
    for (const freq of freqs) {
      const osc  = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain)
      gain.connect(c.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.15, c.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18)
      osc.start()
      osc.stop(c.currentTime + 0.18)
    }
  } catch { /* ignore */ }
}

/** Descending crash on game over */
export function playDie(): void {
  tone(380, 0.32, 'sawtooth', 0.28, 70)
}
