#!/usr/bin/env bash
# scripts/smoke.sh — the extraction's acceptance bar (lex-robot#75): the lobby,
# one game, and one bazaar demo are runnable from a fresh clone. Each of these
# is a long-running server (the Lex-native play host, sidecar/sim_sidecar.lex,
# installed as a lex-robot package dependency — see lex.toml), so the check is
# start -> curl a real endpoint -> assert -> kill, not a script that prints a
# verdict and exits.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT="${LEX_ROBOT_SIDECAR_PORT:-8900}"
LEX_ROBOT_PKG="${LEX_ROBOT_PKG:-$HOME/.lex/packages/lex-robot}"
SIDECAR="$LEX_ROBOT_PKG/sidecar/sim_sidecar.lex"
EFF="concurrent,crypto,env,fs_read,fs_write,io,llm,net,proc,random,sense,sql,time"
fail=0
pass() { printf "  \033[32mPASS\033[0m %s\n" "$1"; }
bad()  { printf "  \033[31mFAIL\033[0m %s\n" "$1"; fail=1; }

[ -x "$(command -v lex)" ] || { echo "error: 'lex' not on PATH"; exit 1; }
[ -f "$SIDECAR" ] || { echo "error: $SIDECAR not found — run 'lex pkg install' first"; exit 1; }

# <dashboard html> <expected <title> substring> <label>
check_dashboard() {
  local html="$1" want="$2" label="$3"
  pkill -f "sim_sidecar.lex" >/dev/null 2>&1 || true
  sleep 0.5
  rm -f "/tmp/lex-sidecar-${PORT}.db"*
  LEX_ROBOT_REPO_ROOT="$ROOT" LEX_DASHBOARD_HTML="$html" LEX_ROBOT_SIDECAR_PORT="$PORT" \
    lex run --allow-effects "$EFF" "$SIDECAR" run >/tmp/lex-arena-smoke.log 2>&1 &
  disown
  local ok=0
  for _ in $(seq 1 50); do
    curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 && { ok=1; break; }
    sleep 0.2
  done
  if [ "$ok" -eq 1 ] && curl -sf "http://127.0.0.1:${PORT}/" 2>/dev/null | grep -qF "$want"; then
    pass "$label"
  else
    bad "$label — health or title check failed"
    tail -20 /tmp/lex-arena-smoke.log | sed 's/^/      /'
  fi
  lsof -ti ":${PORT}" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  sleep 0.5
}

echo "== lobby + one game + one bazaar demo (the extraction's acceptance bar) =="
check_dashboard "games_lobby.html" "Lex Arena" "lobby: games_lobby.html serves and is healthy"
check_dashboard "ttt_web.html"     "tic-tac-toe" "game: tic-tac-toe (ttt_web.html) serves and is healthy"
check_dashboard "bazaar_web.html"  "Bazaar" "bazaar: bazaar_web.html serves and is healthy"

echo
if [ "$fail" -eq 0 ]; then echo "ALL GREEN"; else echo "FAILURES ABOVE"; fi
exit "$fail"
