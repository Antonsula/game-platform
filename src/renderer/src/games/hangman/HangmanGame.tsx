import { useState, useEffect, useRef, useCallback } from 'react'
import HangmanFigure from './HangmanFigure'

interface Props {
  word:         string
  wordLength:   number
  mode:         'local' | 'lan-host' | 'lan-join'
  playerName:   string
  opponentName: string
  onGameOver:   (won: boolean, word: string) => void
  onBack:       () => void
}

interface Particle {
  id: number
  x: number
  color: string
  size: number
  delay: number
  duration: number
  dx: string
  rot: string
}

const MAX_WRONG = 6

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
]

function buildInitialDisplay(word: string, wordLength: number, mode: string): string[] {
  if (mode === 'lan-join') {
    return Array(wordLength).fill('_')
  }
  return word.split('').map(c => (c === ' ' ? ' ' : '_'))
}

function spawnConfetti(): Particle[] {
  const colors = ['#facc15','#4ade80','#60a5fa','#f472b6','#fb923c','#a78bfa']
  return Array.from({ length: 55 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[i % 6],
    size: 7 + Math.random() * 7,
    delay: Math.random() * 0.8,
    duration: 1.8 + Math.random() * 1.2,
    dx: `${(Math.random() - 0.5) * 120}px`,
    rot: `${Math.floor(Math.random() * 3 + 1) * 360}deg`,
  }))
}

