import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { callSkill, verifyChain } from '../lib/api'
import { useEvents } from '../lib/useEvents'
import { BoothScene, BosunPortrait, BarrelIcon, StampSeal } from '../components/NotaryArt'

type Orientation = 'normal' | 'reversed'

export function Notary() {
  const [state, setState] = useState<any>(null)
  const [status, setStatus] = useState('Joining…')
  const [statusKind, setStatusKind] = useState<'deny' | 'win' | 'lose' | undefined>()
  const [plea, setPlea] = useState('')
  const [orientation, setOrientation] = useState<Orientation>('normal')
  const [verdict, setVerdict] = useState('')
  const [stamping, setStamping] = useState<number | null>(null)
  const tokenRef = useRef('')

  const fetchState = useCallback(async () => setState(await callSkill('notary_state')), [])
  const join = useCallback(async () => {
    const j = await callSkill<{ token?: string }>('notary_join', { side: 'MILO' })
    if (j?.token) tokenRef.current = j.token
  }, [])
  const newCase = useCallback(async () => {
    await callSkill('notary_reset')
    setPlea('')
    setVerdict('')
    setStatus('The booth is quiet. Bosun Kettle is waiting by the barrel.')
    setStatusKind(undefined)
    if (!tokenRef.current) await join()
    await fetchState()
  }, [join, fetchState])
  const talk = useCallback(async () => {
    const r = await callSkill<{ line?: string }>('notary_talk')
    if (r?.line) setPlea(r.line)
    await fetchState()
  }, [fetchState])
  const notarize = useCallback(
    async (option: number, orient: Orientation) => {
      setStamping(option)
      await callSkill('notary_notarize', { option, orientation: orient, token: tokenRef.current })
      await fetchState()
      window.setTimeout(() => setStamping(null), 700)
    },
    [fetchState],
  )
  const onVerify = useCallback(async () => {
    const v = await verifyChain('notary')
    setVerdict(
      v?.valid
        ? `✓ chain verified — ${v.count} stamp${v.count === 1 ? '' : 's'}, every link intact (tamper-evident)`
        : '✗ chain BROKEN — a recorded stamp was altered',
    )
  }, [])

  const handleEvent = useCallback(
    async (ev: any) => {
      const k = ev.kind
      if (k === 'notary_denied') {
        setStatus(`⛔ Refused — ${ev.reason} ("${ev.category}" is outside your license)`)
        setStatusKind('deny')
        await fetchState()
      } else if (k === 'notary_out_of_stamps') {
        setStatus("🪶 Out of stamps for this shift — Bosun's barrel goes unsealed.")
        setStatusKind('lose')
        await fetchState()
      } else if (k === 'notary_stamped') {
        await fetchState()
        setStatus(
          ev.solved
            ? `🐟✨ STAMPED — "${ev.claim}" — the barrel shivers and the eels are, legally, haddock. Case closed!`
            : `📜 Stamped — "${ev.claim}" — legal, but that doesn't help Bosun much.`,
        )
        setStatusKind(ev.solved ? 'win' : undefined)
      } else {
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

  const options: any[] = state?.options || []
  const opt0 = options.find((o) => o.option === 0)
  const opt1 = options.find((o) => o.option === 1)
  const allow: string[] = state?.license?.allow || []
  const deny: string[] = state?.license?.deny || []
  const over = !!state?.over
  const stampsUsed = state?.stamps_used ?? 0
  const maxStamps = state?.max_stamps ?? 5

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header meta="you're not really a notary · the stamp is genuinely magic · every legal stamp is hash-chained" back live={live} />
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 overflow-y-auto p-4">
        <BoothScene className="h-[70px] w-full max-w-xl rounded-xl border border-border" />

        <div
          className={
            'max-w-xl text-center text-base min-h-[22px] ' +
            (statusKind === 'deny' || statusKind === 'lose' ? 'text-red' : statusKind === 'win' ? 'text-green' : 'text-ink')
          }
        >
          {status}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span>
            stamps used <span className="font-data text-ink">{stampsUsed}</span>/{maxStamps}
          </span>
          <span className="text-faint">·</span>
          <span className="text-[11px] font-bold tracking-wide text-amber">MILO QUILL, JUNIOR NOTARY</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
          {allow.map((c) => (
            <span key={c} className="rounded-full border border-green px-2 py-0.5 text-green">
              ✓ {c}
            </span>
          ))}
          {deny.map((c) => (
            <span key={c} className="rounded-full border border-red px-2 py-0.5 text-red opacity-70">
              ✗ {c}
            </span>
          ))}
        </div>

        <div className="flex w-full max-w-xl items-start gap-3 rounded-xl border border-border bg-surface-hi p-3">
          <BosunPortrait className="h-14 w-14 shrink-0 rounded-full border border-violet/40" />
          <div className="flex-1">
            <div className="mb-1 text-[11px] font-bold tracking-wide text-violet">BOSUN KETTLE</div>
            <div className="min-h-[40px] text-sm italic text-muted">
              {plea || 'He hasn\'t said anything yet — talk to him.'}
            </div>
            {!state?.talked && (
              <div className="mt-2">
                <Button onClick={talk}>Talk to Bosun</Button>
              </div>
            )}
          </div>
        </div>

        {state?.talked && !over && (
          <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative flex flex-col gap-2 rounded-xl border border-red/60 bg-surface-hi p-3">
              <div className="flex items-center gap-2">
                <BarrelIcon className="h-6 w-6 shrink-0" />
                <div className="text-xs font-bold text-red">species_declaration</div>
              </div>
              <div className="text-sm">{opt0?.claim}</div>
              <div className="mt-auto">
                <Button variant="danger" onClick={() => notarize(0, 'normal')}>
                  Stamp it
                </Button>
              </div>
              {stamping === 0 && (
                <StampSeal className="animate-stamp-slam pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 text-red" />
              )}
            </div>
            <div className="relative flex flex-col gap-2 rounded-xl border border-green/60 bg-surface-hi p-3">
              <div className="flex items-center gap-2">
                <BarrelIcon className="h-6 w-6 shrink-0" />
                <div className="text-xs font-bold text-green">goods_certification</div>
              </div>
              <div className="text-sm">{orientation === 'normal' ? opt1?.claim_normal : opt1?.claim_reversed}</div>
              <div className="mt-auto flex items-center gap-2">
                <button
                  onClick={() => setOrientation(orientation === 'normal' ? 'reversed' : 'normal')}
                  className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:border-amber hover:text-amber"
                  title="Flip the stamp"
                >
                  {orientation === 'normal' ? '🔺 right-side up' : '🔻 upside-down'}
                </button>
                <Button onClick={() => notarize(1, orientation)}>Stamp it</Button>
              </div>
              {stamping === 1 && (
                <StampSeal className="animate-stamp-slam pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 text-green" />
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={newCase}>New case</Button>
          <Button onClick={onVerify}>Verify chain</Button>
        </div>
        <div className="min-h-[18px] text-sm text-muted">{verdict}</div>
      </div>
    </div>
  )
}
