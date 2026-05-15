import { useRef, useState, useEffect, useCallback } from 'react'
import type { FlappyConfig, Pipe } from './types'
import {
  CANVAS_W, CANVAS_H, GROUND_H, BIRD_X, BIRD_R,
  PIPE_W, PIPE_CAP_H, PIPE_CAP_X,
  DIFFICULTY, type DifficultySettings, randomPipeTopHeight,
} from './physics'
import { aiShouldFlap, resetAI }        from './ai'
import { playFlap, playScore, playDie } from './sounds'
import { addFlappyScore, getFlappyScores } from './scoresStore'

// ---------------------------------------------------------------------------
// Static decorations (computed once at module load)
// ---------------------------------------------------------------------------

const STARS: [number, number][] = Array.from({ length: 55 }, (_, i) => [
  ((Math.sin(i * 17.31) * 0.5 + 0.5) * CANVAS_W) | 0,
  ((Math.sin(i * 29.17) * 0.5 + 0.5) * (CANVAS_H * 0.58)) | 0,
])

interface Cloud { bx: number; y: number; rx: number; ry: number; alpha: number; speed: number }
// Speed values are chosen so that (CANVAS_W * 1000 * speed) % CANVAS_W === 0 for seamless wrap
const CLOUDS: Cloud[] = [
  { bx: 40,  y: 72, rx: 38, ry: 14, alpha: 0.07, speed: 0.35 },
  { bx: 160, y: 52, rx: 28, ry: 11, alpha: 0.05, speed: 0.28 },
  { bx: 270, y: 96, rx: 44, ry: 16, alpha: 0.06, speed: 0.40 },
  { bx: 350, y: 44, rx: 24, ry: 10, alpha: 0.04, speed: 0.22 },
]

// bgOffset wraps at exactly CANVAS_W * 1000 so cloud positions are seamless
const BG_WRAP = CANVAS_W * 1000
// Ground tile period
const GROUND_TILE = 48

// ---------------------------------------------------------------------------
// Pure rendering helpers
// ---------------------------------------------------------------------------

function drawSky(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  g.addColorStop(0,    '#0c0c22')
  g.addColorStop(0.55, '#17174a')
  g.addColorStop(1,    '#2a1040')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
}

