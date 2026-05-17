import { useState, useRef, useEffect } from 'react'

interface Props {
  wrongCount: number
  lost: boolean
  won: boolean
}

export default function HangmanFigure({ wrongCount, lost, won }: Props) {
  const prevCountRef = useRef(wrongCount)
  const [animParts, setAnimParts] = useState<Set<number>>(new Set())
  const [shaking, setShaking] = useState(false)

  useEffect(() => {
    if (wrongCount > prevCountRef.current) {
      const newPart = wrongCount - 1
      setAnimParts(prev => new Set([...prev, newPart]))
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 600)
      prevCountRef.current = wrongCount
      return () => clearTimeout(t)
    }
    prevCountRef.current = wrongCount
  }, [wrongCount])

  const figureColor = lost ? '#ef4444' : won ? '#4ade80' : '#e2e8f0'

  const gallowsStroke = '#4b5563'

  // Gallows pieces: [x1,y1,x2,y2, length, delay]
  const gallowsPieces = [
    { x1: 20,  y1: 225, x2: 200, y2: 225, len: 180, delay: '0.05s' },
    { x1: 60,  y1: 225, x2: 60,  y2: 15,  len: 210, delay: '0.45s' },
    { x1: 60,  y1: 65,  x2: 105, y2: 15,  len: 67,  delay: '0.75s' },
    { x1: 60,  y1: 15,  x2: 155, y2: 15,  len: 95,  delay: '0.9s'  },
    { x1: 155, y1: 15,  x2: 155, y2: 46,  len: 31,  delay: '1.15s' },
  ]

  const bodyParts = [
    // 0 - head
    <circle key={0} cx="155" cy="64" r="18" fill="none" strokeWidth="3.5" />,
    // 1 - body
    <line key={1} x1="155" y1="82" x2="155" y2="137" strokeWidth="3.5" strokeLinecap="round" />,
    // 2 - left arm
    <line key={2} x1="155" y1="98" x2="126" y2="122" strokeWidth="3.5" strokeLinecap="round" />,
    // 3 - right arm
    <line key={3} x1="155" y1="98" x2="184" y2="122" strokeWidth="3.5" strokeLinecap="round" />,
    // 4 - left leg
    <line key={4} x1="155" y1="137" x2="126" y2="168" strokeWidth="3.5" strokeLinecap="round" />,
    // 5 - right leg
    <line key={5} x1="155" y1="137" x2="184" y2="168" strokeWidth="3.5" strokeLinecap="round" />,
  ]

  function getFigureStyle(): React.CSSProperties {
    const base: React.CSSProperties = {
      transformBox: 'fill-box',
      transformOrigin: '50% 0%',
    }
    if (lost) {
      return { ...base, animation: 'hg-swing 2s ease-in-out infinite' }
    }
    if (wrongCount >= 5 && !won) {
      return {
        ...base,
        filter: 'drop-shadow(0 0 8px #f97316)',
        animation: shaking
          ? 'hg-shake 0.5s ease'
          : 'hg-danger-pulse 1s ease-in-out infinite',
      }
    }
    if (shaking) {
      return { ...base, animation: 'hg-shake 0.5s ease' }
    }
    return base
  }

  return (
    <svg viewBox="0 0 220 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <style>{`
        @keyframes hg-draw { to { stroke-dashoffset: 0; } }
        @keyframes hg-part-in {
          0%   { opacity: 0; transform: scale(0) rotate(-20deg); }
          65%  { opacity: 1; transform: scale(1.3) rotate(4deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes hg-shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-5px); }
          80%     { transform: translateX(5px); }
        }
        @keyframes hg-swing {
          0%,100% { transform: rotate(-7deg); }
          50%     { transform: rotate(7deg); }
        }
        @keyframes hg-danger-pulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.6; }
        }
        @keyframes hg-letter-reveal {
          0%   { transform: translateY(-18px) scale(0.5); opacity: 0; }
          65%  { transform: translateY(4px) scale(1.2); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes hg-letter-wave {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-14px); }
        }
        @keyframes hg-wrong-flash {
          0%,100% { background-color: transparent; }
          30%     { background-color: rgba(239,68,68,0.4); }
        }
        @keyframes hg-confetti-fall {
          0%   { transform: translate(0,0) rotate(0deg); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translate(var(--hg-dx, 0px), 550px) rotate(var(--hg-rot, 360deg)); opacity: 0; }
        }
        @keyframes hg-win-glow {
          0%,100% { text-shadow: 0 0 0px transparent; }
          50%     { text-shadow: 0 0 18px #4ade80; }
        }
        @keyframes hg-lose-reveal {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Gallows */}
      <g stroke={gallowsStroke} strokeWidth={4} fill="none" strokeLinecap="round">
        {gallowsPieces.map((p, i) => (
          <line
            key={i}
            x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
            strokeDasharray={p.len}
            strokeDashoffset={p.len}
            style={{
              animation: `hg-draw 0.35s ease forwards ${p.delay}`,
            }}
          />
        ))}
      </g>

      {/* Figure */}
      <g
        stroke={figureColor}
        fill="none"
        style={getFigureStyle()}
      >
        {bodyParts.map((part, i) => {
          const visible = i < wrongCount
          const isAnimating = animParts.has(i)
          return (
            <g
              key={i}
              style={{
                opacity: visible ? 1 : 0,
                transformBox: 'fill-box',
                transformOrigin: '50% 50%',
                animation: isAnimating ? 'hg-part-in 0.45s cubic-bezier(0.175,0.885,0.32,1.275) forwards' : undefined,
              }}
            >
              {part}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
