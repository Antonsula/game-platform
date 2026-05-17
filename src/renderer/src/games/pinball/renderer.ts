import * as Matter from 'matter-js'
import type { PhysicsTable } from './physics'
import { LABELS, TABLE_W, TABLE_H, FLIPPER_LEN, FLIPPER_THICK } from './physics'
import type { RenderState } from './PinballGame'

// ── Bumper definitions (must match physics.ts) ────────────────────────────────
const BUMPER_DEFS = [
  { x: 130, y: 215, label: LABELS.BUMPER_0,  color: '#22d3ee', r: 20 },
  { x: 200, y: 230, label: LABELS.BUMPER_1,  color: '#a78bfa', r: 20 },  // was y=190
  { x: 270, y: 215, label: LABELS.BUMPER_2,  color: '#22d3ee', r: 20 },
  { x: 155, y: 290, label: LABELS.BUMPER_3,  color: '#f472b6', r: 20 },
  { x: 178, y: 325, label: LABELS.JACKPOT,   color: '#facc15', r: 20 },  // was (215,310)
]

export function renderFrame(
  ctx:    CanvasRenderingContext2D,
  table:  PhysicsTable,
  rs:     RenderState,
  shakeX: number,
  shakeY: number
): void {
  ctx.save()
  ctx.translate(shakeX, shakeY)

  // ── Background ────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, TABLE_H)
  bg.addColorStop(0,   '#0d0820')
  bg.addColorStop(0.5, '#0a0f1e')
  bg.addColorStop(1,   '#060a14')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, TABLE_W, TABLE_H)

  // Felt-style grid
  ctx.strokeStyle = 'rgba(255,255,255,0.018)'
  ctx.lineWidth = 1
  for (let x = 0; x < TABLE_W; x += 18) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TABLE_H); ctx.stroke() }
  for (let y = 0; y < TABLE_H; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TABLE_W, y); ctx.stroke() }

  // ── Plunger lane background ───────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(352, 90, 46, 620)

  // ── Plunger lane walls (visual) ───────────────────────────────────────────
  // Right outer (straight)
  ctx.strokeStyle = 'rgba(71,85,105,0.7)'
  ctx.lineWidth   = 4
  ctx.beginPath(); ctx.moveTo(396, 90); ctx.lineTo(396, 700); ctx.stroke()

  // Exit ramp — diagonal line from (396, 90) to (352, 10)
  ctx.strokeStyle = '#475569'
  ctx.lineWidth   = 6
  ctx.shadowBlur  = 8
  ctx.shadowColor = '#7c3aed'
  ctx.beginPath(); ctx.moveTo(396, 90); ctx.lineTo(352, 10); ctx.stroke()
  // Neon highlight on ramp
  ctx.strokeStyle = 'rgba(167,139,250,0.5)'
  ctx.lineWidth   = 2
  ctx.beginPath(); ctx.moveTo(394, 90); ctx.lineTo(350, 10); ctx.stroke()
  ctx.shadowBlur  = 0

  // Divider (between lane and main table)
  ctx.strokeStyle = 'rgba(100,116,139,0.6)'
  ctx.lineWidth   = 4
  ctx.beginPath(); ctx.moveTo(352, 90); ctx.lineTo(352, 700); ctx.stroke()

  // ── Top lane indicators (at y≈142 matching physics lane sensors) ─────────
  const laneColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff']
  const laneXs     = [115, 165, 215, 265]
  laneXs.forEach((x, i) => {
    const lit = rs.lanesComplete[i]
    ctx.shadowBlur  = lit ? 14 : 0
    ctx.shadowColor = laneColors[i]
    ctx.fillStyle   = lit ? laneColors[i] : 'rgba(255,255,255,0.07)'
    ctx.beginPath()
    ctx.roundRect(x - 20, 136, 40, 11, 3)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle  = lit ? '#fff' : 'rgba(255,255,255,0.3)'
    ctx.font       = 'bold 7px monospace'
    ctx.textAlign  = 'center'
    ctx.fillText(`L${i + 1}`, x, 145)
  })

  // ── Ramps ─────────────────────────────────────────────────────────────────
  ctx.lineWidth   = 7
  ctx.strokeStyle = '#4338ca'
  ctx.shadowBlur  = 10
  ctx.shadowColor = '#6366f1'
  // Left ramp system — upper, connector, lower (no pockets between sections)
  ctx.beginPath(); ctx.moveTo(22, 300); ctx.lineTo(110, 400); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(110, 400); ctx.lineTo(22, 445); ctx.stroke()  // connector
  ctx.beginPath(); ctx.moveTo(22, 445); ctx.lineTo(100, 495); ctx.stroke()
  // Right ramp system — upper, connector, lower
  ctx.beginPath(); ctx.moveTo(352, 300); ctx.lineTo(264, 400); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(264, 400); ctx.lineTo(352, 445); ctx.stroke()  // connector
  ctx.beginPath(); ctx.moveTo(352, 445); ctx.lineTo(274, 495); ctx.stroke()
  ctx.shadowBlur = 0

  // ── Slingshots ────────────────────────────────────────────────────────────
  drawSlingshot(ctx,  65, 515, -0.28, rs.slingshotFlash?.[0] ?? 0, false)
  drawSlingshot(ctx, 287, 515,  0.28, rs.slingshotFlash?.[1] ?? 0, true)

  // ── Target banks ──────────────────────────────────────────────────────────
  // x=130 (left bank) and x=225 (right bank) — matches physics.ts target positions
  const bankColors = ['#fbbf24', '#f87171']
  rs.targetsHit.forEach((bank, bi) => {
    const x  = bi === 0 ? 130 : 225
    const ys = [340, 385, 430]
    ys.forEach((y, ti) => {
      const hit = bank[ti]
      ctx.fillStyle   = hit ? bankColors[bi] : 'rgba(255,255,255,0.10)'
      ctx.shadowBlur  = hit ? 16 : 0
      ctx.shadowColor = bankColors[bi]
      ctx.beginPath(); ctx.rect(x - 4, y - 17, 8, 34); ctx.fill()
      ctx.shadowBlur  = 0
      if (hit) {
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
      }
    })
  })

  // ── Bumpers ───────────────────────────────────────────────────────────────
  const now = Date.now()
  BUMPER_DEFS.forEach((def, i) => {
    const isJackpot  = def.label === LABELS.JACKPOT
    const lastHit    = rs.bumperHitTimes[i] ?? 0
    const recentHit  = now - lastHit < 180
    const jackpotLit = isJackpot && rs.jackpotLit
    const baseColor  = jackpotLit ? '#facc15' : def.color
    const litColor   = recentHit ? '#ffffff' : baseColor
    const glowSize   = recentHit ? 32 : jackpotLit ? 22 : 8

    ctx.shadowBlur  = glowSize
    ctx.shadowColor = litColor
    ctx.beginPath()
    ctx.arc(def.x, def.y, def.r, 0, Math.PI * 2)
    ctx.fillStyle = recentHit ? litColor : `rgba(${hexToRgb(baseColor)},0.18)`
    ctx.fill()
    ctx.strokeStyle = litColor
    ctx.lineWidth   = recentHit ? 3.5 : 2.5
    ctx.stroke()
    ctx.shadowBlur  = 0

    ctx.beginPath()
    ctx.arc(def.x, def.y, def.r * 0.55, 0, Math.PI * 2)
    ctx.strokeStyle = recentHit ? 'rgba(255,255,255,0.9)' : `rgba(${hexToRgb(baseColor)},0.5)`
    ctx.lineWidth   = 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(def.x - 5, def.y - 5, 5, 0, Math.PI * 2)
    ctx.fillStyle = recentHit ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)'
    ctx.fill()

    if (isJackpot) {
      ctx.fillStyle   = jackpotLit ? '#facc15' : 'rgba(255,255,255,0.5)'
      ctx.shadowBlur  = jackpotLit ? 8 : 0
      ctx.shadowColor = '#facc15'
      ctx.font        = 'bold 7px monospace'
      ctx.textAlign   = 'center'
      ctx.fillText('JP', def.x, def.y + 3)
      ctx.shadowBlur  = 0
    }
  })

  // ── Walls ─────────────────────────────────────────────────────────────────
  ctx.lineWidth   = 4
  ctx.strokeStyle = 'rgba(148,163,184,0.55)'
  ctx.shadowBlur  = 0

  // Left outer wall — full height (matches physics leftOuter)
  ctx.beginPath(); ctx.moveTo(22, 10); ctx.lineTo(22, 700); ctx.stroke()
  // Top wall (main table)
  ctx.beginPath(); ctx.moveTo(22, 10); ctx.lineTo(352, 10); ctx.stroke()
  // Top lane dividers — start at y=94 so the ball can pass over them freely
  ctx.lineWidth   = 3
  ctx.strokeStyle = 'rgba(148,163,184,0.35)'
  ;[90, 140, 190, 240, 290].forEach(x => {
    ctx.beginPath(); ctx.moveTo(x, 94); ctx.lineTo(x, 189); ctx.stroke()
  })

  // Outlane guides
  ctx.strokeStyle = 'rgba(148,163,184,0.55)'
  ctx.lineWidth   = 4
  ctx.beginPath(); ctx.moveTo(22, 570); ctx.lineTo(96, 630); ctx.stroke()   // left guide
  ctx.beginPath(); ctx.moveTo(330, 570); ctx.lineTo(256, 630); ctx.stroke() // right guide
  // Outer walls (lower)
  ctx.beginPath(); ctx.moveTo(22,  570); ctx.lineTo(22,  700); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(330, 570); ctx.lineTo(330, 700); ctx.stroke()
  // Inlane separators (x=75 left, x=297 right — clear of flipper pivots at x=98/276)
  ctx.beginPath(); ctx.moveTo( 75, 620); ctx.lineTo( 75, 676); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(297, 620); ctx.lineTo(297, 676); ctx.stroke()
  // Flipper platform lines
  ctx.strokeStyle = 'rgba(100,116,139,0.4)'
  ctx.beginPath(); ctx.moveTo(22,  700); ctx.lineTo( 96, 700); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(276, 700); ctx.lineTo(330, 700); ctx.stroke()

  // ── Flippers ──────────────────────────────────────────────────────────────
  drawFlipper(ctx, table.leftFlipper,   98, 648, true,  rs.leftFlipperActive)
  drawFlipper(ctx, table.rightFlipper, 276, 648, false, rs.rightFlipperActive)

  // ── Ball ──────────────────────────────────────────────────────────────────
  const bp   = table.ball.position
  const grad = ctx.createRadialGradient(bp.x - 3, bp.y - 3, 1, bp.x, bp.y, 10)
  grad.addColorStop(0,   '#ffffff')
  grad.addColorStop(0.4, '#d1d5db')
  grad.addColorStop(1,   '#6b7280')
  ctx.beginPath()
  ctx.arc(bp.x, bp.y, 10, 0, Math.PI * 2)
  ctx.fillStyle   = grad
  ctx.shadowBlur  = 10
  ctx.shadowColor = 'rgba(255,255,255,0.6)'
  ctx.fill()
  ctx.shadowBlur  = 0

  // ── Plunger ───────────────────────────────────────────────────────────────
  if (rs.phase === 'waiting' || rs.phase === 'launching') {
    const power    = rs.launchPower
    const color    = power > 0.7 ? '#ef4444' : power > 0.35 ? '#fbbf24' : '#4ade80'
    const plungerY = 675 - power * 110

    ctx.strokeStyle = color
    ctx.lineWidth   = 5
    ctx.shadowBlur  = 12
    ctx.shadowColor = color
    ctx.beginPath(); ctx.moveTo(374, plungerY); ctx.lineTo(374, 688); ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(374, plungerY, 7, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0

    // Power bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath(); ctx.roundRect(382, 560, 11, 126, 3); ctx.fill()
    const barH = power * 126
    ctx.fillStyle = color
    ctx.shadowBlur = 6; ctx.shadowColor = color
    ctx.beginPath(); ctx.roundRect(382, 686 - barH, 11, barH, 3); ctx.fill()
    ctx.shadowBlur = 0

    if (power === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font      = 'bold 7px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('HOLD',  374, 710)
      ctx.fillText('SPACE', 374, 720)
    }
  }

  ctx.restore()
}

