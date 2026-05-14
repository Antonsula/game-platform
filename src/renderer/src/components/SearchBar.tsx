interface Props {
  query: string
  genre: string
  genres: string[]
  onQueryChange: (q: string) => void
  onGenreChange: (g: string) => void
}

export default function SearchBar({ query, genre, genres, onQueryChange, onGenreChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1 max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          placeholder="Search games…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full bg-surface-600 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition"
        />
      </div>

      {/* Genre filter */}
      <select
        value={genre}
        onChange={(e) => onGenreChange(e.target.value)}
        className="bg-surface-600 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/60 transition cursor-pointer"
      >
        <option value="">All genres</option>
        {genres.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </div>
  )
}
