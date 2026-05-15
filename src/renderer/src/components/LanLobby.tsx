import { useState, useEffect, useRef } from 'react'

interface Props {
  gameName:    string
  onConnected: (role: 'host' | 'join') => void
  onCancel:    () => void
}

type Step = 'choose' | 'hosting' | 'joining'

export default function LanLobby({ gameName, onConnected, onCancel }: Props) {
  const [step,       setStep]       = useState<Step>('choose')
  const [address,    setAddress]    = useState('')        // "192.168.x.x:port" shown to host
  const [joinInput,  setJoinInput]  = useState('')        // typed by joiner
  const [error,      setError]      = useState('')
  const [busy,       setBusy]       = useState(false)
  const cancelledRef = useRef(false)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true
      window.api.net.offAll()
    }
  }, [])

  // ── Host ──────────────────────────────────────────────────────────────────
  async function startHost() {
    setStep('hosting')
    setError('')
    cancelledRef.current = false
    try {
      const { ip, port } = await window.api.net.host()
      if (cancelledRef.current) return
      setAddress(`${ip}:${port}`)

      window.api.net.onPeerConnect(() => {
        if (cancelledRef.current) return
        window.api.net.offAll()
        onConnected('host')
      })
    } catch (e) {
      setError(`Could not start server: ${e}`)
      setStep('choose')
    }
  }

  // ── Join ──────────────────────────────────────────────────────────────────
  async function startJoin() {
    setError('')
    const trimmed = joinInput.trim()
    const match   = trimmed.match(/^(.+):(\d+)$/)
    if (!match) { setError('Enter address as  IP : PORT  (e.g. 192.168.1.5:51234)'); return }

    const ip   = match[1]
    const port = parseInt(match[2], 10)
    setBusy(true)
    try {
      await window.api.net.join(ip, port)
      if (cancelledRef.current) return
      window.api.net.offAll()
      onConnected('join')
    } catch (e) {
      setError(`Could not connect: ${e}`)
      setBusy(false)
    }
  }

  // ── Cancel ────────────────────────────────────────────────────────────────
  function cancel() {
    cancelledRef.current = true
    window.api.net.offAll()
    window.api.net.stop()
    setStep('choose')
    setBusy(false)
    setError('')
    onCancel()
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  if (step === 'choose') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          LAN — {gameName}
        </p>
        <p className="text-gray-500 text-xs">
          Both machines must be on the same Wi-Fi / network.
          One player hosts, the other joins using the displayed address.
        </p>

        <div className="flex gap-2">
          <button
            onClick={startHost}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-accent
              text-white hover:bg-accent-light transition-colors"
          >
            🖥 Host Game
          </button>
          <button
            onClick={() => { setStep('joining'); setError('') }}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-surface-600
              text-gray-300 hover:text-white transition-colors"
          >
            🔗 Join Game
          </button>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          onClick={onCancel}
          className="w-full py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300
            transition-colors"
        >
          ← Back
        </button>
      </div>
    )
  }

  if (step === 'hosting') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          Hosting — waiting for opponent…
        </p>

        {address ? (
          <>
            <p className="text-gray-400 text-xs">Share this address with your opponent:</p>
            <div className="bg-surface-600 rounded-xl px-4 py-3 text-center">
              <span className="text-white font-mono text-lg font-bold tracking-wider">
                {address}
              </span>
            </div>
            <p className="text-gray-600 text-xs text-center animate-pulse">
              Waiting for connection…
            </p>
          </>
        ) : (
          <p className="text-gray-500 text-xs animate-pulse">Starting server…</p>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          onClick={cancel}
          className="w-full py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300
            transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  // step === 'joining'
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
        Join — enter host address
      </p>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Host address (IP:Port)</label>
        <input
          className="w-full bg-surface-600 border border-white/10 rounded-lg px-3 py-2
            text-white text-sm font-mono placeholder:text-gray-600
            focus:outline-none focus:border-accent/60"
          value={joinInput}
          onChange={e => setJoinInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !busy && startJoin()}
          placeholder="192.168.1.5:51234"
          autoFocus
          disabled={busy}
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        onClick={startJoin}
        disabled={busy || !joinInput.trim()}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
          busy || !joinInput.trim()
            ? 'bg-surface-500 text-gray-600 cursor-not-allowed'
            : 'bg-accent hover:bg-accent-light text-white'
        }`}
      >
        {busy ? 'Connecting…' : 'Connect'}
      </button>

      <button
        onClick={() => { setStep('choose'); setError(''); setBusy(false) }}
        disabled={busy}
        className="w-full py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300
          transition-colors"
      >
        ← Back
      </button>
    </div>
  )
}
