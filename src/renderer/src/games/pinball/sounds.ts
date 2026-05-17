let _ctx: AudioContext | null = null

export function getAudioContext(): AudioContext | null {
  try {
    if (!_ctx) _ctx = new AudioContext()
    if (_ctx.state === 'suspended') _ctx.resume()
    return _ctx
  } catch { return null }
}

function tone(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  duration: number,
  gain: number,
  freqEnd?: number
) {
  const osc = ctx.createOscillator()
  const g   = ctx.createGain()
  osc.connect(g)
  g.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration)
  }
  g.gain.setValueAtTime(gain, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

export function playFlip()       { const c = getAudioContext(); if (!c) return; try { tone(c, 180, 'square', 0.08, 0.25) } catch {} }
export function playBumper()     { const c = getAudioContext(); if (!c) return; try { tone(c, 440, 'sine',   0.12, 0.3, 220) } catch {} }
export function playBumperLit()  { const c = getAudioContext(); if (!c) return; try { tone(c, 660, 'sine',   0.15, 0.4, 330) } catch {} }
export function playTarget()     { const c = getAudioContext(); if (!c) return; try { tone(c, 880, 'triangle', 0.1, 0.3) } catch {} }
export function playTargetBank() { const c = getAudioContext(); if (!c) return; try {
  tone(c, 523, 'sine', 0.15, 0.4)
  setTimeout(() => { const c2 = getAudioContext(); if (c2) try { tone(c2, 659, 'sine', 0.15, 0.4) } catch {} }, 100)
  setTimeout(() => { const c2 = getAudioContext(); if (c2) try { tone(c2, 784, 'sine', 0.2,  0.4) } catch {} }, 200)
} catch {} }
export function playRamp()       { const c = getAudioContext(); if (!c) return; try { tone(c, 300, 'sawtooth', 0.25, 0.25, 900) } catch {} }
export function playDrain()      { const c = getAudioContext(); if (!c) return; try { tone(c, 220, 'sine', 0.6, 0.3, 55) } catch {} }
export function playLaunch()     { const c = getAudioContext(); if (!c) return; try { tone(c, 150, 'sawtooth', 0.2, 0.3, 400) } catch {} }
export function playSkillShot()  { const c = getAudioContext(); if (!c) return; try {
  tone(c, 523, 'sine', 0.15, 0.5)
  setTimeout(() => { const c2 = getAudioContext(); if (c2) try { tone(c2, 784, 'sine', 0.15, 0.5) } catch {} }, 120)
  setTimeout(() => { const c2 = getAudioContext(); if (c2) try { tone(c2, 1047,'sine', 0.2,  0.5) } catch {} }, 240)
} catch {} }
export function playJackpot()    { const c = getAudioContext(); if (!c) return; try {
  ;[0,100,200,300].forEach((delay, i) => {
    setTimeout(() => { const c2 = getAudioContext(); if (c2) try { tone(c2, ([523,659,784,1047])[i], 'sine', 0.4, 0.5) } catch {} }, delay)
  })
} catch {} }
export function playMultiball()  { const c = getAudioContext(); if (!c) return; try {
  tone(c, 440, 'sine', 0.5, 0.4, 880)
  setTimeout(() => { const c2 = getAudioContext(); if (c2) try { tone(c2, 660, 'sine', 0.4, 0.4, 1320) } catch {} }, 150)
} catch {} }
