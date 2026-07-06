#!/usr/bin/env bash
# lex-games The Wedding Broker — a social-negotiation game, played in the
# React SPA (this game has no legacy static dashboard; it shipped SPA-first).
#   :8900  game server + the built SPA, serving /play/wedding
# You're the wedding planner, days out from the ceremony. Deb (the groom's
# mother), Aunt Kamala, and Jonah (the best man) each want something, and
# they negotiate live — not a dialogue tree — reacting to what the others
# just said. Your authority is a fixed budget PLUS a separate venue slot
# cap: all three requests together cost exactly the full budget but need
# one more slot than the venue allows, so someone always goes unhappy no
# matter how well funded you are. Every ruling is hash-chained — hit
# "Verify chain" to replay it.
#
# Set SELLER_LLM=1 (+ LITELLM_BASE_URL/LITELLM_MODEL or VERTEX_* creds) so
# each guest's line is generated live by an LLM instead of a static fallback.
#
# Usage: examples/wedding_run.sh
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LEX_ROBOT_PKG="${LEX_ROBOT_PKG:-$HOME/.lex/packages/lex-robot}"
DASH_PORT=8900
DASH_URL="http://localhost:${DASH_PORT}"
LEX_RUN="lex run --allow-effects concurrent,crypto,env,fs_read,fs_write,io,llm,net,proc,random,sense,sql,time"

cleanup() { echo "[wedding] stopping..."; kill "$SRV_PID" 2>/dev/null || true; wait "$SRV_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

pkill -f "sim_sidecar.lex" 2>/dev/null || true
rm -f "/tmp/lex-sidecar-${DASH_PORT}.db"*

if [ ! -f "${REPO_DIR}/examples-dist/index.html" ]; then
  echo "[wedding] building the SPA (first run only) ..."
  (cd "${REPO_DIR}/web" && npm install --silent && npm run build)
fi

echo "[wedding] starting game server on :${DASH_PORT} ..."
LEX_ROBOT_REPO_ROOT="${REPO_DIR}" LEX_ARENA_SPA_DIR=examples-dist LEX_ROBOT_SIDECAR_PORT=${DASH_PORT} \
  ${LEX_RUN} "${LEX_ROBOT_PKG}/sidecar/sim_sidecar.lex" run &
SRV_PID=$!

for i in $(seq 1 20); do curl -sf "${DASH_URL}/health" >/dev/null 2>&1 && break; sleep 0.5; done

echo ""
echo "[wedding] play at ${DASH_URL}/play/wedding"
echo ""
read -rp "Press Enter to stop..."
