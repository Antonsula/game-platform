import { useState } from 'react'
import FlappyMenu        from './FlappyMenu'
import FlappyGame        from './FlappyGame'
import FlappyLeaderboard from './FlappyLeaderboard'
import type { FlappyConfig } from './types'

interface Props {
  onBack: () => void
}

type Phase =
  | { name: 'menu' }
  | { name: 'game';        config: FlappyConfig }
  | { name: 'leaderboard' }

export default function FlappyIndex({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: 'menu' })

  if (phase.name === 'menu') {
    return (
      <FlappyMenu
        onStart={config => setPhase({ name: 'game', config })}
        onLeaderboard={() => setPhase({ name: 'leaderboard' })}
        onBack={onBack}
      />
    )
  }

  if (phase.name === 'leaderboard') {
    return (
      <FlappyLeaderboard
        onBack={() => setPhase({ name: 'menu' })}
      />
    )
  }

  return (
    <FlappyGame
      config={phase.config}
      onMenu={() => setPhase({ name: 'menu' })}
      onBack={onBack}
    />
  )
}
