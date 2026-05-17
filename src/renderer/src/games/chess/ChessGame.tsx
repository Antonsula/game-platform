import { useRef, useState, useEffect, useCallback } from 'react'
import { Chess } from 'chess.js'
import type { Square, PieceSymbol, Color } from 'chess.js'
import type { ChessConfig, TimeControl } from './types'
import ChessBoard from './ChessBoard'
import { capturedPieces, pairedHistory, gameResultText, materialDiff } from './engine'
import { getBestMove } from './ai'
import { addChessStats } from './statsStore'

// ---------------------------------------------------------------------------
// Clock helpers
// ---------------------------------------------------------------------------

function initClock(tc: TimeControl): number | null {
  return tc.type === 'none' ? null : tc.startSeconds * 1000
}

function formatTime(ms: number): string {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Captured pieces display
// ---------------------------------------------------------------------------

const PIECE_GLYPH: Record<string, string> = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛',
}

const PIECE_VALUE: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9,
}

function CapturedRow({ pieces, label }: { pieces: PieceSymbol[]; label: string }) {
  if (pieces.length === 0) return null
  const sorted = [...pieces].sort((a, b) => (PIECE_VALUE[b] ?? 0) - (PIECE_VALUE[a] ?? 0))
  const total  = sorted.reduce((s, p) => s + (PIECE_VALUE[p] ?? 0), 0)
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
      <span className="text-sm leading-none" style={{ fontFamily: 'Segoe UI Symbol, serif', color: '#9ca3af' }}>
        {sorted.map(p => PIECE_GLYPH[p] ?? '').join('')}
      </span>
      {total > 0 && <span className="text-xs text-gray-500">+{total}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Game over modal
// ---------------------------------------------------------------------------

interface GameOverState {
  text:   string
  winner: Color | null  // null = draw
}

function GameOverModal({
  state, whiteName, blackName, onRestart, onMenu, onBack,
}: {
  state:      GameOverState
  whiteName:  string
  blackName:  string
  onRestart?: () => void   // omit to hide the Play Again button (e.g. LAN mode)
  onMenu:     () => void
  onBack:     () => void
}) {
  const title = state.winner === null
    ? 'Draw!'
    : `${state.winner === 'w' ? whiteName : blackName} wins!`

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
      <div className="bg-surface-700 rounded-2xl p-8 border border-white/10 shadow-2xl text-center max-w-sm w-full mx-4">
        <div className="text-4xl mb-3">{state.winner === null ? '🤝' : '🏆'}</div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-400 text-sm mb-8">{state.text}</p>
        {onRestart && (
          <button onClick={onRestart}
            className="w-full bg-accent hover:bg-accent-light py-3 rounded-xl text-white font-bold
              text-sm transition-colors shadow-lg shadow-accent/20 mb-3">
            Play Again
          </button>
        )}
        <button onClick={onMenu}
          className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl text-gray-300
            text-sm font-medium transition-colors mb-2">
          Main Menu
        </button>
        <button onClick={onBack}
          className="w-full bg-surface-600 hover:bg-surface-500 py-2.5 rounded-xl text-gray-400
            text-sm transition-colors">
          Back to Library
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main game component
// ---------------------------------------------------------------------------

interface Props {
  config:    ChessConfig
  onMenu:    () => void
  onBack:    () => void
}

function stopLan() { window.api.net.offAll(); window.api.net.stop() }

export default function ChessGame({ config, onMenu: _onMenu, onBack: _onBack }: Props) {
  // Wrap navigation so the LAN WebSocket is torn down when leaving the game.
  // (Using config.mode directly — isLan is declared further down the function.)
  const onMenu = () => { if (config.mode === 'lan') stopLan(); _onMenu() }
  const onBack = () => { if (config.mode === 'lan') stopLan(); _onBack() }
  const chessRef   = useRef(new Chess())
  const [fen,      setFen]      = useState(chessRef.current.fen())
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [gameOver, setGameOver] = useState<GameOverState | null>(null)
  const [thinking, setThinking] = useState(false)
  const [restartKey, setRestartKey] = useState(0)

  // Clocks (null = no timer)
  const [wTime, setWTime] = useState<number | null>(() => initClock(config.timeControl))
  const [bTime, setBTime] = useState<number | null>(() => initClock(config.timeControl))

  // Premoves
  const [premove,    setPremove]    = useState<{ from: Square; to: Square } | null>(null)
  const [premoveMsg, setPremoveMsg] = useState<string | null>(null)

  // Last-move highlight toggle
  const [showLastMove, setShowLastMove] = useState(true)

  // Responsive board sizing
  const boardAreaRef = useRef<HTMLDivElement>(null)
  const [cellSize,  setCellSize] = useState(64)

  const chess     = chessRef.current
  const isLan     = config.mode === 'lan'
  const aiColor   = config.mode === 'vs-ai'
    ? (config.humanColor === 'w' ? 'b' : 'w') as Color
    : null

  // Perspective: human's colour in vs-ai/lan, always white in 1v1
  const perspective: Color = config.mode === 'vs-ai' || isLan ? config.humanColor : 'w'

  // True when it's the human's turn (always true in 1v1)
  const humanTurn = config.mode === '1v1' || chess.turn() === config.humanColor

  function bump() { setFen(chessRef.current.fen()) }

  // ── Increment helper ─────────────────────────────────────────────────────
  function addIncrement(movedColor: Color) {
    if (config.timeControl.type !== 'increment') return
    const inc = config.timeControl.incrementSeconds * 1000
    if (movedColor === 'w') setWTime(prev => prev !== null ? prev + inc : null)
    else                    setBTime(prev => prev !== null ? prev + inc : null)
  }

  // ── Game-over detection & stat save ──────────────────────────────────────
  const detectGameOver = useCallback(async () => {
    const c = chessRef.current
    if (!c.isGameOver()) return

    const text   = gameResultText(c, config.whiteName, config.blackName)
    const winner = c.isCheckmate() ? (c.turn() === 'w' ? 'b' : 'w') as Color : null
    setGameOver({ text, winner })

    // Save stats
    if (config.mode === 'vs-ai') {
      const humanColor = config.humanColor
      const result = winner === null ? 'draw' : winner === humanColor ? 'win' : 'loss'
      await addChessStats({
        playerName:   humanColor === 'w' ? config.whiteName : config.blackName,
        opponentName: 'Chess-master',
        mode:         'vs-ai',
        playerColor:  humanColor,
        result,
        date:         new Date().toISOString(),
      })
    } else {
      for (const color of ['w', 'b'] as Color[]) {
        await addChessStats({
          playerName:   color === 'w' ? config.whiteName : config.blackName,
          opponentName: color === 'w' ? config.blackName : config.whiteName,
          mode:         '1v1',
          playerColor:  color,
          result: winner === null ? 'draw' : winner === color ? 'win' : 'loss',
          date:   new Date().toISOString(),
        })
      }
    }
  }, [config])

  // ── LAN incoming messages ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isLan) return

    window.api.net.onMessage((msg: any) => {
      if (msg.type === 'chess:move') {
        try {
          chessRef.current.move({ from: msg.from, to: msg.to, promotion: msg.promotion ?? 'q' })
          const movedColor: Color = chessRef.current.turn() === 'w' ? 'b' : 'w'
          addIncrement(movedColor)
          setLastMove({ from: msg.from, to: msg.to })
          bump()
          detectGameOver()
        } catch { /* invalid move from peer – should not happen */ }
      }
      if (msg.type === 'chess:resign') {
        // Opponent resigned — we win
        const opponentColor: Color = config.humanColor === 'w' ? 'b' : 'w'
        const opponentName = opponentColor === 'w' ? config.whiteName : config.blackName
        setGameOver({ text: `${opponentName} resigned.`, winner: config.humanColor })
      }
    })

    window.api.net.onDisconnect(() => {
      setGameOver({ text: 'Opponent disconnected.', winner: config.humanColor })
    })

    // Only remove listeners on cleanup — never call stop() here.
    // React StrictMode runs cleanup+effect twice on mount; stop() would close
    // the live WebSocket before the second effect re-registers the handlers.
    return () => { window.api.net.offAll() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLan])

  // ── Human move ────────────────────────────────────────────────────────────
  function handleMove(from: Square, to: Square, promotion?: PieceSymbol) {
    if (gameOver) return
    try {
      chess.move({ from, to, ...(promotion ? { promotion } : {}) })
      const movedColor: Color = chess.turn() === 'w' ? 'b' : 'w'
      addIncrement(movedColor)
      setLastMove({ from, to })
      bump()
      detectGameOver()
      // Sync move to peer in LAN mode
      if (isLan) {
        window.api.net.send({ type: 'chess:move', from, to, promotion: promotion ?? 'q' })
      }
    } catch {
      // illegal move – ignore
    }
  }

  // ── AI move ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!aiColor) return
    if (gameOver) return
    if (chess.turn() !== aiColor) return

    setThinking(true)
    const t = setTimeout(() => {
      const move = getBestMove(chess.fen(), aiColor, config.difficulty)
      if (move) {
        chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' })
        const movedColor: Color = chess.turn() === 'w' ? 'b' : 'w'
        addIncrement(movedColor)
        setLastMove({ from: move.from as Square, to: move.to as Square })
        bump()
        detectGameOver()
      }
      setThinking(false)
    }, 350)

    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, restartKey])

  // ── Pre-move execution (vs-ai and LAN) ───────────────────────────────────
  useEffect(() => {
    if (!premove) return
    if (thinking) return
    if (gameOver) return
    if (chess.isGameOver()) return            // guard: opponent may have just won
    if (chess.turn() !== config.humanColor) return

    const pm = premove
    setPremove(null)

    try {
      chess.move({ from: pm.from, to: pm.to, promotion: 'q' })
      const movedColor: Color = chess.turn() === 'w' ? 'b' : 'w'
      addIncrement(movedColor)
      setLastMove({ from: pm.from, to: pm.to })
      bump()
      detectGameOver()
      if (isLan) {
        window.api.net.send({ type: 'chess:move', from: pm.from, to: pm.to, promotion: 'q' })
      }
    } catch {
      setPremoveMsg('Pre-move was illegal — discarded')
      setTimeout(() => setPremoveMsg(null), 2500)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, thinking])

  // ── Clock tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (config.timeControl.type === 'none') return
    if (gameOver) return
    if (thinking) return   // pause clocks during AI calculation

    const id = setInterval(() => {
      const turn = chessRef.current.turn()
      if (turn === 'w') {
        setWTime(prev => prev !== null ? Math.max(0, prev - 100) : null)
      } else {
        setBTime(prev => prev !== null ? Math.max(0, prev - 100) : null)
      }
    }, 100)

    return () => clearInterval(id)
  }, [fen, gameOver, thinking, config.timeControl.type])

  // ── Timeout detection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver) return
    if (wTime === 0) {
      setGameOver({ text: `${config.blackName} wins on time!`, winner: 'b' })
    } else if (bTime === 0) {
      setGameOver({ text: `${config.whiteName} wins on time!`, winner: 'w' })
    }
  }, [wTime, bTime, gameOver, config.whiteName, config.blackName])

  // ── Responsive board sizing ───────────────────────────────────────────────
  useEffect(() => {
    const el = boardAreaRef.current
    if (!el) return

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const size = Math.floor(Math.min(width - 28, height - 28) / 8)
        setCellSize(Math.max(48, Math.min(size, 96)))
      }
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Restart ───────────────────────────────────────────────────────────────
  function restart() {
    chessRef.current = new Chess()
    setFen(chessRef.current.fen())
    setLastMove(null)
    setGameOver(null)
    setThinking(false)
    setPremove(null)
    setPremoveMsg(null)
    setWTime(initClock(config.timeControl))
    setBTime(initClock(config.timeControl))
    setRestartKey(k => k + 1)
  }

  // ── Resign (LAN mode) ──────────────────────────────────────────────────────
  function resign() {
    window.api.net.send({ type: 'chess:resign' })
    const myName: string = config.humanColor === 'w' ? config.whiteName : config.blackName
    const opponentColor: Color = config.humanColor === 'w' ? 'b' : 'w'
    setGameOver({ text: `${myName} resigned.`, winner: opponentColor })
  }

  // ── Derived display data ──────────────────────────────────────────────────
  const { byWhite, byBlack } = capturedPieces(chess)
  const moveHistory           = pairedHistory(chess)
  const diff                  = materialDiff(chess)
  const turnName = chess.turn() === 'w' ? config.whiteName : config.blackName

  // Clock colour class
  function clockClass(ms: number | null) {
    if (ms === null) return ''
    if (ms < 10_000) return 'text-red-400'
    if (ms < 30_000) return 'text-orange-400'
    return 'text-gray-200'
  }

  return (
    <div className="flex flex-col h-full bg-surface-800 select-none overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
        <span className="text-white font-bold text-sm tracking-wide">CHESS</span>
        <span className="text-gray-400 text-xs">
          {gameOver ? gameOver.text
            : thinking ? `${config.blackName === 'Chess-master' && chess.turn() === 'b' ? 'Chess-master' : config.whiteName === 'Chess-master' && chess.turn() === 'w' ? 'Chess-master' : turnName} is thinking…`
            : chess.isCheck() ? `${turnName} is in check!`
            : `${turnName}'s turn`}
        </span>
        <button
          onClick={onMenu}
          className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
        >
          Menu
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden items-stretch gap-5 px-4 py-4">

        {/* Board area — fills remaining space, drives responsive sizing */}
        <div ref={boardAreaRef} className="flex flex-1 items-center justify-center min-w-0">
          <ChessBoard
            key={restartKey}
            chess={chess}
            perspective={perspective}
            disabled={!humanTurn || !!gameOver || thinking}
            lastMove={lastMove}
            onMove={handleMove}
            cellSize={cellSize}
            showLastMove={showLastMove}
            premovesEnabled={config.mode === 'vs-ai' || isLan}
            premove={premove}
            onPremoveChange={setPremove}
            humanColor={config.humanColor}
          />
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-3 w-52 shrink-0 overflow-hidden h-full">

          {/* Players + clocks */}
          <div className="bg-surface-700 rounded-xl p-3 border border-white/5 space-y-1.5">
            {([['w', config.whiteName, wTime], ['b', config.blackName, bTime]] as const).map(([color, name, clock]) => {
              const active = chess.turn() === color && !gameOver
              return (
                <div key={color}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                    active ? 'bg-accent/15' : ''
                  }`}
                >
                  <span className="text-lg leading-none">{color === 'w' ? '♔' : '♚'}</span>
                  <span className={`text-sm font-medium truncate flex-1 ${active ? 'text-white' : 'text-gray-400'}`}>
                    {name}
                  </span>
                  {clock !== null && (
                    <span className={`font-mono text-sm font-bold tabular-nums shrink-0 ${clockClass(clock)}`}>
                      {formatTime(clock)}
                    </span>
                  )}
                  {clock === null && active && !gameOver && !thinking && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shrink-0 animate-pulse" />
                  )}
                </div>
              )
            })}
            {diff !== 0 && (
              <p className="text-xs text-gray-500 text-center pt-1">
                {diff > 0 ? `White +${diff}` : `Black +${Math.abs(diff)}`}
              </p>
            )}
          </div>

          {/* Premove status */}
          {(config.mode === 'vs-ai' || isLan) && (
            <div className="space-y-1.5">
              {premove && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-1.5">
                  <span className="text-red-300 text-xs flex-1">
                    Pre-move: {premove.from} → {premove.to}
                  </span>
                  <button
                    onClick={() => setPremove(null)}
                    className="text-red-400 hover:text-white text-xs transition-colors"
                    title="Cancel pre-move"
                  >
                    ✕
                  </button>
                </div>
              )}
              {premoveMsg && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-1.5 text-xs text-red-300">
                  {premoveMsg}
                </div>
              )}
              {!premove && !premoveMsg && !humanTurn && !gameOver && (
                <p className="text-xs text-gray-600 text-center">Click a piece to pre-move</p>
              )}
            </div>
          )}

          {/* Captured pieces */}
          <div className="bg-surface-700 rounded-xl p-3 border border-white/5 space-y-1.5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Captured</p>
            <CapturedRow pieces={byWhite} label="White" />
            <CapturedRow pieces={byBlack} label="Black" />
            {byWhite.length === 0 && byBlack.length === 0 && (
              <p className="text-xs text-gray-600">No captures yet</p>
            )}
          </div>

          {/* Move history */}
          <div className="bg-surface-700 rounded-xl p-3 border border-white/5 flex flex-col min-h-0 flex-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 shrink-0">
              Moves
            </p>
            <div className="overflow-y-auto flex-1 space-y-0.5 pr-1">
              {moveHistory.length === 0 && (
                <p className="text-xs text-gray-600">Game not started</p>
              )}
              {moveHistory.map(({ num, white, black }) => (
                <div key={num} className="flex items-center gap-1 text-xs">
                  <span className="text-gray-600 w-6 shrink-0">{num}.</span>
                  <span className="text-gray-300 w-14 font-mono">{white}</span>
                  <span className="text-gray-400 font-mono">{black}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Show last move toggle */}
            <button
              onClick={() => setShowLastMove(v => !v)}
              className={`py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                showLastMove
                  ? 'bg-yellow-700/30 border-yellow-600/30 text-yellow-300 hover:bg-yellow-700/50'
                  : 'bg-surface-600 border-white/5 text-gray-500 hover:text-gray-300'
              }`}
            >
              {showLastMove ? 'Last Move: ON' : 'Last Move: OFF'}
            </button>

            {/* Restart / Resign */}
            {isLan ? (
              <button
                onClick={resign}
                disabled={!!gameOver}
                className="bg-red-900/40 hover:bg-red-900/70 py-2 rounded-xl text-red-300 text-sm
                  font-medium transition-colors border border-red-700/30 disabled:opacity-40"
              >
                Resign
              </button>
            ) : (
              <button
                onClick={restart}
                className="bg-surface-600 hover:bg-surface-500 py-2 rounded-xl text-gray-300 text-sm
                  font-medium transition-colors border border-white/5"
              >
                Restart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Game over overlay */}
      {gameOver && (
        <GameOverModal
          state={gameOver}
          whiteName={config.whiteName}
          blackName={config.blackName}
          onRestart={isLan ? undefined : restart}
          onMenu={onMenu}
          onBack={onBack}
        />
      )}
    </div>
  )
}
