import { useEffect, useRef, useState } from 'react'
import type { Difficulty } from '@shared/types'
import type { SnakeMode } from '@shared/types'
import {
  GameState, Direction,
  initGame, tick, applyDirection,
  CELL_SIZE, GRID_W, GRID_H, CANVAS_W, CANVAS_H,
  DIFFICULTY_CONFIGS,
} from './gameLogic'
import { getAIMove } from './aiPathfinding'

// ---------------------------------------------------------------------------
// Canvas drawing (pure functions — defined outside the component)
// ---------------------------------------------------------------------------

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
  ctx.fill()
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  headX: number, headY: number,
  dir: Direction,
): void {
  const c = CELL_SIZE
  // Two [relX, relY] positions relative to the cell's top-left
  let e1: [number, number], e2: [number, number]
  switch (dir) {
    case 'RIGHT': e1 = [c * 0.72, c * 0.25]; e2 = [c * 0.72, c * 0.75]; break
    case 'LEFT':  e1 = [c * 0.28, c * 0.25]; e2 = [c * 0.28, c * 0.75]; break
    case 'UP':    e1 = [c * 0.25, c * 0.28]; e2 = [c * 0.75, c * 0.28]; break
    case 'DOWN':  e1 = [c * 0.25, c * 0.72]; e2 = [c * 0.75, c * 0.72]; break
  }
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  for (const [ex, ey] of [e1, e2]) {
    ctx.beginPath()
    ctx.arc(headX + ex, headY + ey, 2.6, 0, Math.PI * 2)
    ctx.fill()
  }
  // Pupils
  ctx.fillStyle = '#160a2e'
  for (const [ex, ey] of [e1, e2]) {
    ctx.beginPath()
    ctx.arc(headX + ex + 0.6, headY + ey + 0.6, 1.3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGame(canvas: HTMLCanvasElement, state: GameState, isAI: boolean): void {
  const ctx = canvas.getContext('2d')!
  const cs  = CELL_SIZE

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // ── Subtle grid lines ─────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= GRID_W; x++) {
    ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, CANVAS_H); ctx.stroke()
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(CANVAS_W, y * cs); ctx.stroke()
  }

  // ── Border glow (purple in manual, cyan in AI) ───────────────────────────
  ctx.shadowBlur = 0
  ctx.strokeStyle = isAI ? 'rgba(56,189,248,0.5)' : 'rgba(124,58,237,0.55)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, CANVAS_W - 2, CANVAS_H - 2)

  // ── Obstacles ─────────────────────────────────────────────────────────────
  for (const p of state.obstacles) {
    ctx.fillStyle = '#24243a'
    fillRoundRect(ctx, p.x * cs + 2, p.y * cs + 2, cs - 4, cs - 4, 3)
    // × cross mark
    ctx.strokeStyle = '#3a3a56'
    ctx.lineWidth = 1.5
    const pad = 5
    ctx.beginPath()
    ctx.moveTo(p.x * cs + pad,      p.y * cs + pad)
    ctx.lineTo((p.x + 1) * cs - pad, (p.y + 1) * cs - pad)
    ctx.moveTo((p.x + 1) * cs - pad, p.y * cs + pad)
    ctx.lineTo(p.x * cs + pad,       (p.y + 1) * cs - pad)
    ctx.stroke()
  }

  // ── Food (green radial glow) ───────────────────────────────────────────────
  const fr = cs / 2 - 3
  const fcx = state.food.x * cs + cs / 2
  const fcy = state.food.y * cs + cs / 2
  ctx.shadowColor = '#22c55e'
  ctx.shadowBlur  = 12
  const foodGrad = ctx.createRadialGradient(fcx - 2, fcy - 2, 1, fcx, fcy, fr)
  foodGrad.addColorStop(0, '#86efac')
  foodGrad.addColorStop(1, '#15803d')
  ctx.fillStyle = foodGrad
  ctx.beginPath()
  ctx.arc(fcx, fcy, fr, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // ── Snake body (tail → neck, so head renders on top) ──────────────────────
  for (let i = state.snake.length - 1; i >= 1; i--) {
    const seg = state.snake[i]
    // Segments near the tail are slightly smaller and more transparent
    const t      = i / state.snake.length   // 1 = tail, ~0 = neck
    const alpha  = (0.35 + 0.55 * (1 - t)).toFixed(2)
    const inset  = 2 + Math.round(t * 2)
    const size   = cs - inset * 2
    ctx.fillStyle = `rgba(109,40,217,${alpha})`
    fillRoundRect(ctx, seg.x * cs + inset, seg.y * cs + inset, size, size, 3)
  }

  // ── Snake head ────────────────────────────────────────────────────────────
  const head = state.snake[0]
  ctx.shadowColor = isAI ? 'rgba(56,189,248,0.7)' : 'rgba(139,92,246,0.8)'
  ctx.shadowBlur  = 10
  ctx.fillStyle   = isAI ? '#38bdf8' : '#7c3aed'
  fillRoundRect(ctx, head.x * cs + 1, head.y * cs + 1, cs - 2, cs - 2, 5)
  ctx.shadowBlur = 0

  // ── Eyes ──────────────────────────────────────────────────────────────────
  drawEyes(ctx, head.x * cs, head.y * cs, state.direction)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  difficulty: Difficulty
  mode: SnakeMode
  onGameOver: (score: number) => void
  onExitToMenu: () => void
}

export default function SnakeCanvas({ difficulty, mode, onGameOver, onExitToMenu }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const stateRef    = useRef<GameState>(initGame(difficulty))
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>>()
  // Ref so the game loop always calls the latest callback without restarting
  const onGameOverRef = useRef(onGameOver)
  onGameOverRef.current = onGameOver

  const [displayScore, setDisplayScore] = useState(0)
  const [isPaused,     setIsPaused]     = useState(false)
  const isAI = mode === 'auto'

  // ── Keyboard input ──────────────────────────────────────────────────────
  useEffect(() => {
    const KEYS: Record<string, Direction> = {
      w: 'UP',   W: 'UP',
      a: 'LEFT', A: 'LEFT',
      s: 'DOWN', S: 'DOWN',
      d: 'RIGHT',D: 'RIGHT',
    }
    const handler = (e: KeyboardEvent) => {
      if (KEYS[e.key] && !isAI) {
        e.preventDefault()
        stateRef.current = applyDirection(stateRef.current, KEYS[e.key])
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault()
        setIsPaused(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isAI])

  // ── Game loop (restarts when pause toggles) ──────────────────────────────
  useEffect(() => {
    if (isPaused) return

    const canvas = canvasRef.current

    const runTick = () => {
      let current = stateRef.current
      if (isAI) {
        current = applyDirection(current, getAIMove(current))
      }
      const next = tick(current)
      stateRef.current = next
      setDisplayScore(next.score)
      if (canvas) drawGame(canvas, next, isAI)

      if (next.status === 'dead') {
        onGameOverRef.current(next.score)
        return  // do not schedule another tick
      }
      timeoutRef.current = setTimeout(runTick, next.currentInterval)
    }

    timeoutRef.current = setTimeout(runTick, stateRef.current.currentInterval)
    return () => clearTimeout(timeoutRef.current)
  }, [isPaused, isAI])

  // ── Initial draw ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) drawGame(canvas, stateRef.current, isAI)
  }, [isAI])

  // Speed meter: 0–100% of the way from base to min interval
  const cfg       = DIFFICULTY_CONFIGS[difficulty]
  const speedPct  = Math.round(
    Math.min(100,
      ((cfg.baseInterval - stateRef.current.currentInterval) /
       (cfg.baseInterval - cfg.minInterval)) * 100
    )
  )

  return (
    <div className="flex flex-col items-center gap-3 h-full py-4 overflow-auto">
      {/* ── HUD ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
        <HudBadge label="Score" value={String(displayScore)} />
        <HudBadge
          label="Difficulty"
          value={difficulty}
          valueClass={
            difficulty === 'hard'   ? 'text-red-400'    :
            difficulty === 'medium' ? 'text-yellow-400' : 'text-green-400'
          }
        />
        {isAI ? (
          <div className="flex items-center gap-1.5 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse block" />
            <span className="text-sky-300 font-bold text-xs">AI Active</span>
          </div>
        ) : (
          <HudBadge label="Mode" value="Manual" />
        )}
        <HudBadge label="Speed" value={`${speedPct}%`} />
        {isPaused && (
          <div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <span className="text-yellow-400 font-bold text-xs tracking-widest">PAUSED</span>
          </div>
        )}
      </div>

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div className="relative shrink-0">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl border border-white/10 block"
        />
        {isPaused && (
          <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/55 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-white text-3xl font-black tracking-widest mb-2">PAUSED</p>
              <p className="text-gray-400 text-sm">Press P or Esc to resume</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls hint ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0 text-xs text-gray-600 no-select">
        <span>{isAI ? 'AI is navigating automatically' : 'WASD to move · P to pause'}</span>
        <span>·</span>
        <button
          onClick={() => setIsPaused(p => !p)}
          className="hover:text-gray-300 transition-colors"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <span>·</span>
        <button
          onClick={onExitToMenu}
          className="hover:text-red-400 transition-colors"
        >
          Exit Game
        </button>
      </div>
    </div>
  )
}

function HudBadge({
  label, value, valueClass = 'text-white',
}: {
  label: string; value: string; valueClass?: string
}) {
  return (
    <div className="flex items-center gap-1.5 bg-surface-600 px-3 py-1.5 rounded-lg border border-white/5">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`font-bold text-xs capitalize tabular-nums ${valueClass}`}>{value}</span>
    </div>
  )
}
