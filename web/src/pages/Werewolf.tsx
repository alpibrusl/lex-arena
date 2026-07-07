import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { callSkill, verifyChain } from '../lib/api'
import { useEvents } from '../lib/useEvents'
import { VillageScene, PlayerPortrait, RoleBadge } from '../components/WerewolfArt'

type LogEntry = { kind: string; seat: number; name: string; text: string }

export function Werewolf() {
  const [state, setState] = useState<any>(null)
  const [visibleLog, setVisibleLog] = useState<LogEntry[]>([])
  const [typing, setTyping] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [speakText, setSpeakText] = useState('')
  const [verdict, setVerdict] = useState('')
  // The player's private advisor — a strategy sounding board, not one of the
  // five seats. It sees only what you see, so it can't leak hidden roles.
  const [advisorLog, setAdvisorLog] = useState<{ q: string; a: string }[]>([])
  const [adviseText, setAdviseText] = useState('')
  const [advising, setAdvising] = useState(false)
  // Post-game confessions: each AI seat reveals, in hindsight, how it played.
  const [reveals, setReveals] = useState<{ seat: number; name: string; role: string; won: boolean; text: string }[] | null>(null)
  const [revealing, setRevealing] = useState(false)
  const tokenRef = useRef('')
  const seenLogLen = useRef(0)

  const fetchState = useCallback(async () => setState(await callSkill('ww_state')), [])

  const newGame = useCallback(async () => {
    setBusy(true)
    setVisibleLog([])
    setTyping(null)
    setVerdict('')
    setAdvisorLog([])
    setAdviseText('')
    setReveals(null)
    seenLogLen.current = 0
    const j = await callSkill<{ token?: string }>('ww_new')
    if (j?.token) tokenRef.current = j.token
    await fetchState()
    setBusy(false)
  }, [fetchState])

  // Reveal any new log entries with a staggered "typing…" beat, so the AI
  // discussion reads like it's happening live rather than dumped at once.
  const revealNewLog = useCallback(async (log: LogEntry[]) => {
    const fresh = log.slice(seenLogLen.current)
    for (const entry of fresh) {
      if (entry.kind === 'say' && entry.name !== 'You') {
        setTyping(entry.name)
        await new Promise((r) => setTimeout(r, 700))
        setTyping(null)
      }
      setVisibleLog((prev) => [...prev, entry])
      await new Promise((r) => setTimeout(r, 120))
    }
    seenLogLen.current = log.length
  }, [])

  const doNight = useCallback(
    async (target: number) => {
      setBusy(true)
      const fresh = await callSkill<any>('ww_night', { target, token: tokenRef.current })
      const s = await callSkill<any>('ww_state')
      setState(s)
      if (s?.log) await revealNewLog(s.log)
      setBusy(false)
      void fresh
    },
    [revealNewLog],
  )

  const doDiscuss = useCallback(async () => {
    setBusy(true)
    await callSkill('ww_discuss', { text: speakText })
    setSpeakText('')
    const s = await callSkill<any>('ww_state')
    setState(s)
    if (s?.log) await revealNewLog(s.log)
    setBusy(false)
  }, [speakText, revealNewLog])

  const doVote = useCallback(
    async (target: number) => {
      setBusy(true)
      await callSkill('ww_vote', { target })
      const s = await callSkill<any>('ww_state')
      setState(s)
      if (s?.log) await revealNewLog(s.log)
      setBusy(false)
    },
    [revealNewLog],
  )

  const doAdvise = useCallback(async () => {
    const q = adviseText.trim()
    if (!q || advising) return
    setAdvising(true)
    setAdviseText('')
    setAdvisorLog((prev) => [...prev, { q, a: '' }])
    const r = await callSkill<{ answer?: string }>('ww_advise', { text: q })
    setAdvisorLog((prev) => {
      const next = [...prev]
      next[next.length - 1] = { q, a: r?.answer ?? "I couldn't think of anything useful just now — try asking again." }
      return next
    })
    setAdvising(false)
  }, [adviseText, advising])

  const doReveal = useCallback(async () => {
    if (revealing) return
    setRevealing(true)
    const r = await callSkill<{ reveals?: any[] }>('ww_reveal')
    setReveals(r?.reveals ?? [])
    setRevealing(false)
  }, [revealing])

  const onVerify = useCallback(async () => {
    const v = await verifyChain('ww') // matches the g_record/g_match prefix used server-side, not the lex-games verifier's registered name ("werewolf")
    setVerdict(
      v?.valid
        ? `✓ chain verified — ${v.count} entries, every link intact (roles were sealed before anyone played)`
        : '✗ chain BROKEN — the game record was altered',
    )
  }, [])

  const handleEvent = useCallback(async () => fetchState(), [fetchState])
  const live = useEvents(handleEvent)

  useEffect(() => {
    newGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const phase: string = state?.phase ?? 'night'
  const day: number = state?.day ?? 1
  const winner: string = state?.winner ?? ''
  const you = state?.you ?? { role: '', alive: true, needs_night: false, seen: [] }
  const players: any[] = state?.players ?? []
  const over = !!winner

  const livingOthers = players.filter((p) => p.alive && !p.you)

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header meta="five seats, one wolf among them · the roles are sealed before anyone plays a single turn · every action is capability-gated" back live={live} />
      <div className="flex flex-1 min-h-0 flex-col items-center gap-4 overflow-y-auto p-4">
        <VillageScene night={phase === 'night'} className="h-[76px] w-full max-w-3xl rounded-xl border border-border" />

        <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-4 text-xs text-muted">
          <span className="rounded-full border border-border px-2.5 py-1">
            {over ? 'GAME OVER' : phase === 'night' ? `🌙 Night ${day}` : phase === 'vote' ? `🗳️ Day ${day} — Vote` : `☀️ Day ${day} — Discuss`}
          </span>
          {you.role && <RoleBadge role={you.role} />}
          <span className="text-[11px] text-faint">🔒 roles sealed to the trail at game start</span>
        </div>

        {you.seen && you.seen.length > 0 && (
          <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-1.5 text-[11px]">
            <span className="text-muted">you know:</span>
            {you.seen.map((s: any) => (
              <span key={s.seat} className="rounded-full border border-violet/50 px-2 py-0.5 text-violet">
                {s.name} is the {s.role}
              </span>
            ))}
          </div>
        )}

        {/* player roster */}
        <div className="grid w-full max-w-3xl grid-cols-5 gap-2">
          {players.map((p) => (
            <div key={p.seat} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface-hi p-2 text-center">
              <PlayerPortrait seat={p.seat} mood={p.you ? 'you' : p.alive ? 'alive' : 'dead'} role={p.role} className="h-11 w-11 rounded-full" />
              <div className={'text-[11px] font-bold ' + (p.alive ? 'text-ink' : 'text-faint line-through')}>{p.name}</div>
              {p.role && <RoleBadge role={p.role} className="!text-[9px]" />}
              {!p.alive && !p.role && <span className="text-[10px] text-faint">dead</span>}
            </div>
          ))}
        </div>

        {/* transcript */}
        <div className="flex w-full max-w-3xl flex-col gap-2 rounded-xl border border-border bg-surface-hi p-3">
          {visibleLog.map((l, i) => (
            <div key={i} className="animate-bubble-in text-sm">
              {l.kind === 'say' ? (
                <div className="flex items-start gap-2">
                  <PlayerPortrait seat={l.seat} mood="alive" className="h-7 w-7 shrink-0 rounded-full" />
                  <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-3 py-1.5">
                    <span className="mr-1.5 text-[10px] font-bold text-blue">{l.name}:</span>
                    {l.text}
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs italic text-muted">{l.text}</div>
              )}
            </div>
          ))}
          {typing && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border bg-surface px-3 py-2">
                <span className="text-[10px] text-muted">{typing}</span>
                <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted [animation-delay:300ms]" />
              </div>
            </div>
          )}
          {visibleLog.length === 0 && !typing && <div className="py-2 text-center text-xs text-faint">Nothing has happened yet.</div>}
        </div>

        {/* phase controls */}
        {!over && phase === 'night' && (
          <div className="flex flex-col items-center gap-2">
            {you.needs_night && you.role === 'seer' ? (
              <>
                <div className="text-sm text-ink">Choose someone to secretly inspect:</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {livingOthers.map((p) => (
                    <Button key={p.seat} disabled={busy} onClick={() => doNight(p.seat)}>
                      {p.name}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <Button variant="primary" disabled={busy} onClick={() => doNight(-1)}>
                {busy ? 'The night unfolds…' : 'Let the night pass'}
              </Button>
            )}
          </div>
        )}

        {!over && phase === 'day' && (
          <div className="flex w-full max-w-3xl flex-col items-center gap-2">
            <div className="flex w-full gap-2">
              <input
                value={speakText}
                onChange={(e) => setSpeakText(e.target.value)}
                placeholder="Say something to the table (optional)…"
                className="flex-1 rounded-lg border border-border bg-surface-hi px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-amber focus:outline-none"
              />
            </div>
            <Button variant="primary" disabled={busy} onClick={doDiscuss}>
              {busy ? 'The table is talking…' : 'Open the discussion'}
            </Button>
          </div>
        )}

        {!over && phase === 'vote' && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm text-ink">Who do you vote to eliminate?</div>
            <div className="flex flex-wrap justify-center gap-2">
              {livingOthers.map((p) => (
                <Button key={p.seat} variant="danger" disabled={busy} onClick={() => doVote(p.seat)}>
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {over && (
          <div className="flex w-full max-w-3xl flex-col gap-3">
            <div className="rounded-xl border border-[var(--color-violet)] bg-surface-hi p-4 text-center">
              <div className="mb-1 text-[11px] font-bold tracking-wide text-violet">GAME OVER</div>
              <div className="text-base font-bold text-ink">
                {winner === 'town' ? '🌾 The town caught the wolf!' : '🐺 The wolf fooled the whole village.'}
              </div>
            </div>

            {/* the payoff: each AI seat confesses how it actually played */}
            {reveals === null ? (
              <Button variant="primary" disabled={revealing} onClick={doReveal}>
                {revealing ? 'They’re owning up…' : '🎭 How did they really play?'}
              </Button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-hi p-3">
                <div className="text-xs font-bold text-muted">THE CONFESSIONS — how each agent really played</div>
                {reveals.map((r) => (
                  <div key={r.seat} className="flex items-start gap-2 animate-bubble-in">
                    <PlayerPortrait seat={r.seat} mood="alive" role={r.role} className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="flex flex-col gap-1 rounded-2xl rounded-tl-sm border border-border bg-surface px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-ink">{r.name}</span>
                        <RoleBadge role={r.role} className="!text-[9px]" />
                        <span className={'text-[9px] font-bold ' + (r.won ? 'text-green' : 'text-faint')}>{r.won ? 'won' : 'lost'}</span>
                      </div>
                      <div className="text-sm text-ink">{r.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* private advisor — your own agent, separate from the five seats */}
        {!over && (
          <div className="flex w-full max-w-3xl flex-col gap-2 rounded-xl border border-violet/40 bg-violet/5 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-violet">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-violet/20">🧠</span>
              Your advisor
              <span className="font-normal text-faint">— private. Sees only what you see. Talk strategy before you act.</span>
            </div>

            {advisorLog.length > 0 && (
              <div className="flex flex-col gap-2">
                {advisorLog.map((m, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="self-end rounded-2xl rounded-tr-sm bg-surface px-3 py-1.5 text-sm text-ink">{m.q}</div>
                    <div className="animate-bubble-in self-start rounded-2xl rounded-tl-sm border border-violet/30 bg-surface-hi px-3 py-1.5 text-sm text-ink">
                      {m.a ? m.a : <span className="inline-flex items-center gap-1 text-muted">
                        thinking
                        <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-violet [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-violet [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-violet [animation-delay:300ms]" />
                      </span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex w-full gap-2">
              <input
                value={adviseText}
                onChange={(e) => setAdviseText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doAdvise() }}
                placeholder={advisorLog.length ? 'Ask a follow-up…' : 'e.g. Who seems most suspicious, and what should I say?'}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-violet focus:outline-none"
              />
              <Button disabled={advising || !adviseText.trim()} onClick={doAdvise}>
                {advising ? 'Thinking…' : 'Ask'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pb-2">
          <Button onClick={newGame}>New game</Button>
          <Button onClick={onVerify}>Verify chain</Button>
        </div>
        <div className="min-h-[18px] pb-2 text-sm text-muted">{verdict}</div>
      </div>
    </div>
  )
}
