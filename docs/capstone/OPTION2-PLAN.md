# Encode Week 6 — Option 2 plan (NFT Marketplace)

This is the agreed capstone plan for GitHub. Early local notes chose Idea A
(Quoted Escrow Desk in `capstone/`). The official brief is **Option 2 — NFT
Marketplace** (list / buy / cancel with escrow). Spec Kit artifacts live in
`specs/001-nft-marketplace/`. The Anchor program lives in `marketplace/`.
The Superdesign canvas is design-locked; React is the next slice.

## Product

Seller lists an NFT at a fixed SOL price. Buyer pays and receives the NFT in
one atomic transaction so neither side can cheat.

## Folder decision

New `marketplace/` for the Anchor program **and** the Vite desk.

Keep `capstone/` as the prior Quoted Escrow Desk experiment. Do **not**
replace `escrow/`.

## On-chain

New Anchor program `marketplace` (Devnet only).

| Instruction | Role |
| :--- | :--- |
| `list_nft(price_lamports)` | Seller NFT → vault; create listing |
| `buy_nft()` | Buyer SOL → seller; vault NFT → buyer; close listing |
| `cancel_listing()` | Seller only; vault NFT → seller; close listing |

- Listing PDA seeds: `["listing", seller, mint]`
- Listing fields: seller, mint, price, bump, `is_active`
- Vault: ATA for the mint, authority = listing PDA
- Buy / cancel: `invoke_signed` as the listing PDA
- Payment: SOL only

Reference only (do not call as the marketplace): escrow program
`4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr`.

## Six tests (must pass before "done")

1. List → Buy
2. List → Cancel
3. Double-buy fails
4. Buy after cancel fails
5. Non-seller cancel fails
6. Wrong mint / inactive listing fails

## UI

Vite + React + TypeScript + wallet-adapter. Dark listing-desk aesthetic.

Routes: `/`, `/list`, `/listing/:id`, `/mine`.

Wallet control + Devnet badge on every page.

**Superdesign canvas MUST be approved before any React screens are coded.**

## Reuse

| Piece | Source |
| :--- | :--- |
| Demo NFTs | `nfts/` Exercise 10 collection `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd` |
| PDA / vault pattern | `escrow/` (make / take / cancel, vault authority = PDA) |
| Phantom adapter | `voting/frontend/` |

## Out of scope (v1)

Offers, auctions, royalties UI, search, SPL payment, mainnet, rewriting
`escrow/`, treating `capstone/` as the Option 2 app.

## Proofs

Marketplace README must include architecture, Devnet runbook, trade-offs,
and Explorer links for the program plus sample list / buy / cancel txs.
Never commit private keys.

## Next actions

1. ~~`/speckit-plan` for `001-nft-marketplace`~~ (done)
2. Superdesign canvas is design-locked (purple crypto desk)
3. ~~`/speckit-tasks`~~ (program tasks in `specs/001-nft-marketplace/tasks.md`)
4. ~~Implement program + six tests~~ (this PR: `marketplace/`)
5. **Next PR**: Vite + React + Phantom desk in `marketplace/frontend/`
6. Devnet deploy + Explorer proofs in `marketplace/README.md`
