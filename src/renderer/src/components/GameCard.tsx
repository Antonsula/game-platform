import { useState } from 'react'
import type { Game } from '@shared/types'

interface Props {
  game: Game
  onPlay: () => void
  onEdit?: () => void
  onDelete?: () => void
  style?: React.CSSProperties
}

function formatLastPlayed(iso: string | null): string {
  if (!iso) return 'Never played'
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Played today'
  if (diffDays === 1) return 'Played yesterday'
  if (diffDays < 7) return `Played ${diffDays}d ago`
  return `Played ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

/** Convert an absolute Windows path to a file:// URL safe to use in img src */
function toFileUrl(absPath: string): string {
  return 'file:///' + absPath.replace(/\\/g, '/')
}

export default function GameCard({ game, onPlay, onEdit, onDelete, style }: Props) {
  const [imgError, setImgError] = useState(false)
  const [launching, setLaunching] = useState(false)

  const handlePlay = async () => {
    setLaunching(true)
    await onPlay()
    setTimeout(() => setLaunching(false), 1500)
  }

  const hasCover = game.coverPath && !imgError

  return (
    <div
      style={style}
      className="group relative bg-surface-500 rounded-xl overflow-hidden border border-white/5 card-glow transition-all duration-200 animate-fade-up flex flex-col"
    >
      {/* Cover image area */}
      <div className="relative w-full aspect-[3/4] bg-surface-600 overflow-hidden">
        {hasCover ? (
          <img
            src={toFileUrl(game.coverPath)}
            alt={game.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Hover overlay with edit/delete — hidden when both handlers are absent */}
        {(onEdit || onDelete) && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2 gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="titlebar-no-drag p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Edit game"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="titlebar-no-drag p-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                title="Remove game"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Genre badge */}
        {game.genre && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-black/60 text-gray-300 backdrop-blur-sm border border-white/10">
              {game.genre}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="text-white font-semibold text-sm leading-tight line-clamp-1" title={game.title}>
            {game.title}
          </h3>
          {game.description && (
            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{game.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-gray-600 text-xs">{formatLastPlayed(game.lastPlayed)}</span>

          <button
            onClick={handlePlay}
            disabled={launching}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-light disabled:opacity-60 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors shadow-md shadow-accent/20 no-select"
          >
            {launching ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Launching…
              </>
            ) : (
              <>
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Play
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
