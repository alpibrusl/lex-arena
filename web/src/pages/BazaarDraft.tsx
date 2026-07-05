import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { usePoolGame } from '../lib/usePoolGame'

export function BazaarDraft() {
  const { state, status, statusKind, verdict, live, move, newGame, onVerify } = usePoolGame('shop', 'shop', {
    yours: 'Your turn — draft an item',
    bots: 'Bot (P2) is choosing…',
  })

  const cheat = () => {
    const free = (state?.pool || []).find((it: any) => !it.owner)
    if (free) move('P2', 'item', free.i)
  }

  const val = state?.val || { P1: 0, P2: 0 }
  const bud = state?.bud || { P1: 0, P2: 0 }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header meta="draft for value under budget · you control P1 (signed) · P2 is an A2A agent" back live={live} />
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 p-4">
        <div
          className={
            'text-base min-h-[22px] ' +
            (statusKind === 'deny' ? 'text-red' : statusKind === 'win' ? 'text-green' : 'text-ink')
          }
        >
          {status}
        </div>

        <div className="flex gap-8 text-sm">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-bold tracking-wide text-blue">YOU · P1</span>
            <span>{val.P1} pts</span>
            <span className="text-xs text-muted">budget {bud.P1}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-bold tracking-wide text-amber">BOT · P2</span>
            <span>{val.P2} pts</span>
            <span className="text-xs text-muted">budget {bud.P2}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(state?.pool || []).map((it: any) => (
            <button
              key={it.i}
              disabled={!!it.owner}
              onClick={() => move('P1', 'item', it.i)}
              className={
                'flex flex-col gap-1 rounded-xl border p-3 text-left transition-all duration-150 ' +
                (it.owner === 'P1'
                  ? 'cursor-default border-blue bg-[#11233a]'
                  : it.owner === 'P2'
                    ? 'cursor-default border-amber bg-[#2a2410]'
                    : 'border-border bg-surface-hi hover:-translate-y-0.5 hover:border-amber')
              }
            >
              <span className="text-sm">{it.name}</span>
              <span className="text-xs text-muted">
                {it.price} cr · {it.value} pts
              </span>
              {it.owner && (
                <span className={'text-[10px] font-bold ' + (it.owner === 'P1' ? 'text-blue' : 'text-amber')}>
                  {it.owner === 'P1' ? 'YOURS' : 'BOT'}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={newGame}>New game</Button>
          <Button variant="danger" onClick={cheat}>
            Cheat: draft as P2
          </Button>
          <Button onClick={onVerify}>Verify chain</Button>
        </div>
        <div className="min-h-[18px] text-sm text-muted">{verdict}</div>
      </div>
    </div>
  )
}
