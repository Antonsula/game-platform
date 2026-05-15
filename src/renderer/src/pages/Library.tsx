import { useState, useEffect, useMemo } from 'react'
import type { Game } from '@shared/types'
import GameCard    from '../components/GameCard'
import EmptyState  from '../components/EmptyState'
import SearchBar   from '../components/SearchBar'
import AddGameModal from '../components/AddGameModal'

interface Props {
  /** Called when the user clicks Play on a built-in game (e.g. "snake"). */
  onPlayBuiltIn?: (builtInId: string) => void
}

const READONLY = import.meta.env.VITE_READONLY === 'true'

export default function Library({ onPlayBuiltIn }: Props) {
  const [games,       setGames]       = useState<Game[]>([])
  const [loading,     setLoading]     = useState(true)
  const [query,       setQuery]       = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [showModal,   setShowModal]   = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [launchError, setLaunchError] = useState('')

  useEffect(() => {
    window.api.games.getAll().then(g => {
      setGames(g)
      setLoading(false)
    })
  }, [])

  const genres = useMemo(() => {
    const set = new Set(games.map(g => g.genre).filter(Boolean))
    return Array.from(set).sort()
  }, [games])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return games.filter(g => {
      const matchesQuery =
        !q || g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
      const matchesGenre = !genreFilter || g.genre === genreFilter
      return matchesQuery && matchesGenre
    })
  }, [games, query, genreFilter])

  async function handlePlay(id: string) {
    setLaunchError('')
    const game = games.find(g => g.id === id)
    if (!game) return

    // Built-in games are rendered inside the app — no external process needed.
    if (game.executablePath.startsWith('builtin://')) {
      const builtInId = game.executablePath.replace('builtin://', '')
      // Update last-played locally so the card reflects the play
      setGames(prev =>
        prev.map(g => g.id === id ? { ...g, lastPlayed: new Date().toISOString() } : g)
      )
      onPlayBuiltIn?.(builtInId)
      return
    }

    // External .exe game
    const result = await window.api.games.launch(id)
    if (!result.success) {
      setLaunchError(result.error ?? 'Failed to launch game.')
    } else {
      setGames(prev =>
        prev.map(g => g.id === id ? { ...g, lastPlayed: new Date().toISOString() } : g)
      )
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this game from your library?')) return
    await window.api.games.remove(id)
    setGames(prev => prev.filter(g => g.id !== id))
  }

  function handleSaved(saved: Game) {
    setGames(prev => {
      const exists = prev.some(g => g.id === saved.id)
      return exists ? prev.map(g => g.id === saved.id ? saved : g) : [...prev, saved]
    })
    setShowModal(false)
    setEditingGame(null)
  }

  function openAdd()           { setEditingGame(null); setShowModal(true) }
  function openEdit(g: Game)   { setEditingGame(g);    setShowModal(true) }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-800">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-bold text-lg no-select">Library</h1>
          {games.length > 0 && (
            <span className="text-xs text-gray-500 bg-surface-600 px-2 py-0.5 rounded-full">
              {games.length} game{games.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <SearchBar
            query={query}
            genre={genreFilter}
            genres={genres}
            onQueryChange={setQuery}
            onGenreChange={setGenreFilter}
          />
          {!READONLY && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-accent hover:bg-accent-light px-4 py-2 rounded-lg
                text-white text-sm font-semibold transition-colors shadow-lg shadow-accent/20 shrink-0 no-select"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd" />
              </svg>
              Add Game
            </button>
          )}
        </div>
      </div>

      {/* Launch error banner */}
      {launchError && (
        <div className="mx-6 mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-red-400 text-xs font-medium">Launch failed</p>
            <p className="text-red-300/70 text-xs mt-0.5">{launchError}</p>
          </div>
          <button
            onClick={() => setLaunchError('')}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Game grid */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {games.length === 0 ? (
          <EmptyState onAdd={READONLY ? undefined : openAdd} />
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={READONLY ? undefined : openAdd} isFiltered />
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
          >
            {filtered.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                style={{ animationDelay: `${i * 40}ms` }}
                onPlay={()   => handlePlay(game.id)}
                onEdit={READONLY ? undefined : () => openEdit(game)}
                onDelete={READONLY ? undefined : () => handleDelete(game.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit modal — suppressed in play mode */}
      {!READONLY && showModal && (
        <AddGameModal
          game={editingGame}
          onSave={handleSaved}
          onClose={() => { setShowModal(false); setEditingGame(null) }}
        />
      )}
    </div>
  )
}