// ── Slingshot ─────────────────────────────────────────────────────────────────
function drawSlingshot(
  ctx:       CanvasRenderingContext2D,
  cx:        number,
  cy:        number,
  angle:     number,
  lastFlash: number,
  mirror:    boolean
): void {
  const active  = Date.now() - lastFlash < 120
  const color   = active ? '#fb923c' : '#f97316'
  const glow    = active ? 20 : 6

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)

  const w = mirror ? -8 : 8
  const h = 120

  ctx.fillStyle   = `rgba(${hexToRgb(color)},${active ? 0.6 : 0.15})`
  ctx.shadowBlur  = glow
  ctx.shadowColor = color
  ctx.beginPath()
  ctx.moveTo(0,      -h / 2)
  ctx.lineTo(w * 2,  -h / 2 + 18)
  ctx.lineTo(w * 2,   h / 2 - 18)
  ctx.lineTo(0,       h / 2)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = color
  ctx.lineWidth   = active ? 3 : 2
  ctx.beginPath()
  ctx.moveTo(0, -h / 2); ctx.lineTo(0, h / 2)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(0, -h / 2, 4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(0,  h / 2, 4, 0, Math.PI * 2); ctx.fill()

  ctx.shadowBlur = 0
  ctx.restore()
}

// ── Flipper ───────────────────────────────────────────────────────────────────
function drawFlipper(
  ctx:    CanvasRenderingContext2D,
  body:   Matter.Body,
  pivotX: number,
  pivotY: number,
  isLeft: boolean,
  active: boolean
): void {
  const angle = body.angle
  const tipX  = isLeft ? FLIPPER_LEN : -FLIPPER_LEN
  const w1    = FLIPPER_THICK + 4
  const w2    = FLIPPER_THICK - 3

  ctx.save()
  ctx.translate(pivotX, pivotY)
  ctx.rotate(angle)

  ctx.shadowBlur  = active ? 14 : 5
  ctx.shadowColor = active ? '#ffffff' : '#64748b'

  ctx.beginPath()
  ctx.moveTo(0,    -w1)
  ctx.lineTo(tipX, -w2)
  ctx.lineTo(tipX,  w2)
  ctx.lineTo(0,     w1)
  ctx.closePath()

  ctx.fillStyle   = active ? '#f1f5f9' : '#8facc0'
  ctx.fill()
  ctx.strokeStyle = active ? '#ffffff' : '#cbd5e1'
  ctx.lineWidth   = 1.5
  ctx.stroke()

  const edgeColor = isLeft ? '#f97316' : '#22d3ee'
  ctx.strokeStyle = active ? edgeColor : `rgba(${hexToRgb(edgeColor)},0.4)`
  ctx.lineWidth   = 2
  ctx.shadowBlur  = active ? 8 : 0
  ctx.shadowColor = edgeColor
  ctx.beginPath()
  ctx.moveTo(0, -w1); ctx.lineTo(tipX, -w2)
  ctx.stroke()
  ctx.shadowBlur = 0

  ctx.restore()

  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#334155'
  ctx.fill()
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth   = 1.5
  ctx.stroke()
}

// ── Utility ───────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
