import * as Matter from 'matter-js'

// ── Body labels ───────────────────────────────────────────────────────────────
export const LABELS = {
  BALL:          'ball',
  FLIPPER_LEFT:  'flipper-left',
  FLIPPER_RIGHT: 'flipper-right',
  BUMPER_0:      'bumper-0',
  BUMPER_1:      'bumper-1',
  BUMPER_2:      'bumper-2',
  BUMPER_3:      'bumper-3',
  TARGET_L0:     'target-l0',
  TARGET_L1:     'target-l1',
  TARGET_L2:     'target-l2',
  TARGET_R0:     'target-r0',
  TARGET_R1:     'target-r1',
  TARGET_R2:     'target-r2',
  RAMP_LEFT:     'ramp-left',
  RAMP_RIGHT:    'ramp-right',
  LANE_0:        'lane-0',
  LANE_1:        'lane-1',
  LANE_2:        'lane-2',
  LANE_3:        'lane-3',
  JACKPOT:       'jackpot',
  SLINGSHOT_L:   'slingshot-l',
  SLINGSHOT_R:   'slingshot-r',
  WALL:          'wall',
  PLUNGER_WALL:  'plunger-wall',
  DRAIN:         'drain',
  SKILL_SENSOR:  'skill-sensor',
  OUTLANE_L:     'outlane-l',
  OUTLANE_R:     'outlane-r',
}

export const TABLE_W = 400
export const TABLE_H = 700

// ── Flipper constants ─────────────────────────────────────────────────────────
export const L_REST    =  0.42
export const L_ACTIVE  = -0.42
export const R_REST    = -0.42
export const R_ACTIVE  =  0.42

