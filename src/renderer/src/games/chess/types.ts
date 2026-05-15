import type { ChessGameMode, ChessDifficulty, ChessPieceColor } from '@shared/types'

export type { ChessGameMode, ChessDifficulty, ChessPieceColor }

// ---------------------------------------------------------------------------
// Time controls
// ---------------------------------------------------------------------------

export interface TCNone        { type: 'none' }
export interface TCFixed       { type: 'fixed';     startSeconds: number }
export interface TCIncrement   { type: 'increment'; startSeconds: number; incrementSeconds: number }
export type TimeControl = TCNone | TCFixed | TCIncrement

export interface TimeControlPreset {
  label: string
  value: TimeControl
}

export const TIME_PRESETS: TimeControlPreset[] = [
  { label: 'No timer',   value: { type: 'none' } },
  { label: '10 min',     value: { type: 'fixed',     startSeconds: 600 } },
  { label: '3 min',      value: { type: 'fixed',     startSeconds: 180 } },
  { label: 'Bullet 1+1', value: { type: 'increment', startSeconds: 60,  incrementSeconds: 1 } },
  { label: 'Bullet 2+1', value: { type: 'increment', startSeconds: 120, incrementSeconds: 1 } },
]

// ---------------------------------------------------------------------------
// Game config
// ---------------------------------------------------------------------------

export interface ChessConfig {
  mode:        ChessGameMode
  whiteName:   string
  blackName:   string
  /** Which side the human controls (vs-ai and lan modes) */
  humanColor:  ChessPieceColor
  difficulty:  ChessDifficulty
  timeControl: TimeControl
  /** LAN mode only — 'host' plays White, 'join' plays Black */
  lanRole?:    'host' | 'join'
}
