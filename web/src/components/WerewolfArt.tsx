// Hand-drawn flat-vector illustrations for Werewolf. No raster assets — plain
// SVG themed off the shared tokens, with a cool moonlit palette distinct from
// the Wedding Broker's warm blush/gold, since this game's whole mood is
// nighttime suspicion rather than a bright reception.

export type PlayerMood = 'alive' | 'dead' | 'you'

export function VillageScene({ night = true, className = '' }: { night?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 400 90" className={className} role="presentation">
      <defs>
        <linearGradient id="ww-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={night ? '#0c1224' : '#1b2340'} />
          <stop offset="100%" stopColor="#0e0f14" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="90" fill="url(#ww-sky)" />
      {night ? (
        <>
          <circle cx="340" cy="24" r="14" fill="#dbe4ff" opacity=".9" />
          <circle cx="335" cy="20" r="11" fill="#0c1224" opacity=".55" />
          {[40, 90, 150, 220, 270, 310, 360].map((x, i) => (
            <circle key={x} cx={x} cy={12 + (i % 3) * 6} r="1" fill="#dbe4ff" opacity=".7" />
          ))}
        </>
      ) : (
        <circle cx="340" cy="22" r="16" fill="#f0b429" opacity=".9" />
      )}
      {/* tree line */}
      <g fill="#0a1420">
        <path d="M0 60 L20 30 L40 60 Z" />
        <path d="M25 62 L48 26 L71 62 Z" />
        <path d="M300 62 L322 28 L344 62 Z" />
        <path d="M330 60 L350 32 L370 60 Z" />
      </g>
      {/* village rooftops */}
      <g fill="#141b2e" stroke="#2a3555" strokeWidth="1">
        <path d="M120 90 L120 66 L145 50 L170 66 L170 90 Z" />
        <path d="M180 90 L180 70 L200 58 L220 70 L220 90 Z" />
        <rect x="128" y="76" width="10" height="14" fill="#0c1224" />
      </g>
    </svg>
  )
}

const HAIR: Record<number, string> = {
  0: '#4a3a2a', 1: '#6b3a4a', 2: '#3a5a4a', 3: '#5a4a2a', 4: '#3a4a6b', 5: '#6b5a2a', 6: '#2a4a4a', 7: '#5a2a4a',
}

export function PlayerPortrait({ seat, mood = 'alive', role = '', className = '' }: { seat: number; mood?: PlayerMood; role?: string; className?: string }) {
  const hair = HAIR[seat] ?? '#4a3a2a'
  const dead = mood === 'dead'
  const wolf = role === 'wolf'
  const seer = role === 'seer'
  const doctor = role === 'doctor'
  const scarf = wolf ? '#7a2a2a' : seer ? '#5a3a7a' : doctor ? '#2a6a5a' : '#2a3a5a'
  return (
    <svg viewBox="0 0 64 64" className={className} role="presentation" style={dead ? { filter: 'grayscale(1)' } : undefined}>
      <circle cx="32" cy="32" r="32" fill={mood === 'you' ? '#1a2b3a' : '#1a1a24'} opacity={dead ? 0.55 : 1} />
      <path d="M16 62 Q32 50 48 62 Z" fill={scarf} opacity={dead ? 0.4 : 0.9} />
      <ellipse cx="32" cy="30" rx="15" ry="16" fill="#dba876" opacity={dead ? 0.5 : 1} />
      <path d="M15 24 Q16 8 32 8 Q48 8 49 24 Q49 15 32 15 Q15 15 15 24 Z" fill={hair} opacity={dead ? 0.5 : 1} />
      {dead ? (
        <>
          <path d="M22 27 L30 33 M30 27 L22 33" stroke="#2a1f10" strokeWidth="2" strokeLinecap="round" />
          <path d="M34 27 L42 33 M42 27 L34 33" stroke="#2a1f10" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M23 28 q4 -3 8 0" stroke="#2a1f10" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M33 28 q4 -3 8 0" stroke="#2a1f10" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M24 35 Q32 39 40 35" stroke="#8a4a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
      {wolf && !dead && <path d="M18 14 L24 6 L27 16 Z M46 14 L40 6 L37 16 Z" fill={hair} />}
    </svg>
  )
}

export function RoleBadge({ role, className = '' }: { role: string; className?: string }) {
  const info: Record<string, { icon: string; color: string; label: string }> = {
    wolf: { icon: '🐺', color: 'var(--color-red)', label: 'Werewolf' },
    seer: { icon: '🔮', color: 'var(--color-violet)', label: 'Seer' },
    doctor: { icon: '🩺', color: 'var(--color-blue)', label: 'Doctor' },
    villager: { icon: '🌾', color: 'var(--color-green)', label: 'Villager' },
  }
  const i = info[role] || { icon: '❓', color: 'var(--color-muted)', label: role || '?' }
  return (
    <span
      className={'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ' + className}
      style={{ borderColor: i.color, color: i.color }}
    >
      {i.icon} {i.label}
    </span>
  )
}
