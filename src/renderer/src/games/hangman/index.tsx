import { useState, useEffect } from 'react'
import HangmanGame from './HangmanGame'
import LanLobby from '../../components/LanLobby'

interface Props {
  onBack: () => void
}

type Phase =
  | { name: 'menu' }
  | { name: 'word-input'; mode: 'local' | 'lan-host' }
  | { name: 'lan-wait-word' }
  | { name: 'playing'
      word: string
      wordLength: number
      mode: 'local' | 'lan-host' | 'lan-join'
      playerName: string
      opponentName: string }
  | { name: 'gameover'
      won: boolean
      word: string
      mode: string
      playerName: string
      opponentName: string }

export default function HangmanIndex({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: 'menu' })
  const [playerName, setPlayerName] = useState('Player')
  const [opponentName, setOpponentName] = useState('Opponent')
  const [showLobby, setShowLobby] = useState(false)
  const [lanName, setLanName] = useState('Player')
  const [wordInput, setWordInput] = useState('')
  const [wordError, setWordError] = useState('')

  // Reset on menu
  useEffect(() => {
    if (phase.name === 'menu') {
      setWordInput('')
      setWordError('')
    }
  }, [phase.name])

  // LAN wait-word: listen for hangman:start from host
  useEffect(() => {
    if (phase.name !== 'lan-wait-word') return
    window.api.net.onMessage((msg: any) => {
      if (msg.type !== 'hangman:start') return
      const wordLength: number = msg.length
      setPhase({
        name: 'playing',
        word: '',
        wordLength,
        mode: 'lan-join',
        playerName: lanName.trim() || 'Player',
        opponentName: 'Host',
      })
    })
    window.api.net.onDisconnect(() => {
      window.api.net.offAll()
      setPhase({ name: 'menu' })
      setShowLobby(false)
    })
    return () => { window.api.net.offAll() }
  }, [phase.name, lanName])

  function handleLanConnected(role: 'host' | 'join') {
    if (role === 'host') {
      setPlayerName(lanName.trim() || 'Host')
      setOpponentName('Guesser')
      setPhase({ name: 'word-input', mode: 'lan-host' })
    } else {
      setPhase({ name: 'lan-wait-word' })
    }
    setShowLobby(false)
  }

  function handleWordSubmit() {
    const trimmed = wordInput.trim()
    if (trimmed.length < 2) {
      setWordError('Word must be at least 2 letters.')
      return
    }
    if (trimmed.length > 20) {
      setWordError('Word must be 20 characters or fewer.')
      return
    }
    if (!/^[a-zA-Z ]+$/.test(trimmed)) {
      setWordError('Only letters and spaces are allowed.')
      return
    }
    setWordError('')

    const wordPhase = phase as Extract<Phase, { name: 'word-input' }>
    const mode = wordPhase.mode

    if (mode === 'lan-host') {
      window.api.net.send({ type: 'hangman:start', length: trimmed.length })
      setPhase({
        name: 'playing',
        word: trimmed,
        wordLength: trimmed.length,
        mode: 'lan-host',
        playerName: lanName.trim() || 'Host',
        opponentName: 'Guesser',
      })
    } else {
      const pName = playerName.trim() || 'Player'
      const oName = opponentName.trim() || 'Guesser'
      setPhase({
        name: 'playing',
        word: trimmed,
        wordLength: trimmed.length,
        mode: 'local',
        playerName: pName,
        opponentName: oName,
      })
    }
  }

  function handleGameOver(won: boolean, word: string) {
    const p = phase as Extract<Phase, { name: 'playing' }>
    setPhase({
      name: 'gameover',
      won,
      word,
      mode: p.mode,
      playerName: p.playerName,
      opponentName: p.opponentName,
    })
  }

  function handlePlayAgain() {
    const p = phase as Extract<Phase, { name: 'gameover' }>
    if (p.mode === 'local') {
      setPhase({ name: 'word-input', mode: 'local' })
    } else if (p.mode === 'lan-host') {
      setPhase({ name: 'word-input', mode: 'lan-host' })
    } else {
      // lan-join: wait for host to pick again
      setPhase({ name: 'lan-wait-word' })
    }
    setWordInput('')
    setWordError('')
  }

  function handleBackToMenu() {
    window.api.net.offAll()
    window.api.net.stop()
    setPhase({ name: 'menu' })
    setShowLobby(false)
  }

  // ── MENU ──────────────────────────────────────────────────────────────────
  if (phase.name === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none">
        <div className="w-full max-w-sm bg-surface-700 rounded-2xl p-8 shadow-2xl border border-white/5">
          <h1 className="text-3xl font-bold text-white text-center mb-1 tracking-tight">HANGMAN</h1>
          <p className="text-gray-400 text-sm text-center mb-8">Word guessing game</p>

          {!showLobby && (
            <>
              {/* Player names for local */}
              <div className="mb-6 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
                    Word Master Name
                  </label>
                  <input
                    className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2
                      text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-accent/60"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    maxLength={20}
                    placeholder="Player"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
                    Guesser Name
                  </label>
                  <input
                    className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2
                      text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-accent/60"
                    value={opponentName}
                    onChange={e => setOpponentName(e.target.value)}
                    maxLength={20}
                    placeholder="Opponent"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setPhase({ name: 'word-input', mode: 'local' })}
                  className="w-full bg-accent hover:bg-accent-light py-3 rounded-xl
                    text-white font-bold text-sm transition-colors shadow-lg shadow-accent/20"
                >
                  Local Game
                </button>

                <button
                  onClick={() => setShowLobby(true)}
                  className="w-full bg-surface-600 hover:bg-surface-500 py-3 rounded-xl
                    text-white font-bold text-sm transition-colors"
                >
                  LAN Game
                </button>

                <button
                  onClick={onBack}
                  className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl
                    text-gray-300 text-sm font-medium transition-colors"
                >
                  Back to Library
                </button>
              </div>
            </>
          )}

          {showLobby && (
            <>
              <div className="mb-4">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
                  Your Name
                </label>
                <input
                  className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2
                    text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-accent/60"
                  value={lanName}
                  onChange={e => setLanName(e.target.value)}
                  maxLength={20}
                  placeholder="Player"
                  autoFocus
                />
              </div>
              <div className="bg-surface-600/50 rounded-xl p-4 border border-white/5">
                <LanLobby
                  gameName="Hangman"
                  onConnected={handleLanConnected}
                  onCancel={() => setShowLobby(false)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── WORD INPUT ─────────────────────────────────────────────────────────────
  if (phase.name === 'word-input') {
    const isLanHost = phase.mode === 'lan-host'
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none">
        <div className="w-full max-w-sm bg-surface-700 rounded-2xl p-8 shadow-2xl border border-white/5">
          <div className="text-center mb-2">
            <span className="text-4xl">🤫</span>
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-1">
            {isLanHost ? 'Enter your secret word' : 'Enter your word'}
          </h2>
          {isLanHost && (
            <p className="text-gray-400 text-sm text-center mb-6">Your opponent is waiting…</p>
          )}
          {!isLanHost && (
            <p className="text-gray-400 text-sm text-center mb-6">
              The Guesser must not look at the screen!
            </p>
          )}

          <div className="mb-4">
            <input
              className="w-full bg-surface-600 border border-white/10 rounded-xl px-4 py-4
                text-white text-2xl font-mono text-center uppercase tracking-[0.3em]
                placeholder:text-gray-600 placeholder:text-base placeholder:tracking-normal
                focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
              value={wordInput}
              onChange={e => {
                setWordInput(e.target.value)
                setWordError('')
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && wordInput.trim().length >= 2) handleWordSubmit()
              }}
              maxLength={20}
              placeholder="Type a word…"
              autoFocus
              style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            />
            {wordError && (
              <p className="text-red-400 text-xs mt-2 text-center">{wordError}</p>
            )}
            <p className="text-gray-600 text-xs mt-2 text-center">
              Letters and spaces only, 2–20 characters
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleWordSubmit}
              disabled={wordInput.trim().length < 2}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-colors shadow-lg ${
                wordInput.trim().length >= 2
                  ? 'bg-accent hover:bg-accent-light text-white shadow-accent/20'
                  : 'bg-surface-500 text-gray-600 cursor-not-allowed'
              }`}
            >
              Ready!
            </button>
            <button
              onClick={() => {
                if (isLanHost) {
                  window.api.net.stop()
                }
                setPhase({ name: 'menu' })
              }}
              className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl
                text-gray-300 text-sm font-medium transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── LAN WAIT WORD ──────────────────────────────────────────────────────────
  if (phase.name === 'lan-wait-word') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none">
        <div className="w-full max-w-sm bg-surface-700 rounded-2xl p-8 shadow-2xl border border-white/5 text-center space-y-4">
          <div className="text-4xl">🔤</div>
          <h2 className="text-xl font-bold text-white">Get ready, {lanName.trim() || 'Player'}!</h2>
          <p className="text-gray-400 text-sm animate-pulse">
            Waiting for host to choose a word…
          </p>
          <div className="flex gap-1 justify-center">
            {[0.1, 0.2, 0.3].map(d => (
              <div
                key={d}
                className="w-2 h-2 bg-accent rounded-full"
                style={{ animation: `hg-danger-pulse 0.8s ease-in-out ${d}s infinite` }}
              />
            ))}
          </div>
          <button
            onClick={() => { window.api.net.stop(); setPhase({ name: 'menu' }) }}
            className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl
              text-gray-400 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (phase.name === 'playing') {
    const { word, wordLength, mode, playerName: pName, opponentName: oName } = phase
    return (
      <HangmanGame
        key={`${mode}-${word}-${wordLength}`}
        word={word}
        wordLength={wordLength}
        mode={mode}
        playerName={pName}
        opponentName={oName}
        onGameOver={handleGameOver}
        onBack={handleBackToMenu}
      />
    )
  }

  // ── GAMEOVER ──────────────────────────────────────────────────────────────
  if (phase.name === 'gameover') {
    const { won, word, mode: gMode, playerName: pName, opponentName: oName } = phase
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none">
        <div
          className="w-full max-w-sm bg-surface-700 rounded-2xl p-8 shadow-2xl border border-white/5 text-center"
          style={{ animation: 'hg-card-in 0.35s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}
        >
          <div className="text-6xl mb-4">{won ? '🎉' : '💀'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {won ? 'Victory!' : 'Better luck next time!'}
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            {gMode === 'lan-host'
              ? (won ? `${oName} guessed your word!` : `${oName} couldn't guess your word.`)
              : (gMode === 'lan-join'
                ? (won ? `You guessed the word!` : `You couldn't guess the word.`)
                : (won ? `${oName} guessed the word!` : `${oName} couldn't guess it.`))}
          </p>
          <p className="text-gray-400 text-xs mb-2">The word was:</p>
          <div
            className="font-mono text-2xl font-bold tracking-widest mb-6 py-3 px-4
              rounded-xl bg-surface-600 inline-block"
            style={{
              color: won ? '#4ade80' : '#ef4444',
              animation: won ? 'hg-win-glow 1.5s ease-in-out infinite' : 'hg-lose-reveal 0.5s ease both',
            }}
          >
            {word.toUpperCase()}
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={handlePlayAgain}
              className="w-full bg-accent hover:bg-accent-light py-3 rounded-xl
                text-white font-bold text-sm transition-colors shadow-lg shadow-accent/20"
            >
              Play Again
            </button>
            <button
              onClick={handleBackToMenu}
              className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl
                text-gray-300 text-sm font-medium transition-colors"
            >
              Back to Menu
            </button>
            <button
              onClick={onBack}
              className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl
                text-gray-400 text-sm transition-colors"
            >
              Back to Library
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
