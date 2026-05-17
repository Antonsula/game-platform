import { useState } from 'react'
import type { ChessConfig, ChessGameMode, ChessDifficulty, ChessPieceColor, TimeControl } from './types'
import { TIME_PRESETS } from './types'
import LanLobby from '../../components/LanLobby'

interface Props {
  onStart: (config: ChessConfig) => void
  onBack:  () => void
}

export default function ChessMenu({ onStart, onBack }: Props) {
  const [mode,               setMode]               = useState<ChessGameMode>('vs-ai')
  const [showLobby,          setShowLobby]          = useState(false)
  const [waitingForConfig,   setWaitingForConfig]   = useState(false)
  const [playerName,         setPlayerName]         = useState('Player')
  const [whiteName,          setWhiteName]          = useState('White')
  const [blackName,          setBlackName]          = useState('Black')
  const [lanName,            setLanName]            = useState('Player')
  const [humanColor,         setHumanColor]         = useState<ChessPieceColor>('w')
  const [difficulty,         setDifficulty]         = useState<ChessDifficulty>('medium')
  const [timeControl,        setTimeControl]        = useState<TimeControl>(TIME_PRESETS[0].value)

  function handleModeChange(m: ChessGameMode) {
    setMode(m)
    setShowLobby(false)
    setWaitingForConfig(false)
  }

  function handleStart() {
    if (mode === '1v1') {
      onStart({
        mode:        '1v1',
        whiteName:   whiteName.trim()  || 'White',
        blackName:   blackName.trim()  || 'Black',
        humanColor:  'w',
        difficulty,
        timeControl,
      })
    } else if (mode === 'vs-ai') {
      const pName = playerName.trim() || 'Player'
      onStart({
        mode:       'vs-ai',
        whiteName:  humanColor === 'w' ? pName : 'Chess-master',
        blackName:  humanColor === 'b' ? pName : 'Chess-master',
        humanColor,
        difficulty,
        timeControl,
      })
    }
  }

  function handleLanConnected(role: 'host' | 'join') {
    const name  = lanName.trim() || 'Player'
    const color: ChessPieceColor = role === 'host' ? 'w' : 'b'

    if (role === 'host') {
      // Host is authoritative — broadcast our time control to the joiner first,
      // then start immediately with our own settings.
      window.api.net.send({ type: 'chess:config', timeControl })
      onStart({
        mode:       'lan',
        whiteName:  name,
        blackName:  'Opponent',
        humanColor: color,
        difficulty: 'medium',
        timeControl,
        lanRole:    role,
      })
    } else {
      // Joiner: close the lobby UI and wait for the host's config message.
      // The host sends it immediately after connecting, so this is very brief.
      setShowLobby(false)
      setWaitingForConfig(true)

      window.api.net.onMessage((msg: any) => {
        if (msg.type !== 'chess:config') return
        window.api.net.offAll()
        onStart({
          mode:        'lan',
          whiteName:   'Opponent',
          blackName:   name,
          humanColor:  color,
          difficulty:  'medium',
          timeControl: msg.timeControl as TimeControl,
          lanRole:     role,
        })
      })

      window.api.net.onDisconnect(() => {
        window.api.net.offAll()
        window.api.net.stop()
        setWaitingForConfig(false)
      })
    }
  }

  const difficultyColors: Record<ChessDifficulty, string> = {
    easy:   'bg-green-600 hover:bg-green-500',
    medium: 'bg-yellow-600 hover:bg-yellow-500',
    hard:   'bg-red-700   hover:bg-red-600',
  }

  // Identify which preset is currently selected (compare by value)
  function isTCSelected(tc: TimeControl): boolean {
    if (tc.type !== timeControl.type) return false
    if (tc.type === 'none') return true
    if (tc.type === 'fixed' && timeControl.type === 'fixed')
      return tc.startSeconds === timeControl.startSeconds
    if (tc.type === 'increment' && timeControl.type === 'increment')
      return tc.startSeconds === timeControl.startSeconds &&
             tc.incrementSeconds === timeControl.incrementSeconds
    return false
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none overflow-y-auto py-6">
      <div className="w-full max-w-sm bg-surface-700 rounded-2xl p-8 shadow-2xl border border-white/5">

        <h1 className="text-3xl font-bold text-white text-center mb-1 tracking-tight">CHESS</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Classic strategy game</p>

        {/* Mode */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Game Mode</p>
          <div className="flex gap-2">
            {([
              ['vs-ai', 'vs AI'],
              ['1v1',   'Local 1v1'],
              ['lan',   '🌐 LAN'],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'bg-accent text-white shadow-lg shadow-accent/30'
                    : 'bg-surface-600 text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Player names */}
        {mode !== 'lan' && (
          <div className="mb-6 space-y-3">
            {mode === 'vs-ai' ? (
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
                  Your Name
                </label>
                <input
                  className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2
                    text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-accent/60"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStart()}
                  maxLength={20}
                  placeholder="Player"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
                    ♔ White Player
                  </label>
                  <input
                    className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2
                      text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-accent/60"
                    value={whiteName}
                    onChange={e => setWhiteName(e.target.value)}
                    maxLength={20}
                    placeholder="White"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
                    ♚ Black Player
                  </label>
                  <input
                    className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2
                      text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-accent/60"
                    value={blackName}
                    onChange={e => setBlackName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStart()}
                    maxLength={20}
                    placeholder="Black"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* LAN section */}
        {mode === 'lan' && !showLobby && !waitingForConfig && (
          <div className="mb-6 space-y-3">
            <div>
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
            <p className="text-gray-500 text-xs">
              Host plays ♔ White • Joiner plays ♚ Black
            </p>
          </div>
        )}

        {mode === 'lan' && showLobby && (
          <div className="mb-6 bg-surface-600/50 rounded-xl p-4 border border-white/5">
            <LanLobby
              gameName="Chess"
              onConnected={handleLanConnected}
              onCancel={() => setShowLobby(false)}
            />
          </div>
        )}

        {/* Joiner waiting for host's config */}
        {mode === 'lan' && waitingForConfig && (
          <div className="mb-6 bg-surface-600/50 rounded-xl p-4 border border-white/5 space-y-3 text-center">
            <p className="text-gray-300 text-sm font-medium animate-pulse">
              Waiting for host settings…
            </p>
            <p className="text-gray-500 text-xs">The host's time control will be used</p>
            <button
              onClick={() => {
                window.api.net.offAll()
                window.api.net.stop()
                setWaitingForConfig(false)
              }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Play-as (vs-ai only) */}
        {mode === 'vs-ai' && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Play As</p>
            <div className="flex gap-2">
              {([['w', '♔ White'], ['b', '♚ Black']] as const).map(([c, label]) => (
                <button
                  key={c}
                  onClick={() => setHumanColor(c)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    humanColor === c
                      ? 'bg-accent text-white shadow-lg shadow-accent/30'
                      : 'bg-surface-600 text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty */}
        {mode === 'vs-ai' && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Difficulty</p>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                    difficulty === d
                      ? `${difficultyColors[d]} text-white shadow-lg`
                      : 'bg-surface-600 text-gray-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time control — host picks it in LAN; joiner's selection is overridden */}
        {!waitingForConfig && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Time Control</p>
              {mode === 'lan' && (
                <span className="text-xs text-gray-600">(host decides)</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {TIME_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setTimeControl(preset.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isTCSelected(preset.value)
                      ? 'bg-accent text-white shadow-lg shadow-accent/30'
                      : 'bg-surface-600 text-gray-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode !== 'lan' && (
          <button
            onClick={handleStart}
            className="w-full bg-accent hover:bg-accent-light py-3 rounded-xl text-white font-bold
              text-sm transition-colors shadow-lg shadow-accent/20 mb-3"
          >
            Start Game
          </button>
        )}

        {mode === 'lan' && !showLobby && !waitingForConfig && (
          <button
            onClick={() => setShowLobby(true)}
            disabled={!lanName.trim()}
            className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-colors
              shadow-lg mb-3 ${lanName.trim()
                ? 'bg-accent hover:bg-accent-light shadow-accent/20'
                : 'bg-surface-500 text-gray-600 cursor-not-allowed'}`}
          >
            Connect…
          </button>
        )}

        {!showLobby && !waitingForConfig && (
          <button
            onClick={onBack}
            className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl text-gray-300
              text-sm font-medium transition-colors"
          >
            Back to Library
          </button>
        )}
      </div>
    </div>
  )
}