export const FLIPPER_LEN   = 88
export const FLIPPER_THICK = 10
const        FLIPPER_SPEED = 0.4

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PhysicsTable {
  engine:       Matter.Engine
  world:        Matter.World
  ball:         Matter.Body
  leftFlipper:  Matter.Body
  rightFlipper: Matter.Body
  leftPivot:    Matter.Constraint
  rightPivot:   Matter.Constraint
  bumpers:      Matter.Body[]
  targets:      Matter.Body[][]
  laneSensors:  Matter.Body[]
  drainSensor:  Matter.Body
  skillSensor:  Matter.Body
  plungerBall:  Matter.Body | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function wall(
  x: number, y: number, w: number, h: number,
  angle = 0,
  extraProps: Record<string, unknown> = {}
): Matter.Body {
  return Matter.Bodies.rectangle(x, y, w, h, {
    isStatic: true, label: LABELS.WALL, angle,
    friction: 0.05, restitution: 0.5, ...extraProps,
  })
}

function sensor(x: number, y: number, w: number, h: number, label: string): Matter.Body {
  return Matter.Bodies.rectangle(x, y, w, h, { isStatic: true, isSensor: true, label })
}

// ── Table factory ─────────────────────────────────────────────────────────────
export function createTable(): PhysicsTable {
  const engine = Matter.Engine.create()
  engine.gravity.y = 1.0
  const world = engine.world

  const bodies: Matter.Body[] = []

  // ── Outer walls ───────────────────────────────────────────────────────────
  const topWall  = wall(200, -8, 416, 16)   // top cap covers full width incl plunger
  const leftWall = wall(-10, 350, 20, 700)
  bodies.push(topWall, leftWall)

  // ─────────────────────────────────────────────────────────────────────────
  // PLUNGER LANE  (x = 352 .. 396, y = 0 .. 700)
  //
  //  The lane is a fully enclosed channel.  At the top the RIGHT wall
  //  angles from (396, 90) to (352, 10), physically forcing any upward ball
  //  to the LEFT into the main table.  The divider (left wall of the lane /
  //  right wall of the main table) ends at y = 90 so the ball can cross over.
  //
  //  Exit-ramp angle:  atan2(80, 44) ≈ 1.066 rad
  //  Normal into lane: (sin 1.066, −cos 1.066) ≈ (0.874, −0.487)
  //  Reflection of (0, −v):  v′ = (−0.874v, −0.487v)  → LEFT + slightly UP ✓
  // ─────────────────────────────────────────────────────────────────────────

  // Divider: right boundary of main table AND left wall of plunger lane.
  // Only spans y = 90 → 700; the gap above y = 90 is the exit opening.
  const plungerDiv = wall(352, 395, 8, 610, 0, { label: LABELS.PLUNGER_WALL })

  // Right outer wall of plunger lane — straight section (y = 90 → 700)
  const plungerRight = wall(396, 395, 8, 610, 0, { label: LABELS.PLUNGER_WALL })

  // Exit ramp: angled wall from (396, 90) down-left to (352, 10)
  //   center (374, 50), length = sqrt(44² + 80²) ≈ 91.3, angle = atan2(80, 44)
  const EXIT_ANGLE = Math.atan2(80, 44)   // ≈ 1.066 rad
  const plungerExit = wall(374, 50, 93, 10, EXIT_ANGLE, {
    label: LABELS.PLUNGER_WALL, restitution: 0.85, friction: 0,
  })

  bodies.push(plungerDiv, plungerRight, plungerExit)

  // (no cap wall — the ball must be free to travel above the lane dividers)

  // ── Bottom: guides toward flippers ───────────────────────────────────────
  //
  //  Layout (left side, right is mirrored):
  //
  //    x=22  leftOuter (vertical)
  //    x=22→96 leftGuide (angled, guides outlane ball toward flipper area)
  //    x=96  leftInlane (short vertical inlane separator)
  //
  //  The guide starts AT the outer wall face (no behind-wall pocket).

  // Left outer spans full height so the ball can never sneak behind the ramp.
  // Right outer only needs the lower section (plunger div covers the right above).
  const leftOuter  = wall(22,  350, 6, 700)   // y = 0 .. 700
  const rightOuter = wall(330, 635, 6, 130)   // y = 570 .. 700

  // Outlane guides — from outer wall inward toward flipper pivot.
  // Left:  from (22, 570) to (96, 630), angle = atan2(60, 74) ≈ 0.681 rad
  // Right: mirror
  const GUIDE_ANGLE = Math.atan2(60, 74)  // ≈ 0.681 rad
  const leftGuide  = wall(59,  600, 96, 7,  GUIDE_ANGLE,            { label: LABELS.OUTLANE_L })
  const rightGuide = wall(293, 600, 96, 7,  Math.PI - GUIDE_ANGLE,  { label: LABELS.OUTLANE_R })

  // Inlane separators — kept well clear of flipper pivots (LPX=98, RPX=276)
  // so the separator never overlaps the pivot body and causes physics jitter.
  const leftSep  = wall( 75, 648, 6, 56)   // y = 620 .. 676
  const rightSep = wall(297, 648, 6, 56)

  bodies.push(leftOuter, rightOuter, leftGuide, rightGuide, leftSep, rightSep)

  // ── Flippers ──────────────────────────────────────────────────────────────
  const LPX = 98,  LPY = 648
  const RPX = 276, RPY = 648

  const leftFlipper = Matter.Bodies.rectangle(
    LPX + FLIPPER_LEN / 2, LPY,
    FLIPPER_LEN, FLIPPER_THICK,
    { label: LABELS.FLIPPER_LEFT, frictionAir: 0.12, density: 0.2, restitution: 0.05, friction: 0.05 }
  )
  Matter.Body.setAngle(leftFlipper, L_REST)

  const leftPivot = Matter.Constraint.create({
    bodyA: leftFlipper,
    pointA: { x: -FLIPPER_LEN / 2, y: 0 },
    pointB: { x: LPX, y: LPY },
    stiffness: 1, length: 0,
  })

  const rightFlipper = Matter.Bodies.rectangle(
    RPX - FLIPPER_LEN / 2, RPY,
    FLIPPER_LEN, FLIPPER_THICK,
    { label: LABELS.FLIPPER_RIGHT, frictionAir: 0.12, density: 0.2, restitution: 0.05, friction: 0.05 }
  )
  Matter.Body.setAngle(rightFlipper, R_REST)

  const rightPivot = Matter.Constraint.create({
    bodyA: rightFlipper,
    pointA: { x: FLIPPER_LEN / 2, y: 0 },
    pointB: { x: RPX, y: RPY },
    stiffness: 1, length: 0,
  })

  Matter.World.add(world, [leftFlipper, rightFlipper, leftPivot, rightPivot])

  // ── Slingshots ────────────────────────────────────────────────────────────
  // Single wall per side.  Positioned well away from outer walls (40+ px gap)
  // so the ball can never be pinched between slingshot and outer wall.
  // Restitution ≤ 1.0 to prevent energy-gaining stuck-ball oscillation.
  const leftSling  = wall( 65, 515, 8, 120, -0.28,
    { label: LABELS.SLINGSHOT_L, restitution: 1.0, friction: 0 })
  const rightSling = wall(287, 515, 8, 120,  0.28,
    { label: LABELS.SLINGSHOT_R, restitution: 1.0, friction: 0 })

  bodies.push(leftSling, rightSling)

  // ── Bumpers ───────────────────────────────────────────────────────────────
  // BUMPER_1 was at y=190 (top y=170) — INSIDE the lane-divider zone (y=94-189),
  // causing the ball to get trapped in a lane channel with the bumper blocking the exit.
  // All bumpers now have their tops at y ≥ 210, safely below the divider zone.
  // JACKPOT moved left so it no longer overlaps the right target bank (was at x=215).
  const bumperDefs = [
    { x: 130, y: 215, label: LABELS.BUMPER_0 },
    { x: 200, y: 230, label: LABELS.BUMPER_1 },   // was y=190 — moved down 40px
    { x: 270, y: 215, label: LABELS.BUMPER_2 },
    { x: 155, y: 290, label: LABELS.BUMPER_3 },
    { x: 178, y: 325, label: LABELS.JACKPOT  },   // was (215,310) — moved left+down
  ]
  const bumpers = bumperDefs.map(def =>
    Matter.Bodies.circle(def.x, def.y, 20, {
      isStatic: true, label: def.label,
      restitution: 1.1, friction: 0, frictionAir: 0,
    })
  )

  // ── Target banks ──────────────────────────────────────────────────────────
  // Banks spread apart so the JACKPOT bumper (r=20) at x=178 has ≥ 24px clearance
  // to each bank — the ball (r=10) can pass freely on either side of JACKPOT.
  //   Left  bank x=130: ramp-end x≈110 → 16px gap (> ball r=10) ✓
  //   Right bank x=225: ramp-end x≈264 → 35px gap ✓
  const leftTargetDefs  = [{ x: 130, y: 340 }, { x: 130, y: 385 }, { x: 130, y: 430 }]
  const rightTargetDefs = [{ x: 225, y: 340 }, { x: 225, y: 385 }, { x: 225, y: 430 }]

  const leftTargets  = leftTargetDefs.map((d, i) =>
    Matter.Bodies.rectangle(d.x, d.y, 8, 34, {
      isStatic: true, label: LABELS[`TARGET_L${i}` as keyof typeof LABELS],
      restitution: 0.7, friction: 0,
    })
  )
  const rightTargets = rightTargetDefs.map((d, i) =>
    Matter.Bodies.rectangle(d.x, d.y, 8, 34, {
      isStatic: true, label: LABELS[`TARGET_R${i}` as keyof typeof LABELS],
      restitution: 0.7, friction: 0,
    })
  )

  // ── Ramps ─────────────────────────────────────────────────────────────────
  // Each ramp STARTS at the boundary wall so there is no pocket between the
  // ramp end and the wall.
  //   Left  upper : (22, 300) → (110, 400)   centre (66,  350)
  //   Left  lower : (22, 445) → (100, 495)   centre (61,  470)
  //   Right upper : (352,300) → (264, 400)   centre (308, 350)  — starts at plunger div
  //   Right lower : (352,445) → (274, 495)   centre (313, 470)  — starts at plunger div
  const leftRamp1  = wall( 66, 350, Math.hypot( 88, 100), 7,  Math.atan2(100,  88), { label: LABELS.RAMP_LEFT  })
  const leftRamp2  = wall( 61, 470, Math.hypot( 78,  50), 7,  Math.atan2( 50,  78), { label: LABELS.RAMP_LEFT  })
  const rightRamp1 = wall(308, 350, Math.hypot( 88, 100), 7,  Math.atan2(100, -88), { label: LABELS.RAMP_RIGHT })
  const rightRamp2 = wall(313, 470, Math.hypot( 78,  50), 7,  Math.atan2( 50, -78), { label: LABELS.RAMP_RIGHT })

  // ── Ramp connectors ───────────────────────────────────────────────────────
  // The gap between upper ramp end and lower ramp start creates a triangular
  // dead pocket on each side that traps the ball.  These diagonal walls seal
  // both pockets completely.
  //   Left:  (110, 400) → (22, 445)   angle = atan2(45, -88)
  //   Right: (264, 400) → (352, 445)  angle = atan2(45,  88)
  const leftRampConn  = wall( 66, 422, Math.hypot(88, 45), 7, Math.atan2(45, -88), { label: LABELS.RAMP_LEFT  })
  const rightRampConn = wall(308, 422, Math.hypot(88, 45), 7, Math.atan2(45,  88), { label: LABELS.RAMP_RIGHT })

  bodies.push(leftRamp1, leftRamp2, leftRampConn, rightRamp1, rightRamp2, rightRampConn)

  // ── Top lanes (4 channels) ────────────────────────────────────────────────
  // Dividers start at y=95 so the ball exiting the plunger lane (which travels
  // at y≈50–70 going left) can pass OVER them freely.  They then form
  // the channel walls for the ball to thread through going upward.
  const laneDivXs = [90, 140, 190, 240, 290]
  const laneDividers = laneDivXs.map(x => wall(x, 142, 4, 95))   // y = 94 .. 189

  const laneSensors = [
    sensor(115, 142, 44, 10, LABELS.LANE_0),
    sensor(165, 142, 44, 10, LABELS.LANE_1),
    sensor(215, 142, 44, 10, LABELS.LANE_2),
    sensor(265, 142, 44, 10, LABELS.LANE_3),
  ]

  bodies.push(...laneDividers)

  // ── Ball ──────────────────────────────────────────────────────────────────
  const ball = Matter.Bodies.circle(374, 620, 10, {
    label:       LABELS.BALL,
    restitution: 0.6,
    friction:    0.03,
    frictionAir: 0.003,
    density:     0.004,
  })

  // ── Sensors ───────────────────────────────────────────────────────────────
  // Drain covers full table width + plunger lane (x = 0 .. 410)
  const drainSensor = sensor(205, 718, 420, 28, LABELS.DRAIN)
  // Skill shot: near the lane entry from the plunger exit
  const skillSensor = sensor(260, 100, 60, 16, LABELS.SKILL_SENSOR)

  // ── World assembly ────────────────────────────────────────────────────────
  Matter.World.add(world, [
    ...bodies,
    ...bumpers,
    ...leftTargets, ...rightTargets,
    ...laneSensors,
    ball, drainSensor, skillSensor,
  ])

  return {
    engine, world, ball,
    leftFlipper, rightFlipper,
    leftPivot, rightPivot,
    bumpers, targets: [leftTargets, rightTargets],
    laneSensors, drainSensor, skillSensor,
    plungerBall: ball,
  }
}

// ── Flipper driver ────────────────────────────────────────────────────────────
export function driveFlipper(
  body:        Matter.Body,
  restAngle:   number,
  activeAngle: number,
  pressed:     boolean
): void {
  if (!pressed) {
    Matter.Body.setAngle(body, restAngle)
    Matter.Body.setAngularVelocity(body, 0)
    return
  }
  const diff    = activeAngle - body.angle
  const wrapped = ((diff % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI
  if (Math.abs(wrapped) < 0.02) {
    Matter.Body.setAngle(body, activeAngle)
    Matter.Body.setAngularVelocity(body, 0)
  } else {
    Matter.Body.setAngularVelocity(body, Math.sign(wrapped) * FLIPPER_SPEED)
  }
}

// ── Ball reset ────────────────────────────────────────────────────────────────
export function resetBall(table: PhysicsTable): void {
  Matter.Body.setPosition(table.ball, { x: 374, y: 620 })
  Matter.Body.setVelocity(table.ball, { x: 0, y: 0 })
  Matter.Body.setAngularVelocity(table.ball, 0)
  Matter.Body.setAngle(table.ball, 0)
  ;(table.ball as any).force  = { x: 0, y: 0 }
  ;(table.ball as any).torque = 0
}
