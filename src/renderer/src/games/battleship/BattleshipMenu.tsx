import { useState } from 'react'
import LanLobby from '../../components/LanLobby'

interface Props {
  onStart:    (mode: '1p' | '2p', p1Name: string, p2Name: string) => void
  onStartLan: (role: 'host' | 'join', myName: string) => void
  onBack:     () => void
}

type Mode = '1p' | '2p' | 'lan'

export default function BattleshipMenu({ onStart, onStartLan, onBack }: Props) {
  const [mode,     setMode]    = useState<Mode>('1p')
  const [p1Name,   setP1Name]  = useState('Admiral')
  const [p2Name,   setP2Name]  = useState('Captain')
  const [lanName,  setLanName] = useState('Admiral')
  const [showLobby, setShowLobby] = useState(false)

  function handleModeChange(m: Mode) {
    setMode(m)
    setShowLobby(false)
  }

  function handleStart() {
    const n1 = p1Name.trim() || 'Admiral'
    const n2 = mode === '2p' ? (p2Name.trim() || 'Captain') : 'AI'
    onStart(mode as '1p' | '2p', n1, n2)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-surface-800 select-none">
      <div className="w-full max-w-sm bg-surface-700 rounded-2xl p-8 shadow-2xl border border-white/5">

        <h1 className="text-3xl font-bold text-white text-center mb-1 tracking-tight">BATTLESHIP</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Naval combat strategy game</p>

        {/* Mode toggle */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Game Mode</p>
          <div className="flex gap-2">
            {([
              ['1p',  'vs AI'],
              ['2p',  'Local 2P'],
              ['lan', '🌐 LAN'],
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

        {/* Player names (non-LAN) */}
        {mode !== 'lan' && (
          <div className="mb-6 space-y-3">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
                {mode === '2p' ? 'Player 1 Name' : 'Your Name'}
              </label>
              <input
                className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2
                  text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-accent/60"
                value={p1Name}
                onChange={e => setP1Name(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                maxLength={20}
                placeholder="Admiral"
              />
            </div>
            {mode === '2p' && (
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
                  Player 2 Name
                </label>
                <input
                  className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2
                    text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-accent/60"
                  value={p2Name}
                  onChange={e => setP2Name(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStart()}
                  maxLength={20}
                  placeholder="Captain"
                />
              </div>
            )}
          </div>
        )}

        {/* LAN name + lobby */}
        {mode === 'lan' && !showLobby && (
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
                placeholder="Admiral"
                autoFocus
              />
            </div>
            <p className="text-gray-500 text-xs">
              Both players place their fleets independently on their own machines.
            </p>
          </div>
        )}

        {mode === 'lan' && showLobby && (
          <div className="mb-6 bg-surface-600/50 rounded-xl p-4 border border-white/5">
            <LanLobby
              gameName="Battleship"
              onConnected={role => onStartLan(role, lanName.trim() || 'Admiral')}
              onCancel={() => setShowLobby(false)}
            />
          </div>
        )}

        {/* Start / Connect button */}
        {mode !== 'lan' && (
          <button
            onClick={handleStart}
            className="w-full bg-accent hover:bg-accent-light py-3 rounded-xl text-white font-bold
              text-sm transition-colors shadow-lg shadow-accent/20 mb-3"
          >
            Place Ships
          </button>
        )}

        {mode === 'lan' && !showLobby && (
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

        {!showLobby && (
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
