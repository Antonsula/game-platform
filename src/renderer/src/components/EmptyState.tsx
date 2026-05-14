interface Props {
  onAdd: () => void
  isFiltered?: boolean
}

export default function EmptyState({ onAdd, isFiltered }: Props) {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-16 h-16 rounded-full bg-surface-600 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-white font-semibold text-lg mb-1">No games found</h3>
        <p className="text-gray-500 text-sm">Try a different search term or genre filter.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-24 h-24 rounded-2xl bg-surface-600 border border-white/5 flex items-center justify-center mb-6 shadow-xl">
        <svg className="w-12 h-12 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a14.95 14.95 0 006.16-12.12A14.95 14.95 0 009.1 2.25c-5.79 0-10.6 4.09-11.8 9.55m11.8-9.55v4.82m0 12.56v-4.82m0 4.82v-.01" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25l-3.75-3.75m0 0L12 6.75m-3.75 3.75H18" />
        </svg>
      </div>
      <h3 className="text-white font-bold text-xl mb-2">Your library is empty</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        Add your first game to get started. You can browse for any Windows executable.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 bg-accent hover:bg-accent-light px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Add Game
      </button>
    </div>
  )
}
