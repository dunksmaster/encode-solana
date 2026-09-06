# Encode Solana — Week 6 capstone ideas

Official brief unlocks **7 September 2026 (00:00 BST)**. This file records the early scaffold choice. Prefer composing existing course programs over rewriting them.

## Chosen: Idea A — Quoted Escrow Desk

Compose three shipped pieces:

1. Token escrow on **devnet** (`escrow/`, program `4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr`)
2. Pyth SOL/USD + Jupiter SOL→USDC quotes (`defi-quotes/`, 30s freshness)
3. React + Phantom wallet UI (`voting/frontend/`)

Scaffold lives in `capstone/`. Take is disabled when the Pyth feed is stale (>30s).

## Held for reference

- **Idea B:** Oracle-gated voting booth — voting state machine + Pyth freshness gate + Phantom UI.
- **Idea C:** Collection tip desk — Metaplex NFT collection + tip-jar CPI + Phantom UI.
