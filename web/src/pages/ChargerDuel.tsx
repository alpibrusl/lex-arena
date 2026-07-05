import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { usePoolGame } from '../lib/usePoolGame'

export function ChargerDuel() {
  const { state, status, statusKind, verdict, live, move, newGame, onVerify } = usePoolGame(
    'ev',
    'ev',
    { yours: 'Your turn — claim a charger', bots: 'Bot (P2) is claiming…' },
    'kWh',
  )

  const cheat = () => {
    const free = (state?.pool || []).find((it: any) => !it.owner)
    if (free) move('P2', 'charger', free.i)
  }

  const nrg = state?.nrg || { P1: 0, P2: 0 }
  const bud = state?.bud || { P1: 0, P2: 0 }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header meta="claim chargers before the deadline · most kWh wins · you control P1 (signed)" back live={live} />
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
            <span>{nrg.P1} kWh</span>
            <span className="text-xs text-muted">{bud.P1} min left</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-bold tracking-wide text-amber">BOT · P2</span>
            <span>{nrg.P2} kWh</span>
            <span className="text-xs text-muted">{bud.P2} min left</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(state?.pool || []).map((it: any) => (
            <button
              key={it.i}
              disabled={!!it.owner}
              onClick={() => move('P1', 'charger', it.i)}
              className={
                'flex flex-col items-center gap-1 rounded-xl border p-3 transition-all duration-150 ' +
                (it.owner === 'P1'
                  ? 'cursor-default border-blue bg-[#0c2438]'
                  : it.owner === 'P2'
                    ? 'cursor-default border-amber bg-[#2a2410]'
                    : 'border-border bg-surface-hi hover:-translate-y-0.5 hover:border-green')
              }
            >
              <span className="text-2xl">⚡</span>
              <span className="text-sm">{it.name}</span>
              <span className="text-xs text-amber">{it.kwh} kWh</span>
              <span className="text-xs text-muted">{it.min} min</span>
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
            Cheat: claim as P2
          </Button>
          <Button onClick={onVerify}>Verify chain</Button>
        </div>
        <div className="min-h-[18px] text-sm text-muted">{verdict}</div>
      </div>
    </div>
  )
}
