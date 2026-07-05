import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { useEvents } from '../lib/useEvents'
import { callSkill, verifyChain } from '../lib/api'

type Cell = 'X' | 'O' | '.'

interface ChainEntry {
  text: string
  hash?: string
  deny?: boolean
}

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

export function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill('.'))
  const [status, setStatus] = useState('Connecting…')
  const [statusKind, setStatusKind] = useState<'deny' | 'win' | undefined>()
  const [chain, setChain] = useState<ChainEntry[]>([])
  const [verdict, setVerdict] = useState('')
  const [winLine, setWinLine] = useState<number[] | null>(null)
  const tokenRef = useRef('')
  const lastHashRef = useRef('')

  const join = useCallback(async () => {
    const j = await callSkill<{ token?: string }>('game_join', { side: 'X' })
    if (j?.token) tokenRef.current = j.token
  }, [])

  const newGame = useCallback(async () => {
    await callSkill('game_reset')
    if (!tokenRef.current) await join()
  }, [join])

  const move = useCallback(async (by: string, cell: number) => {
    await callSkill('game_move', { by, cell, token: tokenRef.current })
  }, [])

  const cheat = useCallback(() => {
    const first = board.findIndex((c) => c === '.')
    move('O', first < 0 ? 0 : first)
  }, [board, move])

  const onVerify = useCallback(async () => {
    const v = await verifyChain('ttt')
    setVerdict(
      v?.valid
        ? `✓ chain verified — ${v.count} moves, every link intact (tamper-evident)`
        : '✗ chain BROKEN — a recorded move was altered',
    )
  }, [])

  const handleEvent = useCallback((ev: any) => {
    const k = ev.kind
    if (k === 'game_start') {
      setBoard((ev.board || '.........').split('') as Cell[])
      lastHashRef.current = ''
      setChain([])
      setWinLine(null)
      setStatus('You are X — click a square. (O is a bot.)')
      setStatusKind(undefined)
    } else if (k === 'move') {
      setBoard((ev.board || '.........').split('') as Cell[])
      setChain((c) => [
        ...c,
        { text: `${ev.by} → cell ${ev.cell}`, hash: ev.chain || '' },
      ])
      lastHashRef.current = ev.chain || ''
      setStatus(ev.by === 'O' ? 'O (bot) moved — your turn' : 'You played X')
      setStatusKind(undefined)
    } else if (k === 'refused') {
      setChain((c) => [...c, { text: `⛔ ${ev.by}: ${ev.reason || 'illegal'}`, deny: true }])
      setStatus(`⛔ ${ev.reason || 'illegal move'} — refused by the capability layer`)
      setStatusKind('deny')
    } else if (k === 'win') {
      setBoard((prev) => {
        for (const [a, b, c] of LINES) {
          if (prev[a] !== '.' && prev[a] === prev[b] && prev[b] === prev[c]) setWinLine([a, b, c])
        }
        return prev
      })
      setStatus(ev.winner === 'draw' ? 'Draw.' : `${ev.winner} wins!`)
      setStatusKind('win')
    }
  }, [])

  const live = useEvents(handleEvent)

  useEffect(() => {
    newGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header meta="server-authoritative · capability-gated · every move hash-chained" back live={live} />
      <div className="flex flex-1 min-h-0">
        <div className="flex flex-1 min-w-0 flex-col items-center justify-center gap-5">
          <div
            className={
              'text-base min-h-[22px] ' +
              (statusKind === 'deny' ? 'text-red' : statusKind === 'win' ? 'text-green' : 'text-ink')
            }
          >
            {status}
          </div>
          <div className="grid grid-cols-3 grid-rows-3 gap-2 rounded-xl border border-border bg-border p-2">
            {board.map((mark, i) => (
              <button
                key={i}
                onClick={() => move('X', i)}
                className={
                  'flex h-[92px] w-[92px] items-center justify-center rounded-lg border border-border bg-surface-hi text-3xl font-bold transition-colors hover:bg-[#1c2a3d] ' +
                  (mark === 'X' ? 'text-blue ' : mark === 'O' ? 'text-amber ' : '') +
                  (winLine?.includes(i) ? 'bg-[#16301f] border-green' : '')
                }
              >
                {mark === '.' ? '' : mark}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={newGame}>New game</Button>
            <Button variant="danger" onClick={cheat}>
              Cheat: try to play as O
            </Button>
            <Button onClick={onVerify}>Verify chain</Button>
          </div>
          <div className="min-h-[18px] text-sm text-muted">{verdict}</div>
        </div>

        <aside className="flex w-[300px] flex-shrink-0 flex-col border-l border-border bg-surface p-3">
          <div className="mb-2 border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Verifiable move chain (lex)
          </div>
          <div className="flex-1 overflow-y-auto text-xs">
            {chain.length === 0 && <span className="text-muted">no moves yet</span>}
            {chain.map((c, i) => (
              <div key={i} className={c.deny ? 'text-red' : 'text-ink'}>
                {c.text}{' '}
                {c.hash && (
                  <span className="font-data text-blue">
                    {lastHashRef.current && i > 0 ? '◂ ' : ''}
                    {c.hash}
                  </span>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
