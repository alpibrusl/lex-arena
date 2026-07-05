import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={[
        'rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200',
        interactive && 'hover:border-amber hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
