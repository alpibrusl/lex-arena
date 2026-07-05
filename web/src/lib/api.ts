// Thin wrapper around the play host's /skill/* API (sim_sidecar.lex). Every
// game shares this same shape: POST a skill name + args, get JSON back. The
// server is authoritative — this client never decides a move is legal, it
// just asks and reports whatever comes back.

export async function callSkill<T = unknown>(skill: string, args: unknown = {}): Promise<T | null> {
  try {
    const r = await fetch(`/skill/${skill}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    return (await r.json()) as T
  } catch {
    return null
  }
}

export interface VerifyResult {
  valid: boolean
  count?: number
}

export async function verifyChain(game: string): Promise<VerifyResult | null> {
  return callSkill<VerifyResult>('game_verify', { game })
}
