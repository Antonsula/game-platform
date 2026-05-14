type View = 'library'

interface Props {
  activeView: View
  onNavigate: (view: View) => void
}

const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: 'library',
    label: 'Library',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
      </svg>
    )
  }
]

export default function Sidebar({ activeView, onNavigate }: Props) {
  return (
    <aside className="w-56 bg-surface-900 border-r border-white/5 flex flex-col shrink-0">
      <div className="flex-1 py-4 px-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 px-3 mb-2">
          Navigation
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150 no-select
                  ${isActive
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="px-3 pb-4">
        <div className="rounded-lg bg-surface-700 p-3 text-xs text-gray-500">
          <p className="font-semibold text-gray-400 mb-1">Game Platform</p>
          <p>Add your games using the + button in the library.</p>
        </div>
      </div>
    </aside>
  )
}
