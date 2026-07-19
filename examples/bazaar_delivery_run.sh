#!/usr/bin/env bash
# bazaar_delivery_run.sh — the Magentic Bazaar paying against PROVEN delivery.
#
# Same governed shopping loop as bazaar_market, but each purchase now settles
# through lex-guard's `gate.spend_gated`: the buyer pays only when the seller has
# recorded a delivery confirmation that re-derives as proven. A seller that takes
# the order but doesn't deliver is blocked (spend.blocked) and never charged —
# even though the budget would allow it. This is the exact same gate lex-soft
# uses to release a cold-chain milestone: one gate, one x402 rail, one trail.
#
# Usage: LEX=lex ./examples/bazaar_delivery_run.sh
set -u
LEX="${LEX:-lex}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TRAIL="${BAZAAR_TRAIL:-$(mktemp -d)/bazaar_delivery_trail.jsonl}"

echo "== transact: pay only against proven delivery =="
BAZAAR_TRAIL="$TRAIL" $LEX run --allow-effects io,sql,time,net,crypto,fs_write,env "$HERE/bazaar_delivery.lex" run

echo
echo "== verify: replay the trail, recompute compliance =="
$LEX run --allow-effects io "$HERE/bazaar_verify.lex" verify "\"$TRAIL\"" | head -1

echo
echo "trail at: $TRAIL"
