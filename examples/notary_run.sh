#!/usr/bin/env bash
# lex-games Stamp of Destiny — a comedic point-and-click case, played in the
# React SPA (this game has no legacy static dashboard; it shipped SPA-first).
#   :8900  game server + the built SPA, serving /play/notary
# You are Milo Quill, a shipwrecked salesman mistaken for the harbor's new
# Notary. Bosun Kettle wants a barrel of live eels notarized into cash. Your
# Junior Notary license only covers a fixed set of chit categories — an
# out-of-license request is refused by the capability layer before it ever
# reaches the stamp; an in-license chit can still be stamped upside-down,
# which is legal but reverses the claim (legal ≠ useful). Every legal stamp is
# hash-chained — hit "Verify chain" to replay it.
#
# Set SELLER_LLM=1 (+ LITELLM_BASE_URL/LITELLM_MODEL or VERTEX_* creds) so
# Bosun's plea is generated live by an LLM instead of a static fallback line.
#
# Usage: examples/notary_run.sh
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LEX_ROBOT_PKG="${LEX_ROBOT_PKG:-$HOME/.lex/packages/lex-robot}"
DASH_PORT=8900
DASH_URL="http://localhost:${DASH_PORT}"
LEX_RUN="lex run --allow-effects concurrent,crypto,env,fs_read,fs_write,io,llm,net,proc,random,sense,sql,time"

cleanup() { echo "[notary] stopping..."; kill "$SRV_PID" 2>/dev/null || true; wait "$SRV_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

pkill -f "sim_sidecar.lex" 2>/dev/null || true
rm -f "/tmp/lex-sidecar-${DASH_PORT}.db"* /tmp/lex-notary-*.db

if [ ! -f "${REPO_DIR}/examples-dist/index.html" ]; then
  echo "[notary] building the SPA (first run only) ..."
  (cd "${REPO_DIR}/web" && npm install --silent && npm run build)
fi

echo "[notary] starting game server on :${DASH_PORT} ..."
LEX_ROBOT_REPO_ROOT="${REPO_DIR}" LEX_ARENA_SPA_DIR=examples-dist LEX_ROBOT_SIDECAR_PORT=${DASH_PORT} \
  ${LEX_RUN} "${LEX_ROBOT_PKG}/sidecar/sim_sidecar.lex" run &
SRV_PID=$!

for i in $(seq 1 20); do curl -sf "${DASH_URL}/health" >/dev/null 2>&1 && break; sleep 0.5; done

echo ""
echo "[notary] play at ${DASH_URL}/play/notary"
echo ""
read -rp "Press Enter to stop..."
