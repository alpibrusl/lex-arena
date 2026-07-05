import { useCallback, useState } from 'react'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { usePoolGame } from '../lib/usePoolGame'

const FACES = ['🧑‍🎨', '🎸', '🎮', '🖼️', '🎹', '🥾']

export function ConsentMatch() {
  const [reveal, setReveal] = useState('')
  const onExtraEvent = useCallback((ev: any) => {
    if (ev.kind === 'love_match') {
      setReveal(`🔓 ${ev.name}'s private card unlocked: ${ev.contact} · sig ${ev.sig}…`)
    }
  }, [])
  const { state, status, statusKind, verdict, live, move, newGame, onVerify } = usePoolGame(
    'love',
    'love',
    { yours: 'Your turn — swipe right on someone', bots: 'Bot (P2) is deciding…' },
    'charm',
    onExtraEvent,
  )

  const cheat = () => {
    const free = (state?.pool || []).find((it: any) => !it.owner)
    if (free) move('P2', 'cand', free.i)
  }
  const startNew = () => {
    setReveal('')
    newGame()
  }

  const score = state?.score || { P1: 0, P2: 0 }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header meta="swipe right to consent · a match needs double opt-in · private card revealed only on match" back live={live} />
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 p-4">
        <div
          className={
            'text-base min-h-[22px] ' +
            (statusKind === 'deny' ? 'text-red' : statusKind === 'win' ? 'text-green' : 'text-ink')
          }
        >
          {status}
        </div>

        <div className="flex gap-8 text-sm">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-bold tracking-wide text-blue">YOU · P1</span>
            <span>{score.P1} charm</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-bold tracking-wide text-pink">BOT · P2</span>
            <span>{score.P2} charm</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(state?.pool || []).map((it: any) => {
            const res = it.result
            return (
              <button
                key={it.i}
                disabled={!!it.owner}
                onClick={() => move('P1', 'cand', it.i)}
                className={
                  'flex flex-col items-center gap-1 rounded-xl border p-3 transition-all duration-150 ' +
                  (res === 'match'
                    ? 'cursor-default border-green bg-[#0f2a1a]'
                    : res === 'rejected'
                      ? 'cursor-default border-red bg-[#2a1416] opacity-60'
                      : it.owner
                        ? 'cursor-default border-border bg-surface-hi opacity-90'
                        : 'border-border bg-surface-hi hover:-translate-y-0.5 hover:border-pink')
                }
              >
                <span className="text-2xl">{FACES[it.i] || '❤'}</span>
                <span className="text-sm">{it.name}</span>
                <span className="text-xs text-muted">seeks {it.seeks}</span>
                <span className="text-xs text-amber">{it.charm} charm</span>
                {it.owner && !res && (
                  <span className="text-[10px] text-muted">swiped by {it.owner === 'P1' ? 'you' : 'bot'}</span>
                )}
                {res === 'match' && <span className="text-[10px] font-bold text-green">♥ MATCH</span>}
                {res === 'rejected' && <span className="text-[10px] font-bold text-red">✗ NO MATCH</span>}
              </button>
            )
          })}
        </div>

        <div className="min-h-[16px] text-xs text-green">{reveal}</div>

        <div className="flex gap-2">
          <Button onClick={startNew}>New game</Button>
          <Button variant="danger" onClick={cheat}>
            Cheat: swipe as P2
          </Button>
          <Button onClick={onVerify}>Verify chain</Button>
        </div>
        <div className="min-h-[18px] text-sm text-muted">{verdict}</div>
      </div>
    </div>
  )
}
