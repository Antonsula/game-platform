export default function TitleBar() {
  const { minimize, maximize, close } = window.api.window

  return (
    <div className="titlebar-drag flex items-center justify-between h-9 bg-surface-900 px-4 shrink-0 no-select">
      <div className="flex items-center gap-2">
        {/* App icon placeholder */}
        <div className="w-4 h-4 rounded bg-accent opacity-80" />
        <span className="text-xs text-gray-400 font-medium tracking-wide">Game Platform</span>
      </div>

      {/* Window controls */}
      <div className="titlebar-no-drag flex items-center">
        <button
          onClick={minimize}
          className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={maximize}
          className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Maximize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        <button
          onClick={close}
          className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 transition-colors"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  )
}
