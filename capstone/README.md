# Quoted Escrow Desk — Week 6 capstone (Idea A)

Early scaffold before Encode unlocks the official brief on **7 September 2026**. The desk composes three existing course pieces instead of shipping a new on-chain program.

**Cluster: Solana devnet only.** Quotes use mainnet-beta *price references* (Pyth + Jupiter). No swaps are executed.

## Problem

A maker can lock Token A in the existing escrow program and ask for Token B. A taker should only fill when the SOL/USD oracle is fresh. The desk therefore:

1. Shows Pyth SOL/USD (price + confidence + age) and a Jupiter SOL→USDC quote + spread
2. Blocks **Take** when Pyth `publish_time` is older than 30 seconds (same rule as `defi-quotes/`)
3. Lets a Phantom wallet Make / Take / Cancel against the already-deployed escrow program

## Architecture

```
Phantom (devnet) ──► Vite React UI (capstone/)
                         │
                         ├─ quotes/     Pyth PriceUpdateV2 (mainnet account) + Jupiter HTTP
                         │              (ported from defi-quotes/src/quote.ts + config.ts)
                         │
                         └─ escrow/     Anchor client + IDL
                                        Program 4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr
                                              │
                                              ▼
                                        escrow program (devnet)
                                        PDA seeds: ["escrow", maker, id_le_bytes]
                                        Vault: ATA(mint_a) authority = escrow PDA
```

| Piece | Source | Role |
| :--- | :--- | :--- |
| Escrow program | `escrow/` (Week 5 Ex 8) | Make / Take / Cancel token swap |
| Quotes | `defi-quotes/` (Week 5 Ex 9) | Pyth confidence + 30s freshness; Jupiter spread |
| Wallet UI | `voting/frontend/` (Week 4 Ex 7) | Vite + `@solana/wallet-adapter-react` + Phantom |

No new program is deployed. The UI talks to the existing escrow ID on devnet.

## Program IDs and Explorer placeholders

| Item | Value |
| :--- | :--- |
| Cluster | `devnet` |
| Escrow program | `4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr` |
| Explorer (program) | https://explorer.solana.com/address/4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr?cluster=devnet |
| Demo Make tx | _TBD — paste Explorer link after first live Make_ |
| Demo Take tx | _TBD — paste Explorer link after first live Take_ |
| Demo Cancel tx | _TBD — paste Explorer link after first live Cancel_ |
| Course wallet | `5kyuXhe2qeRGvANAATZAG9n9nRZM4iyc768mcxrqcDDG` |
| Example mint A (Week 3 SPL) | `APZWUxbqLkVxBomyKW4K11jFLj7jqrAakGndRiQqPXZc` (Tokenkeg) |

Escrow uses **classic SPL Token** (`Tokenkeg`). Do not mix Token-2022 mints into the vault.

## How to run on devnet

```bash
cd capstone
npm install
npm run dev
```

1. Install [Phantom](https://phantom.app/) and switch the wallet network to **Devnet**.
2. Fund the wallet with devnet SOL (faucet).
3. Open the Vite URL (default `http://localhost:5173`).
4. Connect Phantom. Refresh quotes. Make an offer with two Tokenkeg mints you control, then Take or Cancel.

Build check (no wallet required):

```bash
cd capstone
npm install
npm run build
```

Optional: set `VITE_SOLANA_MAINNET_RPC` to a public mainnet RPC if the default Pyth account read is rate-limited. No API keys or secrets are required.

## What to demo

1. **Quotes panel** — Pyth SOL/USD with `+/-` confidence, age in seconds, and a Fresh / Stale badge (threshold 30s). Jupiter implied SOL/USDC for 1 SOL and spread vs Pyth.
2. **Stale Take guard** — if Pyth age > 30s, Take is disabled and the UI explains why.
3. **Make** — maker locks `deposit_amount` of mint A; escrow PDA + vault ATA are created.
4. **Take** — taker pays `receive_amount` of mint B, receives mint A, vault and escrow close (only when oracle is fresh).
5. **Cancel** — maker reclaims mint A before a take; vault and escrow close.
6. **Explorer** — paste the three tx links into the table above for the Encode write-up.

## Client notes

- IDL is vendored at `src/escrow/escrow.json` (the live `escrow/target/idl` is gitignored). Account names match `escrow/programs/escrow/src/lib.rs` and `escrow/tests/escrow.ts`.
- Take/Cancel assume ATAs already exist. The program does not `init_if_needed` taker/maker ATAs — create them first (same as the Mocha suite).
- Quotes never call Jupiter `/swap`. Pyth is read from the sponsored mainnet push account (Hermes is skipped so the UI needs no `PYTH_API_KEY`).
