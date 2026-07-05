import { Link } from 'react-router-dom'
import { StatusDot } from './StatusDot'

export function Header({
  meta,
  back,
  live,
}: {
  meta: string
  back?: boolean
  live?: boolean
}) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
      {back && (
        <Link
          to="/"
          className="rounded-md border border-border px-2.5 py-1 text-sm text-muted transition-colors hover:border-border-hi hover:text-ink"
        >
          ← Games
        </Link>
      )}
      <Link to="/" className="text-sm font-semibold tracking-wide text-amber">
        LEX ARENA
      </Link>
      <span className="flex-1 truncate text-sm text-muted">{meta}</span>
      {live !== undefined && <StatusDot live={live} />}
    </header>
  )
}
