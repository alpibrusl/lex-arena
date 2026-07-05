import { useEffect, useState } from 'react'
import { Card } from './Card'

interface Row {
  rank?: number
  name: string
  score: number
  scoreLabel: string
  a: number
  aLabel: string
  b: number
  bLabel?: string
}

const medal = (r: number) => (r === 1 ? '①' : r === 2 ? '②' : r === 3 ? '③' : String(r))
const rankColor = (r: number) => (r === 1 ? 'text-amber' : r === 2 ? 'text-[#cdd7e0]' : r === 3 ? 'text-[#d6a06a]' : 'text-muted')

export function Leaderboard({
  title,
  icon,
  blurb,
  endpoint,
  metaOf,
  rowsOf,
  emptyText,
  footer,
}: {
  title: string
  icon: string
  blurb: React.ReactNode
  endpoint: string
  metaOf: (data: any) => string
  rowsOf: (data: any) => Row[]
  emptyText: string
  footer: React.ReactNode
}) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [meta, setMeta] = useState('')

  useEffect(() => {
    fetch(endpoint, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setRows(rowsOf(data))
        setMeta(metaOf(data))
      })
      .catch(() => setRows([]))
  }, [endpoint])

  const top = rows && rows.length ? Math.max(...rows.map((r) => r.score || 0), 1) : 1

  return (
    <section className="mt-8">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide">
          {icon} {title}
        </h2>
        <span className="text-xs text-muted">{meta}</span>
      </div>
      <p className="mb-3 max-w-2xl text-sm leading-relaxed text-muted">{blurb}</p>

      {rows && rows.length === 0 && (
        <Card className="text-sm text-muted">{emptyText}</Card>
      )}
      {rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="grid grid-cols-[42px_1fr_92px_140px] items-center gap-3 bg-surface-hi px-4 py-2 text-[11px] font-semibold tracking-wide text-muted">
            <span />
            <span>NAME</span>
            <span className="text-right">SCORE</span>
            <span className="text-right">{rows[0]?.aLabel}</span>
          </div>
          {rows.map((r, i) => {
            const rank = r.rank || i + 1
            const pct = Math.round(((r.score || 0) / top) * 100)
            return (
              <div
                key={r.name + i}
                className="relative grid grid-cols-[42px_1fr_92px_140px] items-center gap-3 border-t border-border px-4 py-2"
              >
                <span className={`text-center text-sm font-bold ${rankColor(rank)}`}>{medal(rank)}</span>
                <span className="truncate text-sm">{r.name}</span>
                <span className="text-right text-sm font-bold text-amber">{r.scoreLabel}</span>
                <span className="text-right text-xs text-muted">
                  <span className="text-green">{r.a}</span> · {r.b}
                  {r.bLabel ? ` (${r.bLabel})` : ''}
                </span>
                <span
                  className="absolute bottom-0 left-0 h-[2px] rounded-full bg-gradient-to-r from-amber to-transparent opacity-50"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )
          })}
        </div>
      )}
      <div className="mt-2 text-[11px] text-muted">{footer}</div>
    </section>
  )
}
