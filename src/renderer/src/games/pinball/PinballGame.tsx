import { useState, useRef, useEffect, useCallback } from 'react'
import * as Matter from 'matter-js'
import {
  createTable, resetBall, driveFlipper,
  L_REST, L_ACTIVE, R_REST, R_ACTIVE,
  LABELS, TABLE_W, TABLE_H,
  type PhysicsTable,
} from './physics'
import { renderFrame } from './renderer'
import {
  initialScoringState, addPoints, tickScoring, advanceMultiplier,
  BALLS_PER_GAME,
  type ScoringState,
} from './scoring'
import { getHighScores } from './leaderboard'
import {
  playBumper, playTarget, playTargetBank, playRamp,
  playDrain, playLaunch, playSkillShot, playJackpot,
} from './sounds'
import { SCORE_VALUES } from './scoring'

interface Props {
  playerName: string
  onBack:     () => void
  onGameOver: (score: number) => void
}

export interface RenderState {
  phase:              'waiting' | 'launching' | 'playing' | 'paused' | 'ballLost' | 'gameOver'
  score:              number
  ballsLeft:          number
  multiplier:         number
  combo:              number
  comboTimer:         number
  jackpotLit:         boolean
  multiBallActive:    boolean
  launchPower:        number
  bumperHitTimes:     number[]    // 5 entries: bumper-0..3 + jackpot
  slingshotFlash:     number[]    // [leftTs, rightTs]
  targetsHit:         boolean[][]
  lanesComplete:      boolean[]
  shakeX:             number
  shakeY:             number
  message:            string | null
  messageTimer:       number
  leftFlipperActive:  boolean
  rightFlipperActive: boolean
  skillShotAvailable: boolean
}

interface GameState extends ScoringState {
  phase:              RenderState['phase']
  ballsLeft:          number
  jackpotLit:         boolean
  multiBallActive:    boolean
  launchPower:        number
  bumperHitTimes:     number[]    // 5 entries
  slingshotFlash:     number[]    // [leftTs, rightTs]
  targetsHit:         boolean[][]
  lanesComplete:      boolean[]
  shakeX:             number
  shakeY:             number
  shakeDecay:         number
  message:            string | null
  messageTimer:       number
  leftFlipperActive:  boolean
  rightFlipperActive: boolean
  skillShotAvailable: boolean
}

function initialGameState(): GameState {
  return {
    ...initialScoringState(),
    phase:              'waiting',
    ballsLeft:          BALLS_PER_GAME,
    jackpotLit:         false,
    multiBallActive:    false,
    launchPower:        0,
    bumperHitTimes:     [0, 0, 0, 0, 0],
    slingshotFlash:     [0, 0],
    targetsHit:         [[false, false, false], [false, false, false]],
    lanesComplete:      [false, false, false, false],
    shakeX:             0,
    shakeY:             0,
    shakeDecay:         0,
    message:            null,
    messageTimer:       0,
    leftFlipperActive:  false,
    rightFlipperActive: false,
    skillShotAvailable: false,
  }
}

