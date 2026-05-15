import { useState } from 'react'
import ChessMenu from './ChessMenu'
import ChessGame from './ChessGame'
import type { ChessConfig } from './types'

interface Props {
  onBack: () => void
}

type Phase = { name: 'menu' } | { name: 'game'; config: ChessConfig }

export default function ChessIndex({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: 'menu' })

  if (phase.name === 'menu') {
    return (
      <ChessMenu
        onStart={config => setPhase({ name: 'game', config })}
        onBack={onBack}
      />
    )
  }

  return (
    <ChessGame
      config={phase.config}
      onMenu={() => setPhase({ name: 'menu' })}
      onBack={onBack}
    />
  )
}
