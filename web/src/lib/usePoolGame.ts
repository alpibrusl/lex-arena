import { useCallback, useEffect, useRef, useState } from 'react'
import { callSkill, verifyChain } from './api'
import { useEvents } from './useEvents'

// Shared "draft from a shared pool" game loop — Bazaar Draft, Charger Duel,
// and Consent Match are all the same shape: P1 (you) and P2 (a bot) alternate
// picking items from a pool under some scoring rule. The server is
// authoritative for all of it; this hook just polls /skill/<skill>_state
// after every event and exposes the result plus the join/move/cheat/verify
// actions every one of these pages needs.
//
// Status text has two layers, exactly like the original per-file render():
// a turn-based idle message derived from every fresh state fetch, and a
// win/deny message that overrides it until the next fetch. Ordering matters —
// fetchState is always awaited before a win message is set, so the turn-based
// text never clobbers it.
export function usePoolGame(
  skill: string,
  gameId: string,
  turns: { yours: string; bots: string },
  winUnit = '',
  onExtraEvent?: (ev: any) => void,
) {
  const [state, setState] = useState<any>(null)
  const [status, setStatus] = useState('Joining…')
  const [statusKind, setStatusKind] = useState<'deny' | 'win' | undefined>()
  const [verdict, setVerdict] = useState('')
  const tokenRef = useRef('')

  const fetchState = useCallback(async () => {
    const s = await callSkill<any>(`${skill}_state`)
    setState(s)
    if (s && !s.over) {
      setStatus(s.turn === 'P1' ? turns.yours : turns.bots)
      setStatusKind(undefined)
    }
    return s
  }, [skill, turns])

  const join = useCallback(async () => {
    const j = await callSkill<{ token?: string }>(`${skill}_join`, { side: 'P1' })
    if (j?.token) tokenRef.current = j.token
  }, [skill])

  const move = useCallback(
    async (by: string, itemKey: string, i: number) => {
      await callSkill(`${skill}_move`, { by, [itemKey]: i, token: tokenRef.current })
    },
    [skill],
  )

  const newGame = useCallback(async () => {
    await callSkill(`${skill}_reset`)
    if (!tokenRef.current) await join()
    await fetchState()
  }, [skill, join, fetchState])

  const onVerify = useCallback(async () => {
    const v = await verifyChain(gameId)
    setVerdict(
      v?.valid
        ? `✓ chain verified — ${v.count} moves, every link intact (tamper-evident)`
        : '✗ chain BROKEN — a recorded move was altered',
    )
  }, [gameId])

  const handleEvent = useCallback(
    async (ev: any) => {
      const k = ev.kind
      if (k === `${skill}_refused`) {
        setStatus(`⛔ ${ev.reason || 'illegal'} — refused by the capability layer`)
        setStatusKind('deny')
      } else if (k === `${skill}_win`) {
        await fetchState()
        const suffix = winUnit ? ` ${winUnit}` : ''
        setStatus(
          ev.winner === 'draw'
            ? `Draw — ${ev.p1} vs ${ev.p2}${suffix}`
            : `${ev.winner === 'P1' ? 'You win' : 'Bot wins'}! ${ev.p1} vs ${ev.p2}${suffix}`,
        )
        setStatusKind('win')
      } else {
        onExtraEvent?.(ev)
        await fetchState()
      }
    },
    [skill, winUnit, onExtraEvent, fetchState],
  )

  const live = useEvents(handleEvent)

  useEffect(() => {
    newGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, status, statusKind, verdict, live, move, newGame, onVerify }
}
