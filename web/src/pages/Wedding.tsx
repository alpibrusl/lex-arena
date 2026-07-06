import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { callSkill, verifyChain } from '../lib/api'
import { useEvents } from '../lib/useEvents'
import { VenueScene, GuestPortrait, SlotIcon, type Mood } from '../components/WeddingArt'

const GUEST_ORDER = ['deb', 'kamala', 'jonah']

type TranscriptEntry = { id: string; line: string }

export function Wedding() {
  const [state, setState] = useState<any>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [typingSpeaker, setTypingSpeaker] = useState<string | null>(null)
  const [negotiating, setNegotiating] = useState(false)
  const [verdict, setVerdict] = useState('')
  const [refused, setRefused] = useState<{ guest: string; reason: string } | null>(null)
  const tokenRef = useRef('')

  const fetchState = useCallback(async () => setState(await callSkill('wedding_state')), [])
  const join = useCallback(async () => {
    const j = await callSkill<{ token?: string }>('wedding_join', { side: 'PLANNER' })
    if (j?.token) tokenRef.current = j.token
  }, [])
  const newCase = useCallback(async () => {
    await callSkill('wedding_reset')
    setTranscript([])
    setTypingSpeaker(null)
    setVerdict('')
    if (!tokenRef.current) await join()
    await fetchState()
  }, [join, fetchState])

  const startNegotiation = useCallback(async () => {
    setNegotiating(true)
    const result = await callSkill<any>('wedding_talk')
    const fresh = await callSkill<any>('wedding_state')
    setState(fresh)
    const guests: any[] = fresh?.guests || []
    for (const id of GUEST_ORDER) {
      const g = guests.find((x) => x.id === id)
      if (!g?.line) continue
      setTypingSpeaker(id)
      await new Promise((r) => setTimeout(r, 750))
      setTypingSpeaker(null)
      setTranscript((prev) => [...prev, { id, line: g.line }])
      await new Promise((r) => setTimeout(r, 150))
    }
    setNegotiating(false)
    void result
  }, [])

  const rule = useCallback(
    async (guest: string, decision: 'approve' | 'deny') => {
      setRefused(null)
      const r = await callSkill<{ status?: string; reason?: string }>('wedding_rule', { guest, decision, token: tokenRef.current })
      if (r?.status === 'refused') {
        setRefused({ guest, reason: r.reason || 'refused' })
      }
      await fetchState()
    },
    [fetchState],
  )

  const onVerify = useCallback(async () => {
    const v = await verifyChain('wedding')
    setVerdict(
      v?.valid
        ? `✓ chain verified — ${v.count} ruling${v.count === 1 ? '' : 's'}, every link intact (tamper-evident)`
        : '✗ chain BROKEN — a recorded ruling was altered',
    )
  }, [])

  const handleEvent = useCallback(
    async (ev: any) => {
      if (ev.kind === 'wedding_ruled' || ev.kind === 'wedding_over' || ev.kind === 'wedding_refused') {
        await fetchState()
      }
    },
    [fetchState],
  )
  const live = useEvents(handleEvent)

  useEffect(() => {
    newCase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guests: any[] = state?.guests || []
  const talked = !!state?.talked
  const over = !!state?.over
  const budgetCap = state?.budget_cap ?? 200
  const budgetUsed = state?.budget_used ?? 0
  const slotsCap = state?.slots_cap ?? 2
  const slotsUsed = state?.slots_used ?? 0

  const moodFor = (decision: string): Mood => (decision === 'approve' ? 'happy' : decision === 'deny' ? 'annoyed' : 'neutral')

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header meta="you're the planner now · three guests, competing agendas, one venue that won't budge · every ruling is hash-chained" back live={live} />
      <div className="flex flex-1 min-h-0 flex-col items-center gap-4 overflow-y-auto p-4">
        <VenueScene className="h-[80px] w-full max-w-3xl rounded-xl border border-border" />

        <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted">budget</span>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-surface-hi">
              <div
                className="h-full rounded-full bg-[var(--color-gold)] transition-all duration-300"
                style={{ width: `${Math.min(100, (budgetUsed / budgetCap) * 100)}%` }}
              />
            </div>
            <span className="font-data text-ink">
              {budgetUsed}/{budgetCap}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted">accommodations</span>
            {Array.from({ length: slotsCap }, (_, i) => (
              <SlotIcon key={i} filled={i < slotsUsed} className="h-4 w-4 text-muted" />
            ))}
          </div>
        </div>

        {!talked && (
          <Button onClick={startNegotiation} variant="primary">
            {negotiating ? 'The room is talking…' : 'Start the negotiation'}
          </Button>
        )}

        {talked && (
          <div className="flex w-full max-w-3xl flex-col gap-2 rounded-xl border border-border bg-surface-hi p-3">
            {transcript.map((t, i) => (
              <div key={i} className="animate-bubble-in flex items-start gap-2">
                <GuestPortrait id={t.id} mood="neutral" className="h-8 w-8 shrink-0 rounded-full" />
                <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-3 py-2 text-sm">
                  <div className="mb-0.5 text-[10px] font-bold tracking-wide text-blush">
                    {guests.find((g) => g.id === t.id)?.name || t.id}
                  </div>
                  {t.line}
                </div>
              </div>
            ))}
            {typingSpeaker && (
              <div className="flex items-center gap-2">
                <GuestPortrait id={typingSpeaker} mood="neutral" className="h-8 w-8 shrink-0 rounded-full" />
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border bg-surface px-3 py-2.5">
                  <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>
        )}

        {talked && (
          <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {guests.map((g) => (
              <div key={g.id} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-hi p-3 text-center">
                <GuestPortrait id={g.id} mood={moodFor(g.decision)} className="h-14 w-14 rounded-full" />
                <div className="text-xs font-bold text-blush">{g.name}</div>
                <div className="text-xs text-muted">{g.request}</div>
                <div className="flex gap-1.5 text-[10px] text-ink">
                  {g.cost_budget > 0 && <span className="rounded-full border border-border px-1.5 py-0.5">💰{g.cost_budget}</span>}
                  <span className="rounded-full border border-border px-1.5 py-0.5">🎟️{g.cost_slots}</span>
                </div>
                {g.decision === '' && !over ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="mt-1 flex gap-1.5">
                      <Button onClick={() => rule(g.id, 'approve')} className="!px-2.5 !py-1 !text-xs">
                        Approve
                      </Button>
                      <Button variant="danger" onClick={() => rule(g.id, 'deny')} className="!px-2.5 !py-1 !text-xs">
                        Deny
                      </Button>
                    </div>
                    {refused && refused.guest === g.id && (
                      <div className="text-[11px] font-bold text-red">⛔ {refused.reason}</div>
                    )}
                  </div>
                ) : (
                  <div className={'mt-1 text-[11px] font-bold ' + (g.decision === 'approve' ? 'text-green' : g.decision === 'deny' ? 'text-red' : 'text-faint')}>
                    {g.decision === 'approve' ? '✓ approved' : g.decision === 'deny' ? '✗ denied' : 'awaiting your ruling'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {over && (
          <div className="w-full max-w-3xl rounded-xl border border-[var(--color-blush)] bg-surface-hi p-4 text-center">
            <div className="mb-1 text-[11px] font-bold tracking-wide text-[var(--color-gold)]">HOW IT WENT</div>
            <div className="text-sm text-ink">{state?.epilogue}</div>
          </div>
        )}

        <div className="flex gap-2 pb-2">
          <Button onClick={newCase}>New wedding</Button>
          <Button onClick={onVerify}>Verify chain</Button>
        </div>
        <div className="min-h-[18px] pb-2 text-sm text-muted">{verdict}</div>
      </div>
    </div>
  )
}
