interface Props {
  nextPlayer: string
  onReady: () => void
}

export default function TurnTransition({ nextPlayer, onReady }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full bg-surface-900 select-none cursor-pointer"
      onClick={onReady}
    >
      <div className="text-center max-w-sm px-8 py-10 bg-surface-800 rounded-2xl border border-white/5 shadow-2xl">
        <div className="text-5xl mb-4">🚢</div>
        <h2 className="text-white text-2xl font-bold mb-2">Pass the device</h2>
        <p className="text-gray-400 text-sm mb-6">
          It&apos;s <span className="text-accent font-semibold">{nextPlayer}&apos;s</span> turn.
          <br />Make sure the previous player looks away!
        </p>
        <div className="bg-accent hover:bg-accent-light py-3 px-8 rounded-xl text-white font-bold
          text-sm transition-colors shadow-lg shadow-accent/20 inline-block">
          I&apos;m Ready →
        </div>
      </div>
    </div>
  )
}
