import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { callSkill, verifyChain } from '../lib/api'
import { useEvents } from '../lib/useEvents'
import { VenueScene, GuestPortrait, SlotIcon, type Mood } from '../components/WeddingArt'

const GUEST_ORDER = ['deb', 'kamala', 'jonah']

type TranscriptEntry = { id: string; line: string }

// The player's persistent broker identity — auto-minted once, kept in the
// browser. The whole career (reputation, and how each guest feels about you)
// lives server-side keyed by this did:lex, so it follows the browser across
// events without any sign-in.
function getBrokerDid(): string {
  const KEY = 'lex_broker_did'
  try {
    let d = localStorage.getItem(KEY)
    if (!d) {
      d = `did:lex:agent:broker-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(KEY, d)
    }
    return d
  } catch {
    return 'did:lex:agent:broker-anon'
  }
}

export function Wedding() {
  const brokerDid = useRef(getBrokerDid()).current
  const [state, setState] = useState<any>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [typingSpeaker, setTypingSpeaker] = useState<string | null>(null)
  const [negotiating, setNegotiating] = useState(false)
  const [verdict, setVerdict] = useState('')
  const [refused, setRefused] = useState<{ guest: string; reason: string } | null>(null)
  const [fallout, setFallout] = useState<any>(null)
  const tokenRef = useRef('')
  const settlingRef = useRef(false)

  const fetchState = useCallback(async () => {
    setState(await callSkill('wedding_state', { broker_did: brokerDid }))
  }, [brokerDid])
  const join = useCallback(async () => {
    const j = await callSkill<{ token?: string }>('wedding_join', { side: 'PLANNER' })
    if (j?.token) tokenRef.current = j.token
  }, [])
  const nextEvent = useCallback(async () => {
    await callSkill('wedding_reset', { broker_did: brokerDid })
    setTranscript([])
    setTypingSpeaker(null)
    setVerdict('')
    setRefused(null)
    setFallout(null)
    settlingRef.current = false
    if (!tokenRef.current) await join()
    await fetchState()
  }, [brokerDid, join, fetchState])

  const startNegotiation = useCallback(async () => {
    setNegotiating(true)
    await callSkill('wedding_talk', { broker_did: brokerDid })
    const fresh = await callSkill<any>('wedding_state', { broker_did: brokerDid })
    setState(fresh)
    const guests: any[] = fresh?.guests || []
    for (const id of GUEST_ORDER) {
      const g = guests.find((x) => x.id === id)
      if (!g?.line) continue
      setTypingSpeaker(id)
      await new Promise((r) => setTimeout(r, 800))
      setTypingSpeaker(null)
      setTranscript((prev) => [...prev, { id, line: g.line }])
      await new Promise((r) => setTimeout(r, 180))
    }
    setNegotiating(false)
  }, [brokerDid])

  const rule = useCallback(
    async (guest: string, decision: 'approve' | 'deny') => {
      setRefused(null)
      const r = await callSkill<{ status?: string; reason?: string }>('wedding_rule', {
        guest,
        decision,
        token: tokenRef.current,
      })
      if (r?.status === 'refused') setRefused({ guest, reason: r.reason || 'refused' })
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
    nextEvent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When the event resolves, settle it once: write the fallout back to the
  // broker's persistent memory and surface what changed.
  useEffect(() => {
    if (state?.over && !fallout && !settlingRef.current) {
      settlingRef.current = true
      callSkill<any>('wedding_settle', { broker_did: brokerDid }).then((f) => {
        if (f?.status === 'settled') setFallout(f)
      })
    }
  }, [state?.over, fallout, brokerDid])

  const guests: any[] = state?.guests || []
  const talked = !!state?.talked
  const over = !!state?.over
  const budgetCap = state?.budget_cap ?? 200
  const budgetUsed = state?.budget_used ?? 0
  const slotsCap = state?.slots_cap ?? 2
  const slotsUsed = state?.slots_used ?? 0
  const career = state?.career ?? { did: brokerDid, rep: 0, events: 0 }
  const brokerName = String(career.did || brokerDid).replace('did:lex:agent:', '')

  const portraitMood = (g: any): Mood => {
    if (g.decision === 'approve') return 'happy'
    if (g.decision === 'deny') return 'annoyed'
    if (g.mood === 'cold') return 'annoyed'
    if (g.mood === 'warm') return 'happy'
    return 'neutral'
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header
        meta="you're the town's wedding broker · a recurring cast that remembers how you treated them · every ruling is hash-chained"
        back
        live={live}
      />
      <div className="flex flex-1 min-h-0 flex-col items-center gap-4 overflow-y-auto p-4">
        {/* career strip */}
        <div className="flex w-full max-w-3xl items-center justify-between gap-3 rounded-lg border border-border bg-surface-hi px-3.5 py-2 text-xs">
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wide text-[var(--color-gold)]">BROKER</span>
            <span className="font-data text-ink">{brokerName}</span>
          </span>
          <span className="flex items-center gap-4 text-muted">
            <span>
              ⭐ <span className="font-data text-ink">{career.rep}</span> rep
            </span>
            <span>
              <span className="font-data text-ink">{career.events}</span> {career.events === 1 ? 'wedding' : 'weddings'} brokered
            </span>
          </span>
        </div>

        <VenueScene className="h-[76px] w-full max-w-3xl rounded-xl border border-border" />

        {/* authority meters */}
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
            <span className="ml-1 text-[11px] text-faint">only 2 — someone goes home unhappy</span>
          </div>
        </div>

        {!talked && (
          <Button onClick={startNegotiation} variant="primary">
            {negotiating ? 'The room is talking…' : 'Start the negotiation'}
          </Button>
        )}

        {/* negotiation transcript */}
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

        {/* guest ruling cards */}
        {talked && (
          <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {guests.map((g) => (
              <div key={g.id} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-hi p-3 text-center">
                <GuestPortrait id={g.id} mood={portraitMood(g)} className="h-14 w-14 rounded-full" />
                <div className="text-xs font-bold text-blush">{g.name}</div>

                {/* memory badge — the payoff of a persistent cast */}
                {g.mood === 'cold' && (
                  <div className="rounded-full border border-red/50 px-2 py-0.5 text-[10px] font-medium text-red">
                    🧊 remembers you {g.grudge || 'let them down'}
                  </div>
                )}
                {g.mood === 'warm' && (
                  <div className="rounded-full border border-green/50 px-2 py-0.5 text-[10px] font-medium text-green">
                    💛 on good terms with you
                  </div>
                )}

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

        {/* settlement — the fallout writes back to the cast's memory */}
        {over && fallout && (
          <div className="w-full max-w-3xl rounded-xl border border-[var(--color-blush)] bg-surface-hi p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wide text-[var(--color-gold)]">THE FALLOUT · they'll remember this</span>
              <span className="text-[11px] text-muted">
                ＋10 rep · now <span className="font-data text-ink">{fallout.events}</span> brokered
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(fallout.fallout || []).map((f: any) => (
                <div key={f.id} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface p-2.5 text-center">
                  <GuestPortrait id={f.id} mood={f.approved ? 'happy' : 'annoyed'} className="h-10 w-10 rounded-full" />
                  <div className="text-[11px] font-bold text-blush">{f.name}</div>
                  <div className={'font-data text-[11px] ' + (f.delta > 0 ? 'text-green' : 'text-red')}>
                    {f.delta > 0 ? `▲ +${f.delta}` : `▼ ${f.delta}`} regard
                  </div>
                  <div className="text-[10px] leading-snug text-muted">
                    {f.grudge
                      ? `now holds it against you that you ${f.grudge}`
                      : f.cleared
                        ? `forgave that you ${f.cleared}`
                        : f.approved
                          ? 'warmer toward you'
                          : ''}
                  </div>
                </div>
              ))}
            </div>
            {state?.epilogue && <div className="mt-3 border-t border-border pt-3 text-center text-sm text-ink">{state.epilogue}</div>}
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="primary" onClick={nextEvent}>
                Next wedding →
              </Button>
              <Button onClick={onVerify}>Verify chain</Button>
            </div>
          </div>
        )}

        {/* pre-settlement controls */}
        {!over && (
          <div className="flex gap-2 pb-2">
            <Button onClick={nextEvent}>Restart event</Button>
            <Button onClick={onVerify}>Verify chain</Button>
          </div>
        )}
        <div className="min-h-[18px] pb-2 text-sm text-muted">{verdict}</div>
      </div>
    </div>
  )
}
