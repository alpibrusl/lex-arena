import { useState } from 'react'
import { Header } from '../components/Header'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { useStable } from '../lib/useStable'

// Mirrors src/games/stable_training.lex's constants — for the progress bar
// only. The server (once it exists) is the sole source of truth for whether
// an invest actually lands; this is display-only, same spirit as every other
// page here ("the client never decides a move is legal, it just asks").
const BASE_RATE = 10
const tierCost = (tier: number) => 100 * 2 ** tier
const CAPABILITY_CAP = 10

function fmtAgo(ms: number) {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.round(m / 60)}h`
}

export function Stable() {
  const [agentId] = useState(() => {
    const existing = window.localStorage.getItem('stable_agent_id')
    if (existing) return existing
    const fresh = `stable-${Math.random().toString(36).slice(2, 8)}`
    window.localStorage.setItem('stable_agent_id', fresh)
    return fresh
  })
  const { state, status, welcomeBack, verdict, grant, busy, checkpoint, onVerify, mintGrant } = useStable(agentId)

  const progress = state ? Math.min(100, Math.round((state.budget / tierCost(state.tier)) * 100)) : 0

  return (
    <div className="flex min-h-dvh flex-col">
      <Header meta="idle economy · earns while you're away · trains a capability_level for other matches" back />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <Card className="mb-4 border-border-hi bg-surface-hi text-xs leading-relaxed text-muted">
          <span className="font-semibold text-amber">Not wired to a server yet.</span> This page calls{' '}
          <code className="font-data">stable_join / stable_state / stable_checkpoint / stable_grant</code>, a skill
          contract that doesn't exist on the play host yet — it's designed to match{' '}
          <a
            className="text-blue hover:underline"
            href="https://github.com/alpibrusl/lex-games/blob/main/src/games/stable_training.lex"
          >
            lex-games' stable_training.lex
          </a>{' '}
          verdict shape exactly, so once a sidecar skill replays the trail through that same verifier, this UI
          should work unmodified. Every button below will no-op until then.
        </Card>

        <h1 className="mb-1 text-sm font-semibold tracking-wide text-muted">YOUR STABLE</h1>
        <p className="mb-4 text-sm text-muted">
          Agent <code className="font-data text-ink">{agentId}</code> — budget accrues from real elapsed time
          between visits, not a countdown you have to watch.
        </p>

        {welcomeBack && (
          <Card className="mb-4 border-green/40 bg-[#0d1f16]">
            <div className="text-sm">
              <span className="text-green">While you were away</span> (~{fmtAgo(welcomeBack.ms)}):{' '}
              <b className="text-ink">+{welcomeBack.budget} budget</b> earned, recomputed server-side from your
              stable's actual idle time — not a client guess.
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Status</h2>
              {state?.verified && <Badge>verified</Badge>}
            </div>

            <div className={'text-sm ' + (state && !state.legal ? 'text-red' : 'text-ink')}>{status}</div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-[11px] text-muted">TIER</div>
                <div className="text-lg font-semibold text-amber">{state?.tier ?? '—'}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted">PRESTIGE</div>
                <div className="text-lg font-semibold text-violet">{state?.prestige_count ?? '—'}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted">CAPABILITY</div>
                <div className="text-lg font-semibold text-blue">
                  {state?.capability_level ?? '—'}
                  <span className="text-xs text-muted"> / {CAPABILITY_CAP}</span>
                </div>
              </div>
            </div>

            {state && (
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-muted">
                  <span>budget {state.budget}</span>
                  <span>next tier at {tierCost(state.tier)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-hi">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber to-gold transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="primary" disabled={busy} onClick={() => checkpoint('invest')}>
                ⬆ Invest
              </Button>
              <Button disabled={busy} onClick={() => checkpoint('prestige')}>
                ✨ Prestige
              </Button>
              <Button disabled={busy} onClick={() => checkpoint('idle')}>
                ↻ Checkpoint (just anchor time)
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button onClick={onVerify}>Verify chain</Button>
              {state && (
                <Button disabled={!state.verified} onClick={mintGrant}>
                  Mint capability grant
                </Button>
              )}
            </div>
            {verdict && <div className={'text-xs ' + (verdict.startsWith('✓') ? 'text-green' : 'text-red')}>{verdict}</div>}
            {grant && (
              <div className="rounded-lg border border-border bg-surface-hi p-2 font-data text-xs leading-relaxed text-muted">
                <div>
                  grant token <span className="text-ink">{grant.grant.slice(0, 24)}…</span>
                </div>
                <div>
                  capability <span className="text-blue">{grant.capability}</span> · level{' '}
                  <span className="text-amber">{grant.level}</span>
                </div>
                <div>
                  source trail <span className="text-ink">{grant.source_root.slice(0, 16)}…</span> — any match
                  verifier can check this signature without re-replaying your training history.
                </div>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-2 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Lifetime</h2>
            <div className="flex justify-between">
              <span className="text-muted">lifetime budget earned</span>
              <span className="font-semibold text-amber">{state?.lifetime_budget ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">checkpoints</span>
              <span>{state?.checkpoints ?? '—'}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              A base rate of {BASE_RATE}/s scales with tier; prestige resets tier and budget for a permanent rate
              bonus. Every number here is re-derived from real elapsed time plus your recorded actions — nothing is
              a claimed value the server just trusts.
            </p>
          </Card>
        </div>
      </main>
    </div>
  )
}
