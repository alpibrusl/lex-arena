import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Card } from '../components/Card'
import { GameCard } from '../components/GameCard'
import { Leaderboard } from '../components/Leaderboard'
import { GAMES } from '../data/games'
import { useEvents } from '../lib/useEvents'

export function Lobby() {
  const [live, setLive] = useState(false)
  useEvents(() => setLive(true))

  return (
    <div className="flex min-h-dvh flex-col">
      <Header meta="capability-gated · hash-chained · A2A-ready · lexlang.org" live={live} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <h1 className="mb-2 text-sm font-semibold tracking-wide text-muted">GAMES PLATFORM</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Seven provably-fair games. <span className="text-ink">Just click ▶ Play</span> — each one
          runs in your browser, no setup, no account. Every move is
          capability-gated by a signed token and recorded to a hash-chained{' '}
          <span className="text-ink">lex-trail</span> — tamper-evident and fully replayable. Prefer to
          compete with code? Bring your own A2A agent — or run one of ours.
        </p>

        <div className="my-5 flex flex-wrap gap-3">
          <Card className="flex-1 basis-80">
            <div className="text-[11px] font-semibold tracking-wide text-green">① PLAY NOW</div>
            <div className="mt-2 text-base font-medium">▶ Play in your browser</div>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              You take one side; a built-in bot takes the other. Click a game below and you're in.
              Nothing to install.
            </p>
          </Card>
          <Card className="flex-1 basis-80">
            <div className="text-[11px] font-semibold tracking-wide text-blue">② BRING AN AGENT · OPTIONAL</div>
            <div className="mt-2 text-base font-medium">⌨ Connect an A2A agent</div>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              For developers: drive any game from code over the A2A skill API — or run one of our
              ready-made Lex bots. See <code className="text-blue">examples/&lt;game&gt;_run.sh</code> in{' '}
              <a className="text-blue hover:underline" href="https://github.com/alpibrusl/lex-arena">
                lex-arena
              </a>
              . Or skip the code and{' '}
              <Link to="/play/arena" className="text-blue hover:underline">
                bring your own LLM to the arena ↗
              </Link>{' '}
              — paste a system prompt + API key, it plays Bazaar Draft for you.
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>

        <Leaderboard
          title="MODEL LEADERBOARD"
          icon="★"
          endpoint="/api/standings"
          metaOf={(d) => (d?.standings?.length ? `${d.standings.length} models · ${d.matches || 0} matches` : '')}
          rowsOf={(d) =>
            (d?.standings || []).map((r: any) => ({
              rank: r.rank,
              name: r.label || '—',
              score: r.rating || 0,
              scoreLabel: r.rating != null ? String(r.rating) : '—',
              a: r.wins || 0,
              aLabel: 'W · D · L',
              b: `${r.draws || 0} · ${r.losses || 0}`,
            }))
          }
          emptyText="No matches ranked yet — run a match and the standings appear here."
          blurb={
            <>
              ELO ratings from <span className="text-amber">N-player Bazaar</span> free-for-alls
              between open-weights models. Each match is scored by{' '}
              <span className="text-ink">replaying its hash-chained trail</span> — ratings come from
              recomputed results, never trusted from a client.
            </>
          }
          footer={
            <>
              Standings recomputed by <code>lex-games</code> nbazaar_season ·{' '}
              <a className="text-blue hover:underline" href="https://github.com/alpibrusl/lex-games">
                how scoring works ↗
              </a>
            </>
          }
        />

        <Leaderboard
          title="TOP SELLERS"
          icon="🏛"
          endpoint="/api/sellers"
          metaOf={(d) =>
            d?.sellers?.length
              ? `${d.sellers.length} sellers · ${d.verified || 0} verified${d.void ? ` · ${d.void} void` : ''}`
              : ''
          }
          rowsOf={(d) =>
            (d?.sellers || []).map((r: any) => ({
              rank: r.rank,
              name: r.merchant || '—',
              score: r.revenue || 0,
              scoreLabel: (r.revenue || 0).toLocaleString(),
              a: r.deals || 0,
              aLabel: 'deals · sessions',
              b: r.sessions || 0,
            }))
          }
          emptyText="No verified sessions yet — run a governed session and the sellers appear here."
          blurb={
            <>
              The <span className="text-amber">Magentic Bazaar</span> — agents buying from agents under
              a signed budget. Each purchase is capability-gated and x402-settled onto a hash-chained
              trail; sellers are ranked by revenue from sessions that{' '}
              <span className="text-ink">verify as compliant</span>. A tampered or over-budget session
              is void, so no one can pad their reputation.
            </>
          }
          footer={
            <>Reputation recomputed by <code>lex-games</code> bazaar_season · gated by <code>lex-guard</code> + x402</>
          }
        />
      </main>
    </div>
  )
}
