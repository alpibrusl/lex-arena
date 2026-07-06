// Hand-drawn flat-vector illustrations for Stamp of Destiny. No raster/pixel
// assets (none were generated for this) — everything here is plain SVG paths
// themed off the shared design tokens, so it reads as "illustrated" without a
// new asset pipeline or build step.

export function BoothScene({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 90" className={className} role="presentation">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1710" />
          <stop offset="100%" stopColor="#0e0f14" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="90" fill="url(#sky)" />
      {/* harbor water line */}
      <rect x="0" y="58" width="400" height="2" fill="#23252f" />
      {/* distant ship masts */}
      <g stroke="#33364275" strokeWidth="2">
        <line x1="40" y1="58" x2="40" y2="30" />
        <line x1="40" y1="34" x2="55" y2="40" />
        <line x1="330" y1="58" x2="330" y2="24" />
        <line x1="330" y1="30" x2="348" y2="38" />
        <line x1="365" y1="58" x2="365" y2="36" />
      </g>
      {/* the notary's counter */}
      <rect x="0" y="58" width="400" height="32" fill="#1b1408" />
      <rect x="0" y="58" width="400" height="4" fill="#2a1f10" />
      {/* the ledger */}
      <g transform="translate(150,64)">
        <rect x="0" y="0" width="46" height="20" rx="2" fill="#3a2a14" stroke="#5b4322" strokeWidth="1" />
        <line x1="6" y1="6" x2="40" y2="6" stroke="#8b8fa3" strokeWidth="1" opacity=".5" />
        <line x1="6" y1="10" x2="40" y2="10" stroke="#8b8fa3" strokeWidth="1" opacity=".5" />
        <line x1="6" y1="14" x2="30" y2="14" stroke="#8b8fa3" strokeWidth="1" opacity=".5" />
      </g>
      {/* the (broken) stamp, resting on its side */}
      <g transform="translate(220,68) rotate(-12)">
        <rect x="-5" y="-4" width="10" height="14" rx="2" fill="#3a2a14" stroke="#f0b429" strokeWidth="1" />
        <circle cx="0" cy="-8" r="4" fill="none" stroke="#f0b429" strokeWidth="1.5" />
      </g>
    </svg>
  )
}

export function BosunPortrait({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="presentation">
      <circle cx="32" cy="32" r="32" fill="#1a2b1f" />
      {/* neck + shirt */}
      <path d="M18 62 Q32 48 46 62 Z" fill="#3ddc84" opacity=".85" />
      {/* head */}
      <ellipse cx="32" cy="30" rx="15" ry="16" fill="#d9a066" />
      {/* beard */}
      <path d="M18 32 Q20 48 32 50 Q44 48 46 32 Q44 40 32 42 Q20 40 18 32 Z" fill="#8b8fa3" />
      {/* bandana */}
      <path d="M16 24 Q32 12 48 24 L48 20 Q32 10 16 20 Z" fill="#ff6b6b" />
      <path d="M46 20 L56 28 L48 26 Z" fill="#ff6b6b" />
      {/* squinting eyes + brow */}
      <path d="M23 28 q4 -3 8 0" stroke="#2a1f10" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M33 28 q4 -3 8 0" stroke="#2a1f10" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* nose */}
      <path d="M32 30 q2 4 0 6" stroke="#a97a4a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function BarrelIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="presentation">
      <rect x="7" y="4" width="18" height="24" rx="7" fill="#a97a4a" />
      <rect x="7" y="10" width="18" height="2.5" fill="#5b4322" />
      <rect x="7" y="19" width="18" height="2.5" fill="#5b4322" />
      <ellipse cx="16" cy="4" rx="9" ry="3" fill="#c99a68" />
    </svg>
  )
}

export function StampSeal({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} role="presentation">
      <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="30" cy="30" r="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      <path
        d="M20 32 q4 -14 10 -14 q6 0 10 14"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="30" cy="34" r="2.5" fill="currentColor" />
    </svg>
  )
}
