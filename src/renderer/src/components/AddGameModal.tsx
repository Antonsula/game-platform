import { useState, useEffect } from 'react'
import type { Game, GamePayload } from '@shared/types'

const GENRES = [
  'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation',
  'Puzzle', 'Platformer', 'Shooter', 'Horror', 'Sports', 'Other'
]

interface Props {
  /** Pass a Game to edit, or null/undefined to add a new one */
  game?: Game | null
  onSave: (saved: Game) => void
  onClose: () => void
}

interface FormState {
  title: string
  description: string
  executablePath: string
  genre: string
  tempCoverPath: string
}

function toFileUrl(absPath: string): string {
  return 'file:///' + absPath.replace(/\\/g, '/')
}

export default function AddGameModal({ game, onSave, onClose }: Props) {
  const isEditing = !!game

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    executablePath: '',
    genre: '',
    tempCoverPath: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Populate form when editing an existing game
  useEffect(() => {
    if (game) {
      setForm({
        title: game.title,
        description: game.description,
        executablePath: game.executablePath,
        genre: game.genre,
        tempCoverPath: ''
      })
    }
  }, [game])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
  }

  async function pickExe() {
    const path = await window.api.dialog.openExe()
    if (path) set('executablePath', path)
  }

  async function pickImage() {
    const path = await window.api.dialog.openImage()
    if (path) set('tempCoverPath', path)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.title.trim()) return setError('Title is required.')
    if (!form.executablePath.trim()) return setError('Executable path is required.')

    setSaving(true)
    setError('')

    try {
      const payload: GamePayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        executablePath: form.executablePath.trim(),
        genre: form.genre.trim(),
        tempCoverPath: form.tempCoverPath,
        existingCoverPath: game?.coverPath ?? ''
      }

      let saved: Game
      if (isEditing && game) {
        saved = await window.api.games.update(game.id, payload)
      } else {
        saved = await window.api.games.add(payload)
      }

      onSave(saved)
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  // Preview: prefer newly picked temp path, fall back to existing saved cover
  const previewUrl = form.tempCoverPath
    ? toFileUrl(form.tempCoverPath)
    : game?.coverPath
    ? toFileUrl(game.coverPath)
    : null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-600 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-white font-bold text-base">
            {isEditing ? 'Edit Game' : 'Add Game'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Cover image picker */}
          <div className="flex gap-4 items-start">
            <button
              type="button"
              onClick={pickImage}
              className="w-24 h-32 rounded-xl bg-surface-700 border border-white/10 hover:border-accent/60 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-accent transition-colors overflow-hidden shrink-0"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-center px-1">Click to add cover</span>
                </>
              )}
            </button>

            <div className="flex-1 space-y-3">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. My Awesome Game"
                  className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition"
                />
              </div>

              {/* Genre */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Genre</label>
                <select
                  value={form.genre}
                  onChange={(e) => set('genre', e.target.value)}
                  className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/60 transition cursor-pointer"
                >
                  <option value="">Select genre…</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="A short description of the game…"
              rows={2}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition resize-none"
            />
          </div>

          {/* Executable path */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Executable (.exe) <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.executablePath}
                onChange={(e) => set('executablePath', e.target.value)}
                placeholder="C:\Games\MyGame\game.exe"
                className="flex-1 bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition font-mono text-xs"
              />
              <button
                type="button"
                onClick={pickExe}
                className="px-3 py-2 bg-surface-400 hover:bg-surface-300 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-colors whitespace-nowrap"
              >
                Browse…
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-accent hover:bg-accent-light disabled:opacity-60 px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
            >
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
