import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { callSkill } from '../lib/api'

const GAME = 'bazaar'
const DEFAULT_PROMPT =
  'You are drafting items in a turn-based game against an opponent, under a 30-credit budget. Each turn you pick ONE available item to maximize your total VALUE. Consider price vs value, your remaining budget, and denying the opponent high-value items. Reply ONLY with the item index to draft.'

function persisted(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  return window.localStorage.getItem(`arena_${key}`) ?? fallback
}

export function Arena() {
  const [name, setName] = useState(() => persisted('name', ''))
  const [provider, setProvider] = useState(() => persisted('provider', 'anthropic'))
  const [model, setModel] = useState(() => persisted('model', ''))
  const [apiKey, setApiKey] = useState(() => persisted('key', ''))
  const [prompt, setPrompt] = useState(() => persisted('prompt', DEFAULT_PROMPT))

  const [pool, setPool] = useState<any[]>([])
  const [p1v, setP1v] = useState(0)
  const [p2v, setP2v] = useState(0)
  const [p1b, setP1b] = useState(30)
  const [status, setStatus] = useState('Configure your agent and run a match.')
  const [statusKind, setStatusKind] = useState<'win' | 'lose' | 'err' | undefined>()
  const [verify, setVerify] = useState('')
  const [logLines, setLogLines] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [board, setBoard] = useState<{ rank: number; player: string; model: string; score: number }[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    for (const [k, v] of [
      ['name', name],
      ['provider', provider],
      ['model', model],
      ['key', apiKey],
      ['prompt', prompt],
    ] as const) {
      window.localStorage.setItem(`arena_${k}`, v)
    }
  }, [name, provider, model, apiKey, prompt])

  const log = useCallback((s: string) => {
    setLogLines((l) => [...l, s])
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    })
  }, [])

  const renderState = useCallback((st: any) => {
    setPool(st.pool || [])
    setP1v((st.val || {}).P1 || 0)
    setP2v((st.val || {}).P2 || 0)
    setP1b((st.bud || {}).P1 ?? 30)
  }, [])

  const loadLB = useCallback(async () => {
    const j = await callSkill<{ rows?: any[] }>('lb_top', { game: GAME })
    setBoard((j?.rows || []).map((r, i) => ({ rank: i + 1, player: r.player, model: r.model, score: r.score })))
  }, [])

  useEffect(() => {
    loadLB()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const askLLM = useCallback(
    async (st: any) => {
      const avail = (st.pool || []).filter((it: any) => !it.owner)
      const user =
        'Board state:\n' +
        (st.pool || [])
          .map((it: any) => `  item ${it.i}: ${it.name}, price ${it.price}, value ${it.value}, ${it.owner ? 'taken by ' + it.owner : 'AVAILABLE'}`)
          .join('\n') +
        `\nYour budget: ${st.bud.P1}. Available indices you can afford: ` +
        avail.filter((it: any) => it.price <= st.bud.P1).map((it: any) => it.i).join(', ') +
        '\nReply with ONLY the integer index of the item to draft.'

      let text = ''
      if (provider === 'anthropic') {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({ model, max_tokens: 16, system: prompt, messages: [{ role: 'user', content: user }] }),
        })
        const j = await r.json()
        if (j.error) throw new Error(j.error.message)
        text = (j.content || []).map((c: any) => c.text || '').join('')
      } else {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
          body: JSON.stringify({
            model,
            max_tokens: 16,
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: user },
            ],
          }),
        })
        const j = await r.json()
        if (j.error) throw new Error(j.error.message)
        text = j.choices?.[0]?.message?.content || ''
      }
      const m = text.match(/\d+/)
      return m ? parseInt(m[0], 10) : null
    },
    [provider, model, apiKey, prompt],
  )

  const runMatch = useCallback(async () => {
    if (running) return
    const key = apiKey.trim()
    const mdl = model.trim()
    const player = name.trim() || 'anon'
    if (!key || !mdl) {
      setStatus('Set a model and API key first.')
      setStatusKind('err')
      return
    }
    setRunning(true)
    setLogLines([])
    setVerify('')
    try {
      const j = await callSkill<{ token?: string; match?: string }>('arena_new')
      const token = j?.token || ''
      log(`new match ${j?.match} — signed token ${token.slice(0, 14)}…`)
      setStatus('Agent is playing…')
      setStatusKind(undefined)

      for (let step = 0; step < 24; step++) {
        const st = await callSkill<any>('shop_state')
        renderState(st)
        if (st.over) break
        if (st.turn === 'P2') {
          await callSkill('shop_house_move')
          continue
        }
        const affordable = (st.pool || []).filter((it: any) => !it.owner && it.price <= st.bud.P1)
        if (affordable.length === 0) {
          log('P1 has no legal move → pass')
          await callSkill('shop_pass', { by: 'P1' })
          continue
        }
        let idx: number | null
        try {
          idx = await askLLM(st)
        } catch (e: any) {
          setStatus('LLM error: ' + e.message)
          setStatusKind('err')
          log('LLM error: ' + e.message)
          setRunning(false)
          return
        }
        const legal = affordable.some((it: any) => it.i === idx)
        if (!legal) {
          idx = affordable.sort((a: any, b: any) => a.price - b.price)[0].i
          log(`model picked illegal/none → fallback to #${idx}`)
        }
        const res = await callSkill<{ status: string; reason?: string }>('shop_move', { by: 'P1', item: idx, token })
        log(`P1 draft #${idx} → ${res?.status}${res?.reason ? ' (' + res.reason + ')' : ''}`)
        if (res?.status === 'refused') await callSkill('shop_pass', { by: 'P1' })
      }

      const fin = await callSkill<any>('shop_state')
      renderState(fin)
      const win = fin.val.P1 > fin.val.P2
      const draw = fin.val.P1 === fin.val.P2
      setStatus(draw ? `Draw — ${fin.val.P1} vs ${fin.val.P2}` : win ? `You win! ${fin.val.P1} vs ${fin.val.P2}` : `House wins ${fin.val.P2} vs ${fin.val.P1}`)
      setStatusKind(win ? 'win' : draw ? undefined : 'lose')

      const rp = await callSkill<any>('shop_replay')
      setVerify(
        rp?.valid
          ? `✓ replay-verified — ${rp.moves} moves, score recomputed server-side: you ${rp.p1} vs house ${rp.p2}`
          : `✗ rejected — ${!rp?.intact ? 'chain tampered' : 'illegal move in trail'}`,
      )
      const sub = await callSkill<{ valid?: boolean; score?: number }>('arena_submit', { player, model: mdl })
      log(sub?.valid ? `replayed score ${sub.score} posted to leaderboard` : 'submission rejected by replay (not posted)')
      loadLB()
    } finally {
      setRunning(false)
    }
  }, [running, apiKey, model, name, prompt, provider, askLLM, renderState, log, loadLB])

  return (
    <div className="flex min-h-dvh flex-col">
      <Header meta="your prompt + your model = your agent · every move gated & hash-chained · provably-fair leaderboard" back />
      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-3 px-4 py-4 lg:grid-cols-[1fr_1fr_320px]">
        <Card className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Your agent (bring your own key)</h2>
          <label className="mt-1 text-xs text-muted">Player name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="e.g. ada-the-shopper"
            className="w-full rounded-lg border border-border bg-surface-hi px-2.5 py-1.5 text-sm text-ink"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-hi px-2.5 py-1.5 text-sm text-ink"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted">Model</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="claude-... / gpt-..."
                className="w-full rounded-lg border border-border bg-surface-hi px-2.5 py-1.5 text-sm text-ink"
              />
            </div>
          </div>
          <label className="text-xs text-muted">
            API key <span className="text-faint">(kept in your browser only — never sent to our server)</span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-border bg-surface-hi px-2.5 py-1.5 text-sm text-ink"
          />
          <label className="text-xs text-muted">System prompt (your strategy)</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-lg border border-border bg-surface-hi px-2.5 py-1.5 text-sm leading-relaxed text-ink"
          />
          <Button variant="primary" onClick={runMatch} disabled={running} className="mt-1">
            ▶ Run a match
          </Button>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Match</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-blue">
              YOU (P1): <b>{p1v}</b>
            </span>
            <span className="text-amber">
              HOUSE (P2): <b>{p2v}</b>
            </span>
            <span className="text-muted">
              budget <b>{p1b}</b>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {pool.map((it: any) => (
              <div
                key={it.i}
                className={
                  'rounded-lg border p-2 text-xs ' +
                  (it.owner === 'P1'
                    ? 'border-blue bg-[#11233a]'
                    : it.owner === 'P2'
                      ? 'border-amber bg-[#2a2410]'
                      : 'border-border bg-surface-hi')
                }
              >
                <div>{it.name}</div>
                <div className="text-muted">
                  #{it.i} · {it.price}cr · {it.value}pts
                </div>
                {it.owner && (
                  <div className={'font-bold ' + (it.owner === 'P1' ? 'text-blue' : 'text-amber')}>
                    {it.owner === 'P1' ? 'YOU' : 'HOUSE'}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className={'text-sm ' + (statusKind === 'win' ? 'text-green' : statusKind === 'lose' || statusKind === 'err' ? 'text-red' : 'text-ink')}>
            {status}
          </div>
          {verify && <div className={verify.startsWith('✓') ? 'text-xs text-green' : 'text-xs text-red'}>{verify}</div>}
          <h2 className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Agent log</h2>
          <div ref={logRef} className="h-[150px] overflow-y-auto rounded-lg border border-border bg-surface-hi p-2 font-data text-xs leading-relaxed text-muted">
            {logLines.join('\n')}
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Global leaderboard</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-1">#</th>
                <th className="pb-1">player</th>
                <th className="pb-1">model</th>
                <th className="pb-1 text-right">score</th>
              </tr>
            </thead>
            <tbody>
              {board.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-2 font-data text-muted">
                    no scores yet
                  </td>
                </tr>
              ) : (
                board.map((r) => (
                  <tr key={r.rank} className="border-t border-border">
                    <td className="py-1 text-muted">{r.rank}</td>
                    <td className="py-1">{r.player}</td>
                    <td className="py-1 font-data text-muted">{r.model}</td>
                    <td className="py-1 text-right text-amber">{r.score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Button onClick={loadLB}>↻ Refresh</Button>
        </Card>
      </main>
    </div>
  )
}
