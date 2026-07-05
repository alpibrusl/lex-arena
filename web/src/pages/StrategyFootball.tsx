import { useCallback, useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { callSkill } from '../lib/api'
import { useEvents } from '../lib/useEvents'

const ZONES = ['DEF', 'BUILD', 'MID', 'FINAL', 'BOX']
const PLAYERS = ['H0', 'H1', 'D0', 'D1'] as const

export function StrategyFootball() {
  const [state, setState] = useState<any>(null)
  const [verdict, setVerdict] = useState('')

  const fetchState = useCallback(async () => setState(await callSkill('fb_state')), [])
  const setStrategy = useCallback(
    async (s: string) => {
      await callSkill('fb_strategy', { strategy: s })
      fetchState()
    },
    [fetchState],
  )
  const newMatch = useCallback(async () => {
    await callSkill('fb_reset')
    setVerdict('')
    fetchState()
  }, [fetchState])
  const onVerify = useCallback(async () => {
    const v = await callSkill<{ valid?: boolean; count?: number }>('fb_verify')
    if (!v) return
    setVerdict(
      v.valid
        ? `✓ chain verified — ${v.count} moves, every link intact (tamper-evident)`
        : '✗ chain BROKEN — a recorded move was altered',
    )
  }, [])

  const live = useEvents(() => fetchState())

  useEffect(() => {
    fetchState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sig = state?.sig || {}
  const say = [sig.H0 && `H0: ${sig.H0}`, sig.H1 && `H1: ${sig.H1}`].filter(Boolean).join('   ·   ')
  const status = state?.over
    ? state.result === 'home'
      ? '⚽ GOAL — the squad broke the press!'
      : '🧱 Full time — the defense held'
    : state?.turn
      ? `${state.turn} to act`
      : 'kick-off'
  const statusColor = state?.over ? (state.result === 'home' ? 'text-green' : 'text-red') : 'text-ink'

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header meta="you set the strategy · a 2-agent squad coordinates over A2A to score · every move gated + hash-chained" back live={live} />
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 p-4">
        <div className={'text-base min-h-[22px] ' + statusColor}>{status}</div>

        <div className="flex items-center gap-5 text-sm">
          <span>
            <span className="text-[11px] font-bold tracking-wide text-blue">HOME</span> · squad (H0+H1, A2A)
          </span>
          <span className="text-muted">budget {state?.left ?? 0}</span>
          <span>
            <span className="text-[11px] font-bold tracking-wide text-red">AWAY</span> · presser (D0) + sweeper (D1)
          </span>
        </div>

        <div className="grid grid-cols-5 overflow-hidden rounded-lg border-[3px] border-[#2e7d4a]">
          {Array.from({ length: 5 }, (_, z) => (
            <div
              key={z}
              className={
                'relative flex h-[200px] w-[92px] flex-col items-center justify-center gap-1.5 border-r border-dashed border-[#2e7d4a] last:border-r-0 ' +
                (z % 2 === 0 ? 'bg-[#1a5e34]' : 'bg-[#17542f]')
              }
            >
              <span className="absolute inset-x-0 top-1 text-center text-[11px] text-white/35">
                z{z} · {ZONES[z]}
              </span>
              {z === 4 && <div className="absolute right-[-3px] top-1/2 h-20 w-1.5 -translate-y-1/2 bg-amber" />}
              {PLAYERS.filter((p) => state?.[p] === z).map((p) => (
                <div
                  key={p}
                  className={
                    'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-[#06210f] transition-all duration-200 ' +
                    (p[0] === 'H' ? 'bg-blue' : 'bg-red') +
                    (state?.ball === p ? ' shadow-[0_0_0_3px_var(--color-amber),0_0_12px_var(--color-amber)]' : '')
                  }
                >
                  {p}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="min-h-[16px] text-xs text-amber">{say}</div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-muted">strategy:</span>
          <Button
            className={state?.strategy === 'possession' ? '!border-amber !text-amber' : ''}
            onClick={() => setStrategy('possession')}
          >
            possession
          </Button>
          <Button
            className={state?.strategy === 'direct' ? '!border-amber !text-amber' : ''}
            onClick={() => setStrategy('direct')}
          >
            direct
          </Button>
          <Button onClick={newMatch}>New match</Button>
          <Button onClick={onVerify}>Verify chain</Button>
        </div>
        <div className="min-h-[16px] text-xs text-muted">{verdict}</div>
      </div>
    </div>
  )
}
