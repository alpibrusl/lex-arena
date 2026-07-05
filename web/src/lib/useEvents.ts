import { useEffect, useRef, useState } from 'react'

// Subscribes to the play host's SSE event stream (/events) — the same
// server-push channel every vanilla-JS dashboard used. Returns the live
// connection state (for the header's status dot) and calls `onEvent` for
// each parsed message.
export function useEvents(onEvent: (ev: any) => void) {
  const [live, setLive] = useState(false)
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    const es = new EventSource('/events')
    es.onopen = () => setLive(true)
    es.onerror = () => setLive(false)
    es.onmessage = (e) => {
      try {
        handlerRef.current(JSON.parse(e.data))
      } catch (err) {
        console.warn('bad event', e.data, err)
      }
    }
    return () => es.close()
  }, [])

  return live
}
