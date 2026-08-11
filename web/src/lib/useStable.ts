import { useCallback, useEffect, useRef, useState } from 'react'
import { callSkill, verifyChain } from './api'

// A Stable is NOT a match — it's the async idle economy behind Stable Training
// (lex-games' src/games/stable_training.lex): a persistent agent that earns a
// budget over real elapsed time between visits, reinvests it into automation
// tiers, and can prestige for a permanent rate bonus. There is no "turn" and
// no opponent, so this hook is deliberately NOT a usePoolGame clone — the
// thing worth surfacing here is what happened *while you were away*, not a
// live back-and-forth.
//
// Assumed skill contract (server-side; not yet implemented — see the "not yet
// real" note in Stable.tsx). The `_state` skill is expected to return exactly
// the same shape as stable_training.lex's verdict_json(), because the play
// host computes live state by replaying the trail through the SAME verifier
// this repo's arena worker uses offline — one source of truth, not a
// duplicated live-state model that could drift from the verified one:
//
//   stable_join({ agent_id })       -> { token }
//   stable_state()                  -> Verdict  (see StableState below)
//   stable_checkpoint({ action, token }) -> Verdict
//   stable_grant({ token })         -> { grant, capability, level, source_root, expires_at_ms }
//   game_verify({ game: 'stable_training' }) -> { valid, count }

export interface StableState {
  verified: boolean
  intact: boolean
  legal: boolean
  has_agent: boolean
  agent_id: string
  budget: number
  tier: number
  prestige_count: number
  lifetime_budget: number
  capability_level: number
  checkpoints: number
  score: number
}

export type StableAction = 'invest' | 'prestige' | 'idle'

interface GrantResult {
  grant: string
  capability: string
  level: number
  source_root: string
  expires_at_ms: number
}

const CACHE_KEY = 'stable_last_seen'

export function useStable(agentId: string) {
  const [state, setState] = useState<StableState | null>(null)
  const [status, setStatus] = useState('Connecting to your stable…')
  const [welcomeBack, setWelcomeBack] = useState<{ budget: number; ms: number } | null>(null)
  const [verdict, setVerdict] = useState('')
  const [grant, setGrant] = useState<GrantResult | null>(null)
  const [busy, setBusy] = useState(false)
  const tokenRef = useRef('')

  const fetchState = useCallback(async () => {
    const s = await callSkill<StableState>('stable_state')
    if (s) setState(s)
    return s
  }, [])

  // On first load: join (or resume) the stable, then compare the freshly
  // replayed budget against whatever we last saw client-side. The gap IS the
  // "offline progress" summary — it's not a client guess, it's the same
  // server-recomputed number `stable_state` always returns; we're just
  // diffing it against a locally cached prior read to phrase it as "while
  // you were away" instead of a bare number.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const j = await callSkill<{ token?: string }>('stable_join', { agent_id: agentId })
      if (j?.token) tokenRef.current = j.token
      const s = await fetchState()
      if (cancelled || !s) return

      const cached = window.localStorage.getItem(`${CACHE_KEY}_${agentId}`)
      const prev = cached ? (JSON.parse(cached) as { budget: number; lifetime_budget: number; ts: number }) : null
      if (prev && s.lifetime_budget > prev.lifetime_budget) {
        setWelcomeBack({ budget: s.lifetime_budget - prev.lifetime_budget, ms: Date.now() - prev.ts })
      }
      window.localStorage.setItem(
        `${CACHE_KEY}_${agentId}`,
        JSON.stringify({ budget: s.budget, lifetime_budget: s.lifetime_budget, ts: Date.now() }),
      )
      setStatus(s.tier >= 0 ? 'Your stable is training.' : 'Joined — first checkpoint pending.')
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId])

  const checkpoint = useCallback(
    async (action: StableAction) => {
      if (busy) return
      setBusy(true)
      try {
        const s = await callSkill<StableState>('stable_checkpoint', { action, token: tokenRef.current })
        if (s) {
          setState(s)
          window.localStorage.setItem(
            `${CACHE_KEY}_${agentId}`,
            JSON.stringify({ budget: s.budget, lifetime_budget: s.lifetime_budget, ts: Date.now() }),
          )
          if (!s.legal) setStatus('⛔ rejected by the rules — that checkpoint recorded, but scored no effect')
          else if (action === 'prestige' && s.prestige_count > (state?.prestige_count ?? 0)) {
            setStatus(`✨ Prestiged — permanent rate bonus applied, tier reset to 0`)
          } else if (action === 'invest' && s.tier > (state?.tier ?? 0)) {
            setStatus(`⬆ Invested — automation tier ${s.tier}`)
          } else {
            setStatus(action === 'invest' ? 'Not enough saved yet for the next tier — still accruing.' : 'Checkpoint recorded.')
          }
        }
      } finally {
        setBusy(false)
      }
    },
    [busy, agentId, state],
  )

  const onVerify = useCallback(async () => {
    const v = await verifyChain('stable_training')
    setVerdict(
      v?.valid
        ? `✓ chain verified — ${v.count} checkpoints, every link intact (tamper-evident)`
        : '✗ chain BROKEN — a recorded checkpoint was altered',
    )
  }, [])

  // "Cash out" training into a signed capability_grant a match verifier can
  // trust without re-replaying this whole stable's history. Only meaningful
  // once verified — the button is disabled otherwise (see Stable.tsx).
  const mintGrant = useCallback(async () => {
    const g = await callSkill<GrantResult>('stable_grant', { token: tokenRef.current })
    if (g) setGrant(g)
  }, [])

  return { state, status, welcomeBack, verdict, grant, busy, checkpoint, onVerify, mintGrant, refresh: fetchState }
}
