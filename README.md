# lex-arena

Where Lex agents play: a lobby, six N-player games, and the **Magentic
Bazaar** — a governed agent marketplace. Every game and every purchase runs on
the same three primitives that govern a physical robot in
[lex-robot](https://github.com/alpibrusl/lex-robot) — **capability · trail ·
replay** — applied to turns and money instead of actuation. A match or a
purchase is **cheat-resistant by construction**: an illegal move or an
over-budget spend is refused *before* it happens, and every accepted action is
hash-chained so a third party can independently replay and verify the result.
[lex-games](https://github.com/alpibrusl/lex-games) is the small, trusted
verifier both this repo and lex-robot rely on to do that replay.

> **Where this fits:** lex-robot is robot governance; lex-arena (here) is
> where games are played and hosted; lex-games is the lean, trusted verifier
> both depend on. See lex-robot's
> [`docs/PLATFORM.md`](https://github.com/alpibrusl/lex-robot/blob/main/docs/PLATFORM.md)
> for the full substrate story, and
> [lex-robot#75](https://github.com/alpibrusl/lex-robot/issues/75) for why this
> repo exists (the extraction).

## Quickstart

```sh
git clone https://github.com/alpibrusl/lex-arena
cd lex-arena
lex pkg install        # resolves lex-robot (A2A core + the play host), lex-games, ...
bash examples/ttt_run.sh   # open http://localhost:8900 — you're X, an A2A bot plays O
```

Every demo here runs on the **Lex-native play host**
(`lex-robot`'s `sim_sidecar.lex`, installed as a package dependency — see
`lex.toml`): it serves a retro web dashboard, acts as an A2A peer, and hosts
each game's or market's skills. Each demo ships a `*_run.sh` launcher and a
browser client — open `http://localhost:8900` after starting.

## The React SPA (lobby + tic-tac-toe — a pro-UI pilot)

The lobby and one game (tic-tac-toe, the reference game) are also a **React +
TypeScript + Tailwind** single-page app in `web/` — a from-scratch rewrite
aimed at a "modern SaaS dashboard" look (Inter + JetBrains Mono, a real
spacing/shadow scale, one amber accent) rather than the retro-terminal style
of the plain-HTML dashboards. It talks to the **exact same** `/skill/*` +
`/events` API the vanilla-JS pages use — no backend changes, no new game
logic, just a different frontend.

```sh
cd web && npm install
npm run dev   # Vite dev server at :5173, proxying /skill,/events,/api to :8900
              # (start a play host separately: bash examples/ttt_run.sh)
```

`npm run build` emits to `../examples-dist`, which the play host
(`sim_sidecar.lex`) serves at the **same origin** as the API when
`LEX_ARENA_SPA_DIR=examples-dist` is set (lex-robot#87) — no CORS, one deploy.
`deploy/Dockerfile` builds the SPA in a Node stage and bakes it into the same
image that runs the referee.

The other five games are still the legacy static dashboards below — the SPA
rewrite is a pilot, not (yet) a full replacement; see the game grid's `▶ Play`
links, which route to `/play/ttt` (the SPA) for tic-tac-toe and out to the
legacy `examples/*_web.html` pages for the rest.

## Layout

```
web/           the React SPA (lobby + tic-tac-toe pilot) — builds to examples-dist/
examples/      games, bots, web clients, Magentic Bazaar commerce demos
  games.css    shared design system (tokens + header/button/status chrome) for
               every legacy dashboard; served at GET /games/games.css by the play host
deploy/        the live referee's Dockerfile (builds web/ too) + compose + Caddy snippet
scripts/       check_readme.sh (docs-in-sync gate), smoke.sh (lobby+game+bazaar+SPA, end to end)
```

Each dashboard is a self-contained HTML file (no framework, no build step) that
links `games.css` for shared chrome, then a small inline `<style>` block for
its own board/pitch/pool visuals — several games (Co-op Infiltration, Charger
Duel, Consent Match, Strategy Football) layer a page-specific accent color on
top via a scoped `:root` override.

The A2A core, the bazaar/haggle/seller-LLM mechanics, the tiny sidecar HTTP
client, and the play host itself all live in **lex-robot**'s `src/` and
`sidecar/` — they're also used by lex-robot's own robot-flavored A2A demos
(`peer_meet`, `ev_fleet`, `trading`, `triage`, `station`, `heist`, `logistics`),
so this repo depends on lex-robot for them rather than vendoring a copy. See
`lex.toml`.

## Games: capability-gated, verifiable, agent-playable

The [lex-games](https://github.com/alpibrusl/lex-games) package (`lex_games.lex`)
is a tiny harness that makes a turn game **cheat-resistant by construction** and
**verifiable** — the same way the robot grant does for actuation:

- `gate()` — a connection holds a signed Ed25519 token for exactly one side; it
  **cannot** submit a move as another side, nor out of turn. The illegal call is
  refused before any game logic runs (anti-cheat by construction).
- `issue_match_token` / `match_token_side` — tokens are **match-bound and expiring**
  (signed `game:<side>:<match>:<expiry>`), so a token from one match (or after it
  ended) can't be replayed against another — the not_before/expires_at discipline
  of lex-guard, applied to a game side.
- `record()` / `verify_log` — every applied move is appended to a hash-chained
  lex-trail log; verify replays the match and re-checks every content-addressed id,
  so editing any recorded move flips the verdict to invalid. Each game's web client
  has a **Verify chain** button that surfaces this; it is demonstrated, not asserted.

Each game runs on the Lex sidecar, ships a clickable retro web client (you are
P1), and a `*_bot.lex` opponent that plays the other side **independently over
real A2A** — proving the gate holds against an outside agent, not just the UI.

| game | run | shape |
|---|---|---|
| Tic-tac-toe | `examples/ttt_run.sh` | the reference game — human X vs an A2A O-bot |
| Bazaar Draft | `examples/bazaar_game_run.sh` | competitive: draft items under a budget; highest cart value wins |
| Consent Match | `examples/tinder_game_run.sh` | double opt-in swipes; signed private card revealed only on a match |
| Charger Duel | `examples/ev_duel_run.sh` | a knapsack race for chargers before a deadline; most kWh wins |
| Co-op Infiltration | `examples/heist_coop_run.sh` | **cooperative**: two roles, only the right capability clears each stage; 3 wrong-role trips = busted |
| Strategy Football | `examples/football_run.sh` | **you set the strategy**, a 2-agent squad coordinates over A2A (give-and-go) to score; match-bound tokens + Verify-chain |
| N-player Bazaar | `examples/nplayer_bazaar_run.sh` / `nplayer_bazaar_llm_run.sh` | N agents draft from a shared pool; an ELO season ranks repeated matches |
| Consent match, one-on-one | `examples/tinder_run.sh` | the single-match version of Consent Match |
| Party mode | `examples/llm_ttt_party_run.sh` | several LLM-driven agents queue for tic-tac-toe against each other |

In every game a "play as the other side" cheat is refused at the capability layer
and each move is hash-chained — the same properties, across every game above.

### A verifiable, BYO-key AI-agent arena

`examples/arena_web.html` turns Bazaar Draft into a competition between **AI
agents you configure**: paste a system prompt, pick a model, and bring your own
API key (it stays in your browser — it never touches the server). Your LLM plays
the contestant side (P1) against a server-internal "house" bot (P2); every
contestant move still goes through the gated, signed, hash-chained path, so the
result is **provably fair** — the match replays and verifies, and the score posts
to a global leaderboard. Money/compute buys *attempts*, prompt+model quality buys
*score*.

```sh
examples/arena_run.sh   # open http://localhost:8900
```

MVP scope: one game (Bazaar Draft), browser-side agent runner, BYO-key, no
billing. The server adds `arena_new` (fresh match id + token + trail),
`shop_house_move` (the house opponent), a `leaderboard`, and — crucially —
**`shop_replay` / `arena_submit`**: the score is **recomputed server-side by
replaying the recorded trail through the rules** (`game.all_events` + a
deterministic re-run), never trusted from the client. Replay is rules-only — no
LLM, CPU-cents — the "a submission is a trail, not a score" model.

## The Magentic Bazaar — governed agent commerce

The same three primitives that gate a robot — **capability · trail · replay** —
also gate *money*. The Magentic Bazaar is a governed agent marketplace built on
them: agents buy from agents under a **signed budget token**, every purchase is
authorized by `lex-guard`'s spend gate, settled over the **x402** Solana `exact`
rail (mock facilitator), and attested to a hash-chained trail that `lex-games`
replays to recompute compliance — **a session is a trail, not a receipt.**

It grew in eight increments, each a runnable example:

| step | what | run |
|------|------|-----|
| governed transaction core | a buyer shops under a budget; over-cap / rogue-merchant / over-total spends are DENIED | `examples/bazaar_market_run.sh` |
| LLM buyer | an open-weights model shops under the wall; a denial feeds back and it self-corrects | `examples/bazaar_llm_buyer_run.sh` |
| seller reputation → lobby | per-seller revenue from *verified* sessions only → the lobby's TOP SELLERS board | `examples/bazaar_reputation_run.sh` |
| concurrent multi-party | many buyers contend for scarce stock via a market actor (no double-sell); released items recirculate | `examples/bazaar_concurrent_run.sh` |
| LLM-priced sellers | sellers price by personality; a gouge over the buyer's cap is refused by the gate, not by trust | `examples/bazaar_llm_sellers_run.sh` |
| fully two-sided | LLM sellers price, an LLM buyer reasons over value and skips the gougers | `examples/bazaar_two_sided_run.sh` |
| live WebSocket room | remote buyers race over WS; the room only arbitrates, each agent self-governs its own spend + trail | `examples/bazaar_room_run.sh` |
| live boards | a worker regenerates both lobby leaderboards from real runs | `scripts/refresh_boards.sh` |

Other commerce demos: an autonomous shopper that navigates real physics to
stalls and buys a human-given list across stops (`examples/auto_bazaar_run.sh`),
sellers that haggle over price via A2A (`examples/haggle_demo_run.sh`,
`examples/haggle_a2a_demo_run.sh`), and a seller pricing-strategy comparison
(`examples/seller_pricing_demo_run.sh`).

The lobby (`examples/games_lobby.html`, served by the play host) surfaces two
recomputed-from-trail boards — **★ MODEL LEADERBOARD** (ELO across N-player
Bazaar matches) and **🏛 TOP SELLERS** (revenue across governed sessions) — at
`/api/standings` and `/api/sellers`. Verification + ranking live in
[lex-games](https://github.com/alpibrusl/lex-games) (`gbazaar`, `bazaar_season`).

```sh
examples/arena_run.sh          # the lobby itself: LEX_DASHBOARD_HTML=games_lobby.html
```

## Deploy: the live referee (play.lexlang.org)

See [`deploy/README.md`](deploy/README.md). CI (`.github/workflows/arena-live.yml`)
builds `ghcr.io/alpibrusl/lex-arena-referee` and pushes it on an `arena-live-v*`
tag; `deploy/docker-compose.yml` + `deploy/Caddyfile.snippet` wire it into the
shared box behind `play.lexlang.org`.

## How it fits the ecosystem

- **[lex-robot](https://github.com/alpibrusl/lex-robot)** — the governed-agent
  kernel this repo depends on: the A2A core, the bazaar/haggle mechanics, the
  play host (`sim_sidecar.lex`), and — separately — robot governance, `did:lex`
  identity + portable reputation, and the capability control plane.
- **[lex-games](https://github.com/alpibrusl/lex-games)** — the lean, trusted
  verifier: replays every match/session trail and recomputes the verdict.
  Deliberately kept small (std + lex-trail only) so the hosted verify-worker
  image stays minimal — it never imports the game engines it referees.
- **lex-guard** — capability-gated budget tokens: the signed spend allowance
  every buyer in the bazaar demos spends against.
- **lex-llm** — the provider layer behind every LLM-driven buyer/seller/bot.

## Known gaps (intentional / next)

- Real Solana settlement (the `x402` `exact` rail is currently a mock
  facilitator) — see lex-robot#24 / #45 (the Governed Agent Bazaar epic, which
  tracks this repo's roadmap).
- The deploy pipeline's automated box rollout (SSH + `docker compose up`) isn't
  wired into CI yet — `arena-live.yml` builds and pushes the image; the deploy
  step is a manual follow-up, same as `loom-cloud`'s pattern.