function drawStars(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (const [sx, sy] of STARS) {
    ctx.beginPath()
    ctx.arc(sx, sy, 0.9, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCloudBlob(
  ctx: CanvasRenderingContext2D,
  cx: number, c: Cloud,
) {
  ctx.fillStyle = `rgba(255,255,255,${c.alpha})`
  ctx.beginPath(); ctx.ellipse(cx,              c.y,     c.rx,       c.ry,       0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(cx - c.rx * 0.5, c.y + 5, c.rx * 0.6, c.ry * 0.7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(cx + c.rx * 0.45,c.y + 3, c.rx * 0.5, c.ry * 0.65,0, 0, Math.PI * 2); ctx.fill()
}

function drawClouds(ctx: CanvasRenderingContext2D, bgOffset: number) {
  for (const c of CLOUDS) {
    // shift is always in [0, CANVAS_W) — seamless when bgOffset wraps at BG_WRAP
    const shift = (bgOffset * c.speed) % CANVAS_W
    const cx0   = ((c.bx - shift) % CANVAS_W + CANVAS_W) % CANVAS_W

    // Draw at tiled positions to fill canvas edge-to-edge
    for (const cx of [cx0, cx0 - CANVAS_W, cx0 + CANVAS_W]) {
      if (cx < -c.rx - 20 || cx > CANVAS_W + c.rx + 20) continue
      drawCloudBlob(ctx, cx, c)
    }
  }
}

function drawPipe(ctx: CanvasRenderingContext2D, pipe: Pipe, gapH: number) {
  const { x, topHeight } = pipe
  const botCapY = topHeight + gapH

  const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0)
  g.addColorStop(0,    '#1e5c1e')
  g.addColorStop(0.35, '#4caf50')
  g.addColorStop(0.65, '#388e3c')
  g.addColorStop(1,    '#1a3d1a')
  ctx.fillStyle = g

  // Top shaft
  ctx.fillRect(x, 0, PIPE_W, Math.max(0, topHeight - PIPE_CAP_H))
  // Top cap
  ctx.fillRect(x - PIPE_CAP_X, topHeight - PIPE_CAP_H, PIPE_W + PIPE_CAP_X * 2, PIPE_CAP_H)
  // Bottom cap
  ctx.fillRect(x - PIPE_CAP_X, botCapY, PIPE_W + PIPE_CAP_X * 2, PIPE_CAP_H)
  // Bottom shaft
  ctx.fillRect(x, botCapY + PIPE_CAP_H, PIPE_W, CANVAS_H - botCapY - PIPE_CAP_H)

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(x + 7, 0, 8, Math.max(0, topHeight - PIPE_CAP_H))
  ctx.fillRect(x + 7, botCapY + PIPE_CAP_H, 8, CANVAS_H - botCapY - PIPE_CAP_H)
}

function drawGround(ctx: CanvasRenderingContext2D, groundOffset: number) {
  const groundY = CANVAS_H - GROUND_H
  // Earth
  ctx.fillStyle = '#4a2e10'
  ctx.fillRect(0, groundY, CANVAS_W, GROUND_H)
  // Grass
  ctx.fillStyle = '#3d8c3d'
  ctx.fillRect(0, groundY, CANVAS_W, 10)
  ctx.fillStyle = '#50b050'
  ctx.fillRect(0, groundY, CANVAS_W, 3)
  // Scrolling dashes
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  const off = groundOffset % GROUND_TILE
  for (let dx = -off; dx < CANVAS_W + GROUND_TILE; dx += GROUND_TILE) {
    ctx.fillRect(dx,     groundY + 14, 28, 4)
    ctx.fillRect(dx + 5, groundY + 23, 18, 3)
  }
}

function drawBird(ctx: CanvasRenderingContext2D, y: number, angleDeg: number, frame: number) {
  const clampY = Math.min(y, CANVAS_H - GROUND_H - BIRD_R - 1)
  ctx.save()
  ctx.translate(BIRD_X, clampY)
  ctx.rotate((angleDeg * Math.PI) / 180)

  // Body
  const bg = ctx.createRadialGradient(-3, -3, 2, 0, 0, BIRD_R)
  bg.addColorStop(0,   '#ffe66a')
  bg.addColorStop(0.6, '#ffc107')
  bg.addColorStop(1,   '#e65100')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2)
  ctx.fill()

  // Wing
  const wingY = 3 + Math.sin(frame * 0.28) * 4
  ctx.fillStyle = '#d08000'
  ctx.beginPath()
  ctx.ellipse(-3, wingY, 9, 5, -0.25, 0, Math.PI * 2)
  ctx.fill()

  // Eye white
  ctx.fillStyle = 'white'
  ctx.beginPath(); ctx.arc(5, -5, 5, 0, Math.PI * 2); ctx.fill()
  // Pupil
  ctx.fillStyle = '#111'
  ctx.beginPath(); ctx.arc(6.5, -5, 2.5, 0, Math.PI * 2); ctx.fill()

  // Beak
  ctx.fillStyle = '#ff9800'
  ctx.beginPath()
  ctx.moveTo(BIRD_R - 1, -1)
  ctx.lineTo(BIRD_R + 7, 2)
  ctx.lineTo(BIRD_R - 1, 5)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  score: number,
  best: number,
  isAI: boolean,
) {
  // Score (centre top)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur  = 8
  ctx.fillStyle   = 'white'
  ctx.font        = 'bold 36px system-ui, sans-serif'
  ctx.textAlign   = 'center'
  ctx.fillText(String(score), CANVAS_W / 2, 50)
  ctx.restore()

  // Best (small, below score)
  if (best > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.32)'
    ctx.font      = '12px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`best ${best}`, CANVAS_W / 2, 66)
  }

  // AI badge (top right)
  if (isAI) {
    ctx.fillStyle = 'rgba(60,220,100,0.2)'
    ctx.fillRect(CANVAS_W - 74, 7, 66, 22)
    ctx.fillStyle = '#6ffaa0'
    ctx.font      = 'bold 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('AI MODE', CANVAS_W - 41, 22)
  }
}

// ---------------------------------------------------------------------------
// Collision detection — AABB with a few pixels of forgiveness
// ---------------------------------------------------------------------------

const FORGIVE = 3

function checkCollision(birdY: number, pipes: Pipe[], gapH: number): boolean {
  const bL = BIRD_X - BIRD_R + FORGIVE
  const bR = BIRD_X + BIRD_R - FORGIVE
  const bT = birdY   - BIRD_R + FORGIVE
  const bB = birdY   + BIRD_R - FORGIVE

  // Ceiling / ground
  if (bT <= 0)                    return true
  if (bB >= CANVAS_H - GROUND_H) return true

  for (const p of pipes) {
    const shL    = p.x
    const shR    = p.x + PIPE_W
    const cpL    = p.x - PIPE_CAP_X
    const cpR    = p.x + PIPE_W + PIPE_CAP_X
    const gapTop = p.topHeight
    const gapBot = p.topHeight + gapH

    const xShaft = bR > shL && bL < shR
    const xCap   = bR > cpL && bL < cpR
    if (!xShaft && !xCap) continue

    // Top shaft  [0 … gapTop - CAP_H]
    if (xShaft && bT < gapTop - PIPE_CAP_H)        return true
    // Top cap    [gapTop - CAP_H … gapTop]
    if (xCap   && bB > gapTop - PIPE_CAP_H && bT < gapTop) return true
    // Bottom cap [gapBot … gapBot + CAP_H]
    if (xCap   && bB > gapBot && bT < gapBot + PIPE_CAP_H) return true
    // Bottom shaft [gapBot + CAP_H … CANVAS_H]
    if (xShaft && bB > gapBot + PIPE_CAP_H)        return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

type Phase = 'idle' | 'playing' | 'dead'

interface GameState {
  birdY:        number
  birdVy:       number
  pipes:        Pipe[]
  score:        number
  frame:        number
  bgOffset:     number   // wraps at BG_WRAP for seamless clouds
  groundOffset: number   // wraps at GROUND_TILE
}

function makeInitialState(): GameState {
  return {
    birdY:        CANVAS_H * 0.42,
    birdVy:       0,
    pipes:        [],
    score:        0,
    frame:        0,
    bgOffset:     0,
    groundOffset: 0,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  config: FlappyConfig
  onMenu: () => void
  onBack: () => void
}

export default function FlappyGame({ config, onMenu, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const loopRef   = useRef<() => void>(() => {})
  const phaseRef  = useRef<Phase>('idle')
  const gameRef   = useRef<GameState>(makeInitialState())
  const bestRef   = useRef(0)

  const [phaseState,   setPhaseState]   = useState<Phase>('idle')
  const [displayScore, setDisplayScore] = useState(0)
  const [bestScore,    setBestScore]    = useState(0)

  const settings: DifficultySettings = DIFFICULTY[config.difficulty]

  // ── Personal best ─────────────────────────────────────────────────────────
  useEffect(() => {
    getFlappyScores().then(scores => {
      const best = scores
        .filter(s => s.playerName === config.playerName && s.difficulty === config.difficulty)
        .reduce((m, s) => Math.max(m, s.score), 0)
      if (best > 0) { bestRef.current = best; setBestScore(best) }
    })
  }, [config.playerName, config.difficulty])

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function tick() {
      const s = gameRef.current

      // ── IDLE ──────────────────────────────────────────────────────────────
      if (phaseRef.current === 'idle') {
        s.frame++
        s.birdY      = CANVAS_H * 0.42 + Math.sin(s.frame * 0.055) * 11
        s.bgOffset   = (s.bgOffset + 0.45) % BG_WRAP
        s.groundOffset = (s.groundOffset + 0.35) % GROUND_TILE

        // AI auto-starts after a brief pause
        if (config.mode === 'ai' && s.frame > 50) {
          phaseRef.current = 'playing'
          setPhaseState('playing')
          s.birdVy = settings.flapVy
          playFlap()
        }

        render(ctx, s)
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // ── DEAD — static last frame ──────────────────────────────────────────
      if (phaseRef.current === 'dead') return

      // ── PLAYING ───────────────────────────────────────────────────────────
      s.frame++
      s.bgOffset     = (s.bgOffset + settings.pipeSpeed * 0.28) % BG_WRAP
      s.groundOffset = (s.groundOffset + settings.pipeSpeed)    % GROUND_TILE

      // Physics
      s.birdVy = Math.min(s.birdVy + settings.gravity, settings.maxFallVy)
      s.birdY += s.birdVy

      // Move + cull pipes
      for (const p of s.pipes) p.x -= settings.pipeSpeed
      s.pipes = s.pipes.filter(p => p.x + PIPE_W > -10)

      // Spawn pipe
      if (s.frame % settings.pipeIntervalFrames === 0) {
        s.pipes.push({
          x: CANVAS_W + 10,
          topHeight: randomPipeTopHeight(settings.gapH),
          passed: false,
        })
      }

      // Score
      for (const p of s.pipes) {
        if (!p.passed && p.x + PIPE_W < BIRD_X) {
          p.passed = true
          s.score++
          setDisplayScore(s.score)
          playScore()
        }
      }

      // AI flap
      if (config.mode === 'ai') {
        if (aiShouldFlap(s.birdY, s.birdVy, s.pipes, settings)) {
          s.birdVy = settings.flapVy
          playFlap()
        }
      }

      // Collision
      if (checkCollision(s.birdY, s.pipes, settings.gapH)) {
        phaseRef.current = 'dead'
        setPhaseState('dead')
        playDie()
        render(ctx, s)

        void addFlappyScore({
          playerName: config.playerName,
          score:      s.score,
          difficulty: config.difficulty,
          mode:       config.mode,
          date:       new Date().toISOString(),
        }).then(() => {
          if (s.score > bestRef.current) {
            bestRef.current = s.score
            setBestScore(s.score)
          }
        })
        return
      }

      render(ctx, s)
      rafRef.current = requestAnimationFrame(tick)
    }

    loopRef.current = tick
    rafRef.current  = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Render scene ──────────────────────────────────────────────────────────
  function render(ctx: CanvasRenderingContext2D, s: GameState) {
    const angleDeg = Math.max(-25, Math.min(82, s.birdVy * 4.8))
    drawSky(ctx)
    drawStars(ctx)
    drawClouds(ctx, s.bgOffset)
    for (const p of s.pipes) drawPipe(ctx, p, settings.gapH)
    drawGround(ctx, s.groundOffset)
    drawBird(ctx, s.birdY, angleDeg, s.frame)
    drawHUD(ctx, s.score, bestRef.current, config.mode === 'ai')
  }

  // ── Flap ──────────────────────────────────────────────────────────────────
  const flap = useCallback(() => {
    if (phaseRef.current === 'dead') return
    if (phaseRef.current === 'idle') {
      phaseRef.current = 'playing'
      setPhaseState('playing')
    }
    gameRef.current.birdVy = settings.flapVy
    playFlap()
  }, [settings.flapVy])

  // ── Restart ───────────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    gameRef.current  = makeInitialState()
    phaseRef.current = 'idle'
    setPhaseState('idle')
    setDisplayScore(0)
    resetAI()
    rafRef.current = requestAnimationFrame(loopRef.current)
  }, [])

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'KeyW') {
        e.preventDefault()
        flap()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [flap])

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full select-none overflow-hidden relative"
      style={{ background: '#0c0c22' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0 bg-surface-800">
        <span className="text-white font-bold text-sm tracking-wide">FLAPPY BIRD</span>
        <span className="text-gray-500 text-xs">
          {config.playerName}
          <span className="mx-1 text-gray-700">·</span>
          <span className="capitalize">{config.difficulty}</span>
          {config.mode === 'ai' && <span className="ml-1 text-green-400">· AI</span>}
        </span>
        <button
          onClick={onMenu}
          className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
        >
          Menu
        </button>
      </div>

      {/* Canvas area */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onClick={config.mode === 'manual' ? flap : undefined}
        style={{ cursor: config.mode === 'manual' ? 'pointer' : 'default' }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ height: '100%', width: 'auto', display: 'block' }}
        />

        {/* Idle overlay */}
        {phaseState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 pointer-events-none">
            <div className="text-center bg-black/35 rounded-2xl px-6 py-4 border border-white/10">
              {config.mode === 'manual' ? (
                <>
                  <p className="text-white font-semibold text-base mb-1">Ready to fly?</p>
                  <p className="text-white/50 text-sm">Space, W, or click to flap</p>
                </>
              ) : (
                <p className="text-green-300 font-semibold">AI warming up…</p>
              )}
              {bestScore > 0 && (
                <p className="text-white/30 text-xs mt-2">Personal best: {bestScore}</p>
              )}
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {phaseState === 'dead' && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-surface-700 rounded-2xl p-8 border border-white/10 shadow-2xl text-center w-72">
              <div className="text-4xl mb-3">💥</div>
              <h2 className="text-2xl font-bold text-white mb-3">Game Over</h2>

              <p className="text-5xl font-bold text-accent mb-1">{displayScore}</p>
              <p className="text-gray-500 text-xs mb-3">score</p>

              {bestScore > 0 && (
                <p className="text-sm mb-1">
                  {displayScore >= bestScore
                    ? <span className="text-yellow-400 font-semibold">🏆 New personal best!</span>
                    : <span className="text-gray-400">Best: <span className="font-semibold text-gray-300">{bestScore}</span></span>
                  }
                </p>
              )}

              <div className="mt-6 space-y-2">
                <button
                  onClick={restart}
                  className="w-full bg-accent hover:bg-accent-light py-3 rounded-xl text-white
                    font-bold text-sm transition-colors shadow-lg shadow-accent/20"
                >
                  Play Again
                </button>
                <button
                  onClick={onMenu}
                  className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl
                    text-gray-300 text-sm font-medium transition-colors"
                >
                  Main Menu
                </button>
                <button
                  onClick={onBack}
                  className="w-full bg-surface-600 hover:bg-surface-500 py-2 rounded-xl
                    text-gray-400 text-sm transition-colors"
                >
                  Back to Library
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
