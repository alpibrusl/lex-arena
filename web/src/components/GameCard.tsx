import { Link } from 'react-router-dom'
import { Card } from './Card'
import { Badge } from './Badge'
import type { GameMeta } from '../data/games'

export function GameCard({ game }: { game: GameMeta }) {
  const playHref = game.path ?? `/games/${game.legacyFile}`
  const external = !game.path

  return (
    <Card interactive className="flex flex-col gap-3">
      <span className="text-2xl">{game.icon}</span>
      <h3 className="text-sm font-semibold tracking-wide text-amber">{game.title}</h3>
      <p className="text-sm leading-relaxed text-muted">{game.desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {game.tags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
      <div className="mt-auto flex gap-2 pt-2">
        {external ? (
          <a
            href={playHref}
            className="flex-1 rounded-lg border border-border bg-surface-hi py-2 text-center text-sm font-medium text-ink transition-colors hover:border-amber hover:text-amber"
          >
            ▶ Play
          </a>
        ) : (
          <Link
            to={playHref}
            className="flex-1 rounded-lg border border-border bg-surface-hi py-2 text-center text-sm font-medium text-ink transition-colors hover:border-amber hover:text-amber"
          >
            ▶ Play
          </Link>
        )}
      </div>
    </Card>
  )
}
