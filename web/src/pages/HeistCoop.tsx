import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { callSkill, verifyChain } from '../lib/api'
import { useEvents } from '../lib/useEvents'

const ICON: Record<string, string> = { HACK: '💻', MUSCLE: '💪' }

export function HeistCoop() {
  const [state, setState] = useState<any>(null)
  const [status, setStatus] = useState('Joining…')
  const [statusKind, setStatusKind] = useState<'deny' | 'win' | 'bust' | undefined>()
  const [verdict, setVerdict] = useState('')
  const tokenRef = useRef('')

  const fetchState = useCallback(async () => setState(await callSkill('hx_state')), [])
  const join = useCallback(async () => {
    const j = await callSkill<{ token?: string }>('hx_join', { side: 'P1' })
    if (j?.token) tokenRef.current = j.token
  }, [])
  const attempt = useCallback(async () => {
    await callSkill('hx_move', { by: 'P1', token: tokenRef.current })
  }, [])
  const newGame = useCallback(async () => {
    await callSkill('hx_reset')
    if (!tokenRef.current) await join()
    fetchState()
  }, [join, fetchState])
  const onVerify = useCallback(async () => {
    const v = await verifyChain('hx')
    setVerdict(
      v?.valid
        ? `✓ chain verified — ${v.count} stages, every link intact (tamper-evident)`
        : '✗ chain BROKEN — a recorded step was altered',
    )
  }, [])

  const handleEvent = useCallback((ev: any) => {
    const k = ev.kind
    if (k === 'hx_trip') {
      fetchState()
      setStatus(`⚠ ${ev.reason} — alarm ${ev.alarm}/3`)
      setStatusKind('deny')
    } else if (k === 'hx_win') {
      fetchState()
      setStatus('💰 LOOT SECURED — both roles cleared all six stages')
      setStatusKind('win')
    } else if (k === 'hx_bust') {
      fetchState()
      setStatus('🚨 BUSTED — the alarm tripped three times')
      setStatusKind('bust')
    } else {
      fetchState()
    }
  }, [fetchState])

  const live = useEvents(handleEvent)

  useEffect(() => {
    newGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const alarm = state?.alarm || 0
  const stages = state?.stages || []

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header meta="two roles, one goal · only the right capability clears each stage · 3 trips = busted" back live={live} />
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 p-4">
        <div
          className={
            'text-base min-h-[22px] ' +
            (statusKind === 'deny' || statusKind === 'bust' ? 'text-red' : statusKind === 'win' ? 'text-green' : 'text-ink')
          }
        >
          {status}
        </div>

        <div className="flex gap-6 text-sm">
          <span className={'text-[11px] font-bold tracking-wide text-blue ' + (state?.turn === 'P1' && !state?.over ? 'drop-shadow-[0_0_8px_currentColor]' : '')}>
            YOU · HACKER (P1)
          </span>
          <span className={'text-[11px] font-bold tracking-wide text-amber ' + (state?.turn === 'P2' && !state?.over ? 'drop-shadow-[0_0_8px_currentColor]' : '')}>
            BOT · MUSCLE (P2)
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted">
          <span>ALARM</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={
                'h-4 w-4 rounded-full border border-border ' +
                (i < alarm ? 'border-red bg-red shadow-[0_0_8px_var(--color-red)]' : 'bg-surface-hi')
              }
            />
          ))}
        </div>

        <div className="flex items-stretch gap-2">
          {stages.map((s: any, idx: number) => {
            const mine = s.current && s.role === 'HACK'
            return (
              <div key={idx} className="flex items-stretch gap-2">
                {idx > 0 && <span className="self-center text-muted">→</span>}
                <button
                  disabled={!(mine && !state?.over)}
                  onClick={mine ? attempt : undefined}
                  className={
                    'flex w-[110px] flex-col items-center gap-1 rounded-xl border p-3 transition-all duration-150 ' +
                    (s.cleared
                      ? 'border-green opacity-100'
                      : s.current && !state?.over
                        ? mine
                          ? 'cursor-pointer border-blue opacity-100 -translate-y-1 shadow-[0_0_12px_rgba(185,138,255,.4)]'
                          : 'border-violet opacity-100 -translate-y-1 shadow-[0_0_12px_rgba(185,138,255,.4)]'
                        : 'border-border bg-surface-hi opacity-55')
                  }
                >
                  <span className="text-xl">
                    {ICON[s.role] || '🔒'}
                    {s.cleared && <span className="text-green"> ✓</span>}
                  </span>
                  <span className="text-center text-xs leading-tight">{s.name}</span>
                  <span className={'text-[10px] font-bold ' + (s.role === 'HACK' ? 'text-blue' : 'text-amber')}>{s.role}</span>
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button onClick={newGame}>New run</Button>
          <Button variant="danger" onClick={attempt}>
            Force a stage you can't (trip alarm)
          </Button>
          <Button onClick={onVerify}>Verify chain</Button>
        </div>
        <div className="min-h-[18px] text-sm text-muted">{verdict}</div>
      </div>
    </div>
  )
}
