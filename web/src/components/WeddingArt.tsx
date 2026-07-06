// Hand-drawn flat-vector illustrations for The Wedding Broker. No raster
// assets — plain SVG themed off the shared tokens plus two warm additions
// (--color-blush, --color-gold) scoped to this game for a romantic accent
// against the platform's usual dark "SaaS dashboard" palette.

export type Mood = 'neutral' | 'happy' | 'annoyed'

export function VenueScene({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 100" className={className} role="presentation">
      <defs>
        <linearGradient id="wed-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#241522" />
          <stop offset="100%" stopColor="#120f14" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="100" fill="url(#wed-sky)" />
      {/* string lights */}
      <path d="M0 18 Q100 40 200 18 T400 18" stroke="#e8c874" strokeWidth="1.5" fill="none" opacity=".6" />
      {[20, 70, 120, 170, 220, 270, 320, 370].map((x, i) => (
        <circle key={x} cx={x} cy={18 + Math.sin(i) * 8} r="2.5" fill="#e8c874" opacity=".9" />
      ))}
      {/* the arch */}
      <path d="M170 100 L170 55 Q170 30 200 30 Q230 30 230 55 L230 100" stroke="#caa6b0" strokeWidth="4" fill="none" />
      <path d="M170 55 Q200 25 230 55" stroke="#f4c6d4" strokeWidth="2" fill="none" opacity=".7" />
      {/* rows of chairs, simple silhouettes */}
      <g fill="#2a1f28">
        <rect x="60" y="82" width="10" height="14" rx="2" />
        <rect x="80" y="82" width="10" height="14" rx="2" />
        <rect x="310" y="82" width="10" height="14" rx="2" />
        <rect x="330" y="82" width="10" height="14" rx="2" />
      </g>
    </svg>
  )
}

const HAIR: Record<string, string> = {
  deb: '#3a2a30',
  kamala: '#6b4a2a',
  jonah: '#8a6a3a',
}

function mouthPath(mood: Mood) {
  if (mood === 'happy') return 'M23 33 Q32 40 41 33'
  if (mood === 'annoyed') return 'M23 35 Q32 30 41 35'
  return 'M24 34 Q32 36 40 34'
}

export function GuestPortrait({ id, mood = 'neutral', className = '' }: { id: string; mood?: Mood; className?: string }) {
  const hair = HAIR[id] || '#3a2a30'
  return (
    <svg viewBox="0 0 64 64" className={className} role="presentation">
      <circle cx="32" cy="32" r="32" fill="#241a22" />
      <path d="M16 62 Q32 50 48 62 Z" fill="#caa6b0" opacity=".9" />
      <ellipse cx="32" cy="30" rx="15" ry="16" fill="#e0b088" />

      {id === 'deb' && (
        <>
          <path d="M15 24 Q16 8 32 8 Q48 8 49 24 Q49 16 32 16 Q15 16 15 24 Z" fill={hair} />
          <circle cx="18" cy="34" r="2" fill="#e8c874" />
          <circle cx="46" cy="34" r="2" fill="#e8c874" />
        </>
      )}
      {id === 'kamala' && (
        <>
          <path d="M14 26 Q14 10 32 10 Q50 10 50 26 L50 20 Q32 30 14 20 Z" fill={hair} />
          <path d="M10 20 Q32 34 54 20 L54 14 Q32 28 10 14 Z" fill="#f4c6d4" opacity=".85" />
        </>
      )}
      {id === 'jonah' && (
        <>
          <path d="M16 22 Q18 9 32 9 Q46 9 48 22 Q46 15 32 17 Q18 15 16 22 Z" fill={hair} />
          <path d="M22 46 L42 46 L40 52 L24 52 Z" fill="#1a1a22" />
        </>
      )}

      {mood === 'annoyed' ? (
        <>
          <path d="M22 27 q4 3 8 1" stroke="#2a1f10" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M34 28 q4 -2 8 1" stroke="#2a1f10" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M23 28 q4 -3 8 0" stroke="#2a1f10" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M33 28 q4 -3 8 0" stroke="#2a1f10" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
      <path d={mouthPath(mood)} stroke="#8a4a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function SlotIcon({ filled, className = '' }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="presentation">
      <path
        d="M12 3 C7 3 4 6.5 4 11 C4 15 6 17.5 4 20 L20 20 C18 17.5 20 15 20 11 C20 6.5 17 3 12 3 Z"
        fill={filled ? 'var(--color-gold)' : 'none'}
        stroke={filled ? 'var(--color-gold)' : 'currentColor'}
        strokeWidth="1.5"
        opacity={filled ? 1 : 0.4}
      />
      <circle cx="12" cy="22" r="1.4" fill={filled ? 'var(--color-gold)' : 'currentColor'} opacity={filled ? 1 : 0.4} />
    </svg>
  )
}