export default function PinballGame({ playerName, onBack, onGameOver }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gsRef        = useRef<GameState>(initialGameState())
  const tableRef     = useRef<PhysicsTable | null>(null)
  const keysRef      = useRef({ left: false, right: false, space: false })
  const drainedRef   = useRef(false)
  const animFrameRef = useRef<number>(0)
  const frameCountRef = useRef(0)
  const gameOverCalledRef = useRef(false)

  const hiScore = getHighScores()[0]?.score ?? 0

  // React state (updated every ~10 frames)
  const [score,      setScore]      = useState(0)
  const [ballsLeft,  setBallsLeft]  = useState(BALLS_PER_GAME)
  const [multiplier, setMultiplier] = useState(1)
  const [combo,      setCombo]      = useState(0)
  const [phase,      setPhase]      = useState<GameState['phase']>('waiting')
  const [message,    setMessage]    = useState<string | null>(null)

  function triggerShake(strength: number) {
    gsRef.current.shakeX = (Math.random() - 0.5) * strength * 2
    gsRef.current.shakeY = (Math.random() - 0.5) * strength * 2
    gsRef.current.shakeDecay = strength
  }

  function showMessage(msg: string) {
    gsRef.current.message = msg
    gsRef.current.messageTimer = 2000
    setMessage(msg)
  }

  const handlePause = useCallback(() => {
    const gs = gsRef.current
    if (gs.phase === 'paused') {
      gsRef.current = { ...gs, phase: 'playing' }
      setPhase('playing')
    } else if (gs.phase === 'playing' || gs.phase === 'launching') {
      gsRef.current = { ...gs, phase: 'paused' }
      setPhase('paused')
    }
  }, [])

  const handleRestart = useCallback(() => {
    // Clear old table
    if (tableRef.current) {
      Matter.Events.off(tableRef.current.engine)
      Matter.World.clear(tableRef.current.world, false)
      Matter.Engine.clear(tableRef.current.engine)
    }
    // Create new table
    const table = createTable()
    tableRef.current = table
    setupCollisions(table)
    // Reset state
    gsRef.current = initialGameState()
    drainedRef.current = false
    gameOverCalledRef.current = false
    setScore(0)
    setBallsLeft(BALLS_PER_GAME)
    setMultiplier(1)
    setCombo(0)
    setPhase('waiting')
    setMessage(null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function setupCollisions(table: PhysicsTable) {
    Matter.Events.on(table.engine, 'collisionStart', (event: Matter.IEventCollision<Matter.Engine>) => {
      event.pairs.forEach(pair => {
        const labels = new Set([pair.bodyA.label, pair.bodyB.label])
        if (!labels.has(LABELS.BALL)) return

        const otherLabel = pair.bodyA.label === LABELS.BALL ? pair.bodyB.label : pair.bodyA.label
        const gs = gsRef.current

        // All regular bumpers (bumper-0 through bumper-3)
        if (otherLabel.startsWith('bumper-')) {
          const idx = parseInt(otherLabel.split('-')[1])
          const newTimes = [...gs.bumperHitTimes]
          newTimes[idx] = Date.now()
          const pts = gs.multiBallActive ? SCORE_VALUES.multiBallHit : SCORE_VALUES.bumper
          playBumper()
          gsRef.current = { ...gs, bumperHitTimes: newTimes, ...addPoints(gs, pts, 0) }
          triggerShake(3)
        }

        // Slingshots — energetic kick, small points
        if (otherLabel === LABELS.SLINGSHOT_L || otherLabel === LABELS.SLINGSHOT_R) {
          const isLeft = otherLabel === LABELS.SLINGSHOT_L
          const newFlash = [...gs.slingshotFlash]
          newFlash[isLeft ? 0 : 1] = Date.now()
          playBumper()
          gsRef.current = { ...gs, slingshotFlash: newFlash, ...addPoints(gs, SCORE_VALUES.bumper, 0) }
          triggerShake(2)
        }

        if (otherLabel === LABELS.JACKPOT) {
          const newTimes = [...gs.bumperHitTimes]
          newTimes[4] = Date.now()
          if (gs.jackpotLit) {
            playJackpot()
            gsRef.current = {
              ...gs,
              bumperHitTimes: newTimes,
              jackpotLit: false,
              lanesComplete: [false, false, false, false],
              ...addPoints(gs, SCORE_VALUES.jackpot, 0),
            }
            triggerShake(15)
            showMessage('JACKPOT! 50,000!')
          } else {
            playBumper()
            gsRef.current = { ...gs, bumperHitTimes: newTimes, ...addPoints(gs, SCORE_VALUES.bumper, 0) }
          }
        }

        if (otherLabel.startsWith('target-')) {
          const isLeft = otherLabel.startsWith('target-l')
          const idx    = parseInt(otherLabel.slice(-1))
          const bank   = isLeft ? 0 : 1
          const newHit = gs.targetsHit.map((b, bi) =>
            bi === bank ? b.map((h, ti) => ti === idx ? true : h) : b
          )
          const bankDone = newHit[bank].every(h => h)
          playTarget()
          let newGs: GameState = { ...gs, targetsHit: newHit, ...addPoints(gs, SCORE_VALUES.target, 0) }
          if (bankDone) {
            playTargetBank()
            newGs = { ...newGs, ...addPoints(newGs, SCORE_VALUES.targetBank, 0) }
            newGs = { ...newGs, ...advanceMultiplier(newGs) }
            setTimeout(() => {
              gsRef.current = {
                ...gsRef.current,
                targetsHit: gsRef.current.targetsHit.map((b, bi) =>
                  bi === bank ? [false, false, false] : b
                ),
              }
            }, 1000)
            showMessage(`×${newGs.multiplier} MULTIPLIER!`)
            triggerShake(8)
          }
          gsRef.current = newGs
        }

        if (otherLabel === LABELS.RAMP_LEFT || otherLabel === LABELS.RAMP_RIGHT) {
          playRamp()
          gsRef.current = { ...gs, ...addPoints(gs, SCORE_VALUES.ramp, 0) }
          showMessage('RAMP SHOT!')
        }

        if (otherLabel.startsWith('lane-')) {
          const idx = parseInt(otherLabel.slice(-1))
          const newLanes = gs.lanesComplete.map((l, li) => li === idx ? true : l)
          const newGs: GameState = { ...gs, lanesComplete: newLanes, ...addPoints(gs, SCORE_VALUES.topLane, 0) }
          if (newLanes.every(l => l)) {
            gsRef.current = { ...newGs, jackpotLit: true }
            showMessage('JACKPOT LIT!')
          } else {
            gsRef.current = newGs
          }
        }

        if (otherLabel === LABELS.SKILL_SENSOR && gs.skillShotAvailable) {
          gsRef.current = {
            ...gs,
            skillShotAvailable: false,
            ...addPoints(gs, SCORE_VALUES.skillShot, 0),
          }
          playSkillShot()
          showMessage('SKILL SHOT! +5000')
          triggerShake(10)
        }

        if (otherLabel === LABELS.DRAIN) {
          drainedRef.current = true
        }
      })
    })
  }

  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // Create physics table
    const table = createTable()
    tableRef.current = table
    setupCollisions(table)

    // Key handling
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'ArrowLeft'  || e.code === 'KeyZ') {
        keysRef.current.left = true
        gsRef.current = { ...gsRef.current, leftFlipperActive: true }
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyX' || e.code === 'Slash') {
        keysRef.current.right = true
        gsRef.current = { ...gsRef.current, rightFlipperActive: true }
      }
      if (e.code === 'Space') {
        e.preventDefault()
        if (!keysRef.current.space) {
          keysRef.current.space = true
          const gs = gsRef.current
          if (gs.phase === 'waiting') {
            gsRef.current = { ...gs, phase: 'launching' }
          }
        }
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        handlePause()
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'ArrowLeft'  || e.code === 'KeyZ') {
        keysRef.current.left = false
        gsRef.current = { ...gsRef.current, leftFlipperActive: false }
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyX' || e.code === 'Slash') {
        keysRef.current.right = false
        gsRef.current = { ...gsRef.current, rightFlipperActive: false }
      }
      if (e.code === 'Space') {
        keysRef.current.space = false
        const gs = gsRef.current
        if (gs.phase === 'launching') {
          const power = gs.launchPower
          // Calibrated for gravity=1.0 — ball travels ~545px up the plunger lane
          Matter.Body.setVelocity(table.ball, { x: 0, y: -(18 * power + 12) })
          playLaunch()
          gsRef.current = {
            ...gs,
            phase: 'playing',
            launchPower: 0,
            skillShotAvailable: true,
          }
          setPhase('playing')
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    // Resize handling
    function resizeCanvas() {
      if (!canvas || !container) return
      canvas.width  = container.clientWidth
      canvas.height = container.clientHeight
    }
    resizeCanvas()
    const ro = new ResizeObserver(resizeCanvas)
    ro.observe(container)

    // Game loop
    let lastTime = performance.now()

    function loop(now: number) {
      animFrameRef.current = requestAnimationFrame(loop)

      const rawDt = now - lastTime
      lastTime = now
      const dt = Math.min(rawDt, 32)

      const gs = gsRef.current

      if (gs.phase === 'playing') {
        // Tick physics
        Matter.Engine.update(table.engine, dt)

        // Drive flippers
        driveFlipper(table.leftFlipper,  L_REST, L_ACTIVE, keysRef.current.left)
        driveFlipper(table.rightFlipper, R_REST, R_ACTIVE, keysRef.current.right)

        // Tick combo timer
        const ticked = tickScoring(gsRef.current, dt)
        if (ticked.combo !== gsRef.current.combo || ticked.comboTimer !== gsRef.current.comboTimer) {
          gsRef.current = { ...gsRef.current, ...ticked }
        }
      }

      // Launch power charges while space held — ball stays frozen (no physics)
      if (gs.phase === 'launching' && keysRef.current.space) {
        gsRef.current = {
          ...gsRef.current,
          launchPower: Math.min(1, gsRef.current.launchPower + 0.008),
        }
      }

      // Drain check — guard against firing during ballLost/gameOver transition
      if (drainedRef.current && gsRef.current.phase === 'playing') {
        drainedRef.current = false
        playDrain()
        const newBalls = gsRef.current.ballsLeft - 1
        if (newBalls <= 0) {
          gsRef.current = { ...gsRef.current, phase: 'gameOver', ballsLeft: 0 }
          setPhase('gameOver')
          setBallsLeft(0)
          setScore(gsRef.current.score)
          if (!gameOverCalledRef.current) {
            gameOverCalledRef.current = true
            const finalScore = gsRef.current.score
            setTimeout(() => onGameOver(finalScore), 500)
          }
        } else {
          gsRef.current = { ...gsRef.current, phase: 'ballLost', ballsLeft: newBalls }
          setPhase('ballLost')
          setBallsLeft(newBalls)
          setTimeout(() => {
            resetBall(tableRef.current!)
            gsRef.current = {
              ...gsRef.current,
              phase: 'waiting',
              skillShotAvailable: true,
              launchPower: 0,
            }
            setPhase('waiting')
          }, 1500)
        }
      }

      // Shake decay
      if (gsRef.current.shakeDecay > 0) {
        const decay = gsRef.current.shakeDecay * 0.85
        gsRef.current = {
          ...gsRef.current,
          shakeX: decay > 0.5 ? (Math.random() - 0.5) * decay * 2 : 0,
          shakeY: decay > 0.5 ? (Math.random() - 0.5) * decay * 2 : 0,
          shakeDecay: decay > 0.1 ? decay : 0,
        }
      }

      // Message timer
      if (gsRef.current.messageTimer > 0) {
        const newTimer = Math.max(0, gsRef.current.messageTimer - dt)
        if (newTimer === 0 && gsRef.current.messageTimer > 0) {
          gsRef.current = { ...gsRef.current, message: null, messageTimer: 0 }
          setMessage(null)
        } else {
          gsRef.current = { ...gsRef.current, messageTimer: newTimer }
        }
      }

      // Update React state ~10fps
      frameCountRef.current++
      if (frameCountRef.current % 6 === 0) {
        const cur = gsRef.current
        setScore(cur.score)
        setBallsLeft(cur.ballsLeft)
        setMultiplier(cur.multiplier)
        setCombo(cur.combo)
      }

      // Render
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const containerW = canvas.width
      const containerH = canvas.height
      const scale = Math.min(containerW / TABLE_W, containerH / TABLE_H)
      const offsetX = (containerW - TABLE_W * scale) / 2
      const offsetY = (containerH - TABLE_H * scale) / 2

      ctx.clearRect(0, 0, containerW, containerH)

      // Fill letterbox with dark color
      ctx.fillStyle = '#060410'
      ctx.fillRect(0, 0, containerW, containerH)

      ctx.save()
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY)

      const rs: RenderState = {
        phase:              gsRef.current.phase,
        score:              gsRef.current.score,
        ballsLeft:          gsRef.current.ballsLeft,
        multiplier:         gsRef.current.multiplier,
        combo:              gsRef.current.combo,
        comboTimer:         gsRef.current.comboTimer,
        jackpotLit:         gsRef.current.jackpotLit,
        multiBallActive:    gsRef.current.multiBallActive,
        launchPower:        gsRef.current.launchPower,
        bumperHitTimes:     gsRef.current.bumperHitTimes,
        slingshotFlash:     gsRef.current.slingshotFlash,
        targetsHit:         gsRef.current.targetsHit,
        lanesComplete:      gsRef.current.lanesComplete,
        shakeX:             gsRef.current.shakeX,
        shakeY:             gsRef.current.shakeY,
        message:            gsRef.current.message,
        messageTimer:       gsRef.current.messageTimer,
        leftFlipperActive:  gsRef.current.leftFlipperActive,
        rightFlipperActive: gsRef.current.rightFlipperActive,
        skillShotAvailable: gsRef.current.skillShotAvailable,
      }

      renderFrame(ctx, table, rs, gsRef.current.shakeX, gsRef.current.shakeY)

      ctx.restore()
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      ro.disconnect()
      Matter.Events.off(table.engine)
      Matter.World.clear(table.world, false)
      Matter.Engine.clear(table.engine)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <style>{`
        @keyframes hg-letter-reveal {
          0%   { transform: translateY(-18px) scale(0.5); opacity: 0; }
          65%  { transform: translateY(4px) scale(1.2); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      {/* Game canvas container */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* UI overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-black/40 pointer-events-auto">
            <div className="text-white font-bold tracking-widest text-sm">PINBALL</div>
            <div className="text-center">
              <div className="text-3xl font-black text-white font-mono tabular-nums">{score.toLocaleString()}</div>
              <div className="text-xs text-gray-400">HI: {hiScore.toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePause}
                className="px-3 py-1 text-xs bg-slate-600/80 hover:bg-slate-500/80 text-white rounded-lg pointer-events-auto transition-colors"
              >
                {phase === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={onBack}
                className="px-3 py-1 text-xs bg-slate-600/80 hover:bg-slate-500/80 text-white rounded-lg pointer-events-auto transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Side info */}
          <div className="flex-1 flex justify-between px-2 py-2">
            <div className="flex flex-col gap-2 text-xs text-gray-300">
              <div className="bg-black/40 rounded-lg px-2 py-1">
                <div className="text-gray-500 uppercase tracking-wider text-[10px]">Multiplier</div>
                <div className="text-yellow-400 font-bold text-lg">×{multiplier}</div>
              </div>
              {combo > 1 && (
                <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg px-2 py-1">
                  <div className="text-orange-400 font-bold">×{combo} COMBO</div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end text-xs">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className="text-lg">{i < ballsLeft ? '🔴' : '⚫'}</span>
              ))}
              <div className="text-gray-500 text-[10px] mt-1">{playerName}</div>
            </div>
          </div>

          {/* Floating message */}
          {message && (
            <div className="absolute top-1/3 left-0 right-0 flex justify-center pointer-events-none">
              <div
                className="text-yellow-400 font-black text-2xl tracking-widest px-6 py-2 bg-black/60 rounded-full"
                style={{ animation: 'hg-letter-reveal 0.3s ease forwards' }}
              >
                {message}
              </div>
            </div>
          )}

          {/* Pause overlay */}
          {phase === 'paused' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto">
              <div className="bg-slate-700 border border-white/10 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
                <h2 className="text-2xl font-bold text-white">Paused</h2>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handlePause}
                    className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    onClick={handleRestart}
                    className="px-8 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-xl transition-colors"
                  >
                    Restart
                  </button>
                  <button
                    onClick={onBack}
                    className="px-8 py-2 bg-slate-600 hover:bg-slate-500 text-gray-300 rounded-xl transition-colors"
                  >
                    ← Menu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ball lost overlay */}
          {phase === 'ballLost' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-red-400 text-3xl font-black tracking-widest animate-pulse">BALL LOST</div>
            </div>
          )}

          {/* Game over overlay */}
          {phase === 'gameOver' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto">
              <div className="bg-slate-700 border border-white/10 rounded-2xl p-8 text-center space-y-4 shadow-2xl max-w-xs w-full">
                <h2 className="text-3xl font-black text-white">GAME OVER</h2>
                <p className="text-gray-400 text-sm">{playerName}</p>
                <div className="text-5xl font-black text-yellow-400 font-mono">{score.toLocaleString()}</div>
                <div className="flex flex-col gap-3 mt-4">
                  <button
                    onClick={handleRestart}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={onBack}
                    className="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-gray-300 rounded-xl transition-colors"
                  >
                    ← Menu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Launch hint */}
          {phase === 'waiting' && (
            <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none">
              <p className="text-gray-500 text-xs animate-pulse">Hold SPACE to charge • Release to launch</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