export default function HangmanGame({ word, wordLength, mode, playerName, opponentName, onGameOver, onBack }: Props) {
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set())
  const [wrongCount, setWrongCount]         = useState(0)
  const [displayWord, setDisplayWord]       = useState<string[]>(() => buildInitialDisplay(word, wordLength, mode))
  const [gameState, setGameState]           = useState<'playing' | 'won' | 'lost'>('playing')
  const [lastRevealedIndices, setLastRevealedIndices] = useState<number[]>([])
  const [wrongFlash, setWrongFlash]         = useState(false)
  const [particles, setParticles]           = useState<Particle[]>([])
  const [revealedWord, setRevealedWord]     = useState('')   // set for lan-join on loss

  // For resetting the reveal animation after it plays
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep a stable ref to processGuess so the LAN listener doesn't re-register
  const processGuessRef = useRef<(letter: string) => void>(() => {})

  // Clear reveal animation after 400ms
  useEffect(() => {
    if (lastRevealedIndices.length > 0) {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
      revealTimerRef.current = setTimeout(() => {
        setLastRevealedIndices([])
      }, 400)
    }
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    }
  }, [lastRevealedIndices])

  const processGuess = useCallback((letter: string) => {
    if (gameState !== 'playing') return

    setGuessedLetters(prev => {
      if (prev.has(letter)) return prev
      const next = new Set(prev)
      next.add(letter)

      if (mode === 'lan-join') {
        window.api.net.send({ type: 'hangman:guess', letter })
        return next
      }

      // Find matching positions
      const positions: number[] = []
      for (let i = 0; i < word.length; i++) {
        if (word[i].toLowerCase() === letter.toLowerCase()) {
          positions.push(i)
        }
      }

      if (positions.length > 0) {
        // Correct guess
        setDisplayWord(prev => {
          const updated = [...prev]
          positions.forEach(i => { updated[i] = word[i].toUpperCase() })
          return updated
        })
        setLastRevealedIndices(positions)

        // Check win
        setDisplayWord(current => {
          const updated = [...current]
          positions.forEach(i => { updated[i] = word[i].toUpperCase() })
          const wonNow = updated.every(c => c !== '_')
          if (wonNow) {
            const finalWord = word
            if (mode === 'lan-host') {
              window.api.net.send({
                type: 'hangman:result',
                letter,
                positions,
                wrongCount: wrongCount,
                won: true,
                lost: false,
                word: finalWord,
              })
            }
            setGameState('won')
            setParticles(spawnConfetti())
          } else if (mode === 'lan-host') {
            window.api.net.send({
              type: 'hangman:result',
              letter,
              positions,
              wrongCount: wrongCount,
              won: false,
              lost: false,
              word: '',
            })
          }
          return updated
        })
      } else {
        // Wrong guess
        setWrongCount(prev => {
          const newWrong = prev + 1
          const lostNow = newWrong >= MAX_WRONG
          if (lostNow) {
            if (mode === 'lan-host') {
              window.api.net.send({
                type: 'hangman:result',
                letter,
                positions: [],
                wrongCount: newWrong,
                won: false,
                lost: true,
                word: word,
              })
            }
            setGameState('lost')
          } else if (mode === 'lan-host') {
            window.api.net.send({
              type: 'hangman:result',
              letter,
              positions: [],
              wrongCount: newWrong,
              won: false,
              lost: false,
              word: '',
            })
          }
          return newWrong
        })
        setWrongFlash(true)
        setTimeout(() => setWrongFlash(false), 700)
      }

      return next
    })
  }, [gameState, mode, word, wrongCount])

  // Keep ref in sync with latest processGuess
  useEffect(() => {
    processGuessRef.current = processGuess
  }, [processGuess])

  // LAN host listener
  useEffect(() => {
    if (mode !== 'lan-host') return
    window.api.net.onMessage((msg: any) => {
      if (msg.type === 'hangman:guess') {
        processGuessRef.current(msg.letter)
      }
    })
    window.api.net.onDisconnect(() => {
      // Treat as game over
    })
    return () => { window.api.net.offAll() }
  }, [mode])

  // LAN join listener
  useEffect(() => {
    if (mode !== 'lan-join') return
    window.api.net.onMessage((msg: any) => {
      if (msg.type !== 'hangman:result') return
      const { letter, positions, wrongCount: wc, won, lost, word: revWord } = msg as {
        letter: string
        positions: number[]
        wrongCount: number
        won: boolean
        lost: boolean
        word: string
      }

      setGuessedLetters(prev => new Set([...prev, letter]))

      if (positions.length > 0) {
        setDisplayWord(prev => {
          const next = [...prev]
          positions.forEach(i => { next[i] = letter.toUpperCase() })
          return next
        })
        setLastRevealedIndices(positions)
      } else {
        setWrongCount(wc)
        setWrongFlash(true)
        setTimeout(() => setWrongFlash(false), 700)
      }

      if (won) {
        setGameState('won')
        setParticles(spawnConfetti())
      }
      if (lost) {
        setDisplayWord(revWord.toUpperCase().split(''))
        setRevealedWord(revWord)
        setGameState('lost')
      }
    })
    return () => { window.api.net.offAll() }
  }, [mode])

  // Keyboard handler
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (gameState !== 'playing') return
      if (mode === 'lan-host') return
      const letter = e.key.toUpperCase()
      if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
        processGuessRef.current(letter.toLowerCase())
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [gameState, mode])

  // Unmount cleanup
  useEffect(() => {
    return () => { window.api.net.offAll() }
  }, [])

  const wrongLetters = [...guessedLetters].filter(l => {
    if (mode === 'lan-join') return true // we track locally
    return !word.toLowerCase().includes(l)
  }).filter(l => {
    if (mode !== 'lan-join') return !word.toLowerCase().includes(l)
    // For join: a letter is wrong if it's guessed and not shown in the displayWord
    const inWord = displayWord.some(c => c.toLowerCase() === l)
    return !inWord
  })

  const livesLeft = MAX_WRONG - wrongCount

  function getKeyStyle(letter: string): string {
    const lower = letter.toLowerCase()
    const isGuessed = guessedLetters.has(lower)
    if (!isGuessed) {
      return 'bg-surface-600 text-white hover:bg-surface-500 hover:scale-105 cursor-pointer'
    }
    const inWord = mode !== 'lan-join'
      ? word.toLowerCase().includes(lower)
      : displayWord.some(c => c.toLowerCase() === lower)
    if (inWord) {
      return 'bg-green-700/60 text-green-300 cursor-not-allowed'
    }
    return 'bg-red-900/40 text-red-400/50 cursor-not-allowed line-through'
  }

  const keyboardDisabled = gameState !== 'playing' || mode === 'lan-host'

  function getStatusText() {
    if (mode === 'lan-host') return 'You are the Word Master — watching the Guesser play'
    if (mode === 'lan-join') return `Guessing ${opponentName}'s word`
    return `${playerName} vs ${opponentName}`
  }

  const wordGroups: { chars: { char: string; index: number }[]; isSpace: boolean }[] = []
  let currentGroup: { char: string; index: number }[] = []
  let globalIdx = 0
  for (let i = 0; i < displayWord.length; i++) {
    const ch = displayWord[i]
    if (ch === ' ') {
      if (currentGroup.length > 0) {
        wordGroups.push({ chars: currentGroup, isSpace: false })
        currentGroup = []
      }
      wordGroups.push({ chars: [], isSpace: true })
    } else {
      currentGroup.push({ char: ch, index: globalIdx })
    }
    globalIdx++
  }
  if (currentGroup.length > 0) {
    wordGroups.push({ chars: currentGroup, isSpace: false })
  }

  return (
    <div className="flex flex-col h-full bg-surface-800 text-white select-none overflow-hidden">
      <style>{`
        @keyframes hg-draw { to { stroke-dashoffset: 0; } }
        @keyframes hg-part-in {
          0%   { opacity: 0; transform: scale(0) rotate(-20deg); }
          65%  { opacity: 1; transform: scale(1.3) rotate(4deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes hg-shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-5px); }
          80%     { transform: translateX(5px); }
        }
        @keyframes hg-swing {
          0%,100% { transform: rotate(-7deg); }
          50%     { transform: rotate(7deg); }
        }
        @keyframes hg-danger-pulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.6; }
        }
        @keyframes hg-letter-reveal {
          0%   { transform: translateY(-18px) scale(0.5); opacity: 0; }
          65%  { transform: translateY(4px) scale(1.2); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes hg-letter-wave {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-14px); }
        }
        @keyframes hg-wrong-flash {
          0%,100% { background-color: transparent; }
          30%     { background-color: rgba(239,68,68,0.4); }
        }
        @keyframes hg-confetti-fall {
          0%   { transform: translate(0,0) rotate(0deg); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translate(var(--hg-dx, 0px), 550px) rotate(var(--hg-rot, 360deg)); opacity: 0; }
        }
        @keyframes hg-win-glow {
          0%,100% { text-shadow: 0 0 0px transparent; }
          50%     { text-shadow: 0 0 18px #4ade80; }
        }
        @keyframes hg-lose-reveal {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hg-card-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Confetti */}
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: `${p.x}vw`,
            top: '-20px',
            width: p.size,
            height: p.size * (p.id % 2 === 0 ? 2 : 1),
            backgroundColor: p.color,
            borderRadius: p.size > 10 ? '50%' : '2px',
            animation: `hg-confetti-fall ${p.duration}s ease-in forwards ${p.delay}s`,
            ['--hg-dx' as string]: p.dx,
            ['--hg-rot' as string]: p.rot,
            pointerEvents: 'none',
            zIndex: 50,
          } as React.CSSProperties}
        />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-surface-700/50 border-b border-white/5 shrink-0">
        <h1 className="text-lg font-bold tracking-widest text-white">HANGMAN</h1>
        <p className="text-gray-400 text-sm">{getStatusText()}</p>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg
            bg-surface-600 hover:bg-surface-500 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left column: figure + lives */}
        <div className="flex flex-col items-center justify-center w-64 shrink-0 p-4 border-r border-white/5">
          <div className="w-full" style={{ maxWidth: 200, aspectRatio: '220/240' }}>
            <HangmanFigure wrongCount={wrongCount} lost={gameState === 'lost'} won={gameState === 'won'} />
          </div>

          {/* Lives */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Lives left</p>
            <div className="flex gap-1.5 justify-center flex-wrap">
              {Array.from({ length: MAX_WRONG }, (_, i) => (
                <span
                  key={i}
                  className="text-lg transition-all duration-300"
                  style={{ filter: i < livesLeft ? 'none' : 'grayscale(1) opacity(0.3)' }}
                >
                  {i < livesLeft ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{livesLeft} / {MAX_WRONG} remaining</p>
          </div>

          {/* Wrong letters */}
          {wrongLetters.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Wrong guesses</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {wrongLetters.map(l => (
                  <span
                    key={l}
                    className="inline-block w-7 h-7 flex items-center justify-center
                      bg-red-900/40 border border-red-700/40 rounded-md
                      text-red-400 text-xs font-bold uppercase line-through"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: word + keyboard */}
        <div className="flex flex-col flex-1 items-center justify-center p-6 gap-6 overflow-hidden">
          {/* Word display */}
          <div
            className="flex flex-wrap gap-x-6 gap-y-4 justify-center items-end"
            style={{ animation: wrongFlash ? 'hg-wrong-flash 0.7s ease' : undefined }}
          >
            {wordGroups.map((group, gi) => {
              if (group.isSpace) {
                return <div key={`space-${gi}`} className="w-4" />
              }
              return (
                <div key={gi} className="flex gap-1.5">
                  {group.chars.map(({ char, index }) => {
                    const isRevealed = char !== '_'
                    const isLastRevealed = lastRevealedIndices.includes(index)
                    const isLostReveal = gameState === 'lost' && isRevealed && mode === 'lan-join'

                    let letterStyle: React.CSSProperties = {}
                    if (isLastRevealed) {
                      letterStyle = {
                        animation: 'hg-letter-reveal 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
                      }
                    } else if (gameState === 'won' && isRevealed) {
                      letterStyle = {
                        animation: `hg-letter-wave 0.6s ease-in-out ${index * 0.07}s`,
                        animationIterationCount: 3,
                        color: '#4ade80',
                      }
                    } else if (isLostReveal) {
                      letterStyle = {
                        animation: `hg-lose-reveal 0.3s ease ${index * 0.04}s both`,
                        color: '#ef4444',
                      }
                    } else if (gameState === 'lost' && isRevealed) {
                      letterStyle = { color: '#ef4444' }
                    }

                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center"
                        style={{ minWidth: '2rem' }}
                      >
                        <span
                          className="text-2xl font-bold font-mono leading-none h-8 flex items-center justify-center"
                          style={letterStyle}
                        >
                          {isRevealed ? char : ' '}
                        </span>
                        <div
                          className={`w-full h-0.5 mt-1 rounded-full ${
                            isRevealed ? 'bg-white/60' : 'bg-white/30'
                          }`}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Keyboard */}
          <div className="flex flex-col items-center gap-2 mt-2">
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1.5">
                {row.map(letter => {
                  const lower = letter.toLowerCase()
                  const isGuessed = guessedLetters.has(lower)
                  return (
                    <button
                      key={letter}
                      disabled={keyboardDisabled || isGuessed}
                      onClick={() => processGuessRef.current(lower)}
                      className={`w-9 h-10 rounded-lg text-sm font-bold uppercase
                        transition-all duration-150 border border-white/5
                        ${getKeyStyle(letter)}`}
                    >
                      {letter}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {mode === 'lan-host' && gameState === 'playing' && (
            <p className="text-gray-500 text-xs animate-pulse">
              Waiting for {opponentName} to guess…
            </p>
          )}
        </div>
      </div>

      {/* Game over overlay */}
      {gameState !== 'playing' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div
            className="bg-surface-700 border border-white/10 rounded-2xl p-8 shadow-2xl
              max-w-sm w-full mx-4 text-center"
            style={{ animation: 'hg-card-in 0.35s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}
          >
            <div className="text-6xl mb-4">{gameState === 'won' ? '🎉' : '💀'}</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {gameState === 'won'
                ? (mode === 'lan-host' ? 'They guessed it!' : 'You guessed it!')
                : (mode === 'lan-host' ? 'Your word stumped them!' : 'You lost!')}
            </h2>
            {gameState === 'lost' && mode !== 'lan-host' && (
              <p className="text-gray-400 text-sm mb-2">
                The word was:
              </p>
            )}
            {(gameState === 'lost' || gameState === 'won') && (word || revealedWord) && (
              <div
                className="font-mono text-xl font-bold tracking-widest mb-4 py-2 px-4
                  rounded-xl bg-surface-600 inline-block"
                style={{
                  color: gameState === 'won' ? '#4ade80' : '#ef4444',
                  animation: gameState === 'won' ? 'hg-win-glow 1.5s ease-in-out infinite' : undefined,
                }}
              >
                {(word || revealedWord).toUpperCase()}
              </div>
            )}
            {gameState === 'won' && mode === 'lan-host' && (
              <p className="text-gray-400 text-sm mb-4">
                {opponentName} guessed your word!
              </p>
            )}
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => onGameOver(gameState === 'won', word || revealedWord)}
                className="w-full bg-accent hover:bg-accent-light py-3 rounded-xl
                  text-white font-bold text-sm transition-colors shadow-lg shadow-accent/20"
              >
                Play Again
              </button>
              <button
                onClick={onBack}
                className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl
                  text-gray-300 text-sm font-medium transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
