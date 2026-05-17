import { useState } from 'react'
import Sidebar        from './components/Sidebar'
import Library        from './pages/Library'
import TitleBar       from './components/TitleBar'
import SnakeGame      from './games/snake/index'
import BattleshipGame from './games/battleship/index'
import ChessGame      from './games/chess/index'
import FlappyGame     from './games/flappy/index'
import HangmanGame    from './games/hangman/index'

type View = 'library' | 'snake' | 'battleship' | 'chess' | 'flappy' | 'hangman'

export default function App() {
  const [activeView, setActiveView] = useState<View>('library')

  function handlePlayBuiltIn(builtInId: string) {
    if (builtInId === 'snake')      setActiveView('snake')
    if (builtInId === 'battleship') setActiveView('battleship')
    if (builtInId === 'chess')      setActiveView('chess')
    if (builtInId === 'flappy')     setActiveView('flappy')
    if (builtInId === 'hangman')    setActiveView('hangman')
  }

  return (
    <div className="flex flex-col h-screen bg-surface-800 text-white overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView="library" onNavigate={v => setActiveView(v)} />
        <main className="flex-1 overflow-hidden">
          {activeView === 'library' && (
            <Library onPlayBuiltIn={handlePlayBuiltIn} />
          )}
          {activeView === 'snake' && (
            <SnakeGame onBack={() => setActiveView('library')} />
          )}
          {activeView === 'battleship' && (
            <BattleshipGame onBack={() => setActiveView('library')} />
          )}
          {activeView === 'chess' && (
            <ChessGame onBack={() => setActiveView('library')} />
          )}
          {activeView === 'flappy' && (
            <FlappyGame onBack={() => setActiveView('library')} />
          )}
          {activeView === 'hangman' && (
            <HangmanGame onBack={() => setActiveView('library')} />
          )}
        </main>
      </div>
    </div>
  )
}
