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

# The React SPA (lobby + all six games + BYO-key arena, lex-robot#87): built
# by CI into examples-dist/ before this script runs. LEX_ARENA_SPA_DIR opts
# the play host into serving it instead of the legacy dashboard at / and
# /play/:game.
echo "== React SPA (lobby + all six games + arena) =="
if [ -f "$ROOT/examples-dist/index.html" ]; then
  pkill -f "sim_sidecar.lex" >/dev/null 2>&1 || true
  sleep 0.5
  rm -f "/tmp/lex-sidecar-${PORT}.db"*
  LEX_ROBOT_REPO_ROOT="$ROOT" LEX_ARENA_SPA_DIR="examples-dist" LEX_ROBOT_SIDECAR_PORT="$PORT" \
    lex run --allow-effects "$EFF" "$SIDECAR" run >/tmp/lex-arena-spa-smoke.log 2>&1 &
  disown
  ok=0
  for _ in $(seq 1 50); do
    curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 && { ok=1; break; }
    sleep 0.2
  done
  root_html="$(curl -sf "http://127.0.0.1:${PORT}/" 2>/dev/null)"
  play_html="$(curl -sf "http://127.0.0.1:${PORT}/play/ttt" 2>/dev/null)"
  arena_html="$(curl -sf "http://127.0.0.1:${PORT}/play/arena" 2>/dev/null)"
  asset_path="$(grep -oE '/assets/[A-Za-z0-9_.-]+\.js' "$ROOT/examples-dist/index.html" | head -1)"
  asset_status="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}${asset_path}" 2>/dev/null)"
  if [ "$ok" -eq 1 ] && grep -qF "Lex Arena" <<<"$root_html"; then pass "SPA: / serves the built index.html"; else bad "SPA: / did not serve the built SPA"; fi
  if grep -qF "Lex Arena" <<<"$play_html"; then pass "SPA: /play/ttt (client route) falls back to index.html"; else bad "SPA: /play/ttt did not serve the SPA shell"; fi
  if grep -qF "Lex Arena" <<<"$arena_html"; then pass "SPA: /play/arena (BYO-key page) falls back to index.html"; else bad "SPA: /play/arena did not serve the SPA shell"; fi
  if [ "$asset_status" = "200" ]; then pass "SPA: hashed JS bundle serves from /assets/"; else bad "SPA: JS bundle asset returned $asset_status"; fi
  lsof -ti ":${PORT}" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  sleep 0.5
else
  bad "SPA: examples-dist/ not built — run 'npm run build' in web/ first"
fi

echo
if [ "$fail" -eq 0 ]; then echo "ALL GREEN"; else echo "FAILURES ABOVE"; fi
exit "$fail"
