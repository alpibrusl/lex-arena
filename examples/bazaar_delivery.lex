# examples/bazaar_delivery.lex — the Magentic Bazaar, now paying against PROOF.
#
# The canonical bazaar (bazaar_market.lex) pays whenever the budget POLICY allows.
# This increment adds the other half a real settlement needs: the buyer pays only
# when the seller has PROVEN delivery. Each seller records a delivery confirmation
# to the same hash-chained trail, and the buyer settles through
# `gate.spend_gated` — the exact same lex-guard gate lex-soft uses to release a
# cold-chain milestone. A seller that doesn't deliver is BLOCKED (spend.blocked),
# never charged, even though the budget would have allowed it.
#
# So a Bazaar purchase and a B2B milestone now settle through one gate, one rail
# (x402 mock), one tamper-evident trail.
#
# Env: BAZAAR_TRAIL (trail output path, default bazaar_delivery_trail.jsonl)
# Run: lex run --allow-effects io,sql,time,net,crypto,fs_write,env examples/bazaar_delivery.lex run

import "std.io" as io

import "std.str" as str

import "std.int" as int

import "std.list" as list

import "std.bytes" as bytes

import "std.crypto" as crypto

import "std.env" as env

import "lex-trail/log" as trail

import "lex-trail/kinds" as kinds

import "lex-guard/src/models" as models

import "lex-guard/src/gate" as gate

import "lex-guard/src/x402_mock_exec" as x402m

import "lex-spec/spec" as sp

import "lex-games/src/arena/trail_file" as tf

# A stall the buyer can pay. `delivers` is whether the seller actually fulfils —
# the buyer never trusts it; it is re-derived from the seller's signed delivery
# confirmation on the trail.
type Stall = { merchant :: Str, pay_to :: Str, category :: Str, item :: Str, amount :: Int, delivers :: Bool }

# All three sellers are allow-listed and within cap — so BUDGET is not the
# decider here. spice.bazaar takes the order but never delivers.
fn shopping_list() -> List[Stall] {
  [{ merchant: "pottery.bazaar", pay_to: "PotterySoLAddr11111111111111111111111111111", category: "goods", item: "hand-thrown bowl", amount: 1800, delivers: true }, { merchant: "spice.bazaar", pay_to: "SpiceSoLAddr33333333333333333333333333333333", category: "goods", item: "saffron tin", amount: 1500, delivers: false }, { merchant: "data.bazaar", pay_to: "DataSoLAddr444444444444444444444444444444444", category: "saas", item: "1M embeddings", amount: 1200, delivers: true }]
}

fn buyer_policy() -> models.Policy {
  { token_id: "tok_bazaar", agent_id: "shopper-agent", currency: "USDC", cap_total: 6000, cap_per_day: 6000, cap_per_transaction: 3000, merchants_allow: ["pottery.bazaar", "spice.bazaar", "data.bazaar"], categories_allow: ["goods", "saas"], max_tx_per_hour: 50, expires_at: 0, require_memo: true, policy_version: 1 }
}

fn signer() -> { secret_b64url :: Str, address :: Str } {
  { secret_b64url: crypto.base64url_encode(bytes.from_str("0123456789abcdef0123456789abcdef")), address: "ShopperSoLAddr666666666666666666666666666666" }
}

fn usdc_mint() -> Str {
  "EPjFWdd5USDCmintxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}

fn intent_for(s :: Stall) -> models.SpendIntent {
  { merchant: s.merchant, amount: s.amount, currency: "USDC", category: s.category, memo: s.item }
}

# The seller's delivery confirmation, recorded to the trail as a completed
# outcome. Hand-built JSON keeps this example dep-light; the buyer re-derives it.
fn delivery_json(s :: Stall) -> Str {
  str.join(["{\"delivered\":", if s.delivers {
    "true"
  } else {
    "false"
  }, ",\"item\":\"", s.item, "\"}"], "")
}

# The buyer's release condition: the recorded outcome must say delivered == true.
fn delivered_spec() -> sp.Spec {
  { name: "delivered", quantifiers: [QRecord({ name: "outcome", fields: [{ name: "delivered", ty: TBool }] })], predicate: EBinop({ op: "==", lhs: EField({ binding: "outcome", field: "delivered" }), rhs: EConst(VBool(true)) }) }
}

# Attempt one purchase: record the seller's delivery claim, then settle ONLY if
# it re-derives as proven. Prints + returns the outcome line.
fn buy(pol :: models.Policy, log :: trail.Log, s :: Stall) -> [io, sql, time, net] Str {
  match trail.append(log, kinds.cap_completed(), None, delivery_json(s)) {
    Err(e) => str.join(["  ✗ ", s.merchant, " — trail error ", e], ""),
    Ok(dev) => {
      let evidence := { trail_id: dev.id, spec: Some(delivered_spec()), binding: "outcome" }
      let exec := x402m.make(signer(), s.pay_to, usdc_mint())
      match gate.spend_gated(pol, log, exec, intent_for(s), Some(evidence)) {
        Err(e) => str.join(["  ✗ ", s.merchant, " ", int.to_str(s.amount), " — ERROR ", e], ""),
        Ok(o) => if o.approved {
          str.join(["  ✓ ", s.merchant, " ", int.to_str(s.amount), " USDC — delivered + settled tx=", str.slice(o.executor_ref, 0, 16), "…"], "")
        } else {
          str.join(["  ✗ ", s.merchant, " ", int.to_str(s.amount), " USDC — NOT PAID: ", o.denial_reason], "")
        },
      }
    },
  }
}

fn run() -> [io, sql, time, net, crypto, fs_write, env] Nil {
  let trail_path := match env.get("BAZAAR_TRAIL") {
    Some(v) => v,
    None => "bazaar_delivery_trail.jsonl",
  }
  let __h := io.print("=== Magentic Bazaar — pay against proven delivery (x402 mock, one shared gate) ===")
  match trail.open_memory() {
    Err(e) => io.print(str.concat("trail open failed: ", e)),
    Ok(log) => {
      let pol := buyer_policy()
      let __b := io.print(str.join(["budget: agent=", pol.agent_id, " cap_total=", int.to_str(pol.cap_total), " per-tx=", int.to_str(pol.cap_per_transaction), " (all sellers allow-listed)"], ""))
      let __sp := io.print("")
      let __walk := list.fold(shopping_list(), 0, fn (n :: Int, s :: Stall) -> [io, sql, time, net] Int {
        let __line := io.print(buy(pol, log, s))
        n + 1
      })
      match trail.range(log, 0, 9999999999999) {
        Err(e) => io.print(str.concat("trail read failed: ", e)),
        Ok(evs) => {
          let jsonl := tf.to_jsonl(list.map(evs, tf.from_event))
          let __w := io.write(trail_path, jsonl)
          io.print(str.join(["\nwrote ", int.to_str(list.len(evs)), " trail events → ", trail_path], ""))
        },
      }
    },
  }
}

