# Research: NFT Marketplace Listing Desk

**Feature**: `001-nft-marketplace`  
**Date**: 2026-09-08  
**Status**: All Technical Context unknowns resolved — no `NEEDS CLARIFICATION` remain.

## 1. Workspace layout and program identity

**Decision**: New Anchor 1.1.2 workspace at repository-root `marketplace/`
with program crate `programs/marketplace`. Generate a fresh program
keypair at scaffold time; commit only `declare_id!` / `Anchor.toml`
public keys. Never reuse escrow program
`4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr`.

**Rationale**: Constitution V and FR-013 forbid rewriting or calling
`escrow/` as the marketplace. A sibling workspace matches the course
layout (`escrow/`, `voting/`, `nfts/`) and keeps deploy keys isolated
under gitignored `target/deploy/` and `keys/`.

**Alternatives considered**:

- Add a second program crate inside `escrow/` — rejected; couples
  workspaces and invites accidental escrow edits.
- Put the program in `capstone/` — rejected; `capstone/` is the prior
  Quoted Escrow Desk experiment (constitution Additional Constraints).
- Reuse the escrow program with a new instruction set — rejected;
  escrow is SPL↔SPL, not NFT↔SOL, and must remain intact for Exercise 8.

## 2. Instruction surface and listing PDA

**Decision**: Three instructions — `list_nft(price_lamports: u64)`,
`buy_nft()`, `cancel_listing()`. Listing PDA seeds
`["listing", seller, mint]`. Account fields: `seller`, `mint`,
`price` (lamports), `bump`, `is_active`.

**Rationale**: Locked by constitution Program identity and FR-012. Seeds
`(seller, mint)` give one active listing per seller per mint and a
stable client-side address (`findProgramAddressSync`).

**Alternatives considered**:

- Escrow-style `id: u64` seed — rejected; NFT identity is the mint.
- Marketplace-global listing index PDA — rejected; YAGNI, extra write
  on every list, not required to browse (clients can derive or remember
  listing addresses).
- Offers / bid accounts — rejected; FR-014.

## 3. Vault custody and `invoke_signed`

**Decision**: Vault = associated token account for the listed mint with
**authority = listing PDA**. List transfers exactly **1** token
(0-decimal NFT) from the seller ATA into the vault. Buy and cancel
release via Anchor `CpiContext::new_with_signer` (this is `invoke_signed`
with seeds `[b"listing", seller, mint, &[bump]]`), then close the vault
ATA so rent returns to the seller.

**Rationale**: Constitution II / FR-011: vault authority must never be a
user keypair. Closing the vault matches `escrow/` take/cancel and
prevents a leftover ATA that could be confused with an open listing.
`CpiContext::new_with_signer` is the Anchor 1.1 idiom; it compiles to
`invoke_signed` and matches Exercise 8 quality.

**Alternatives considered**:

- Shared marketplace vault authority keypair — rejected; custody risk
  and constitution violation.
- Token-2022 / permanent delegate — rejected; Exercise 10 collection
  uses classic Tokenkeg Metaplex NFTs.
- Leave vault open after buy/cancel — rejected; rent leak and weaker
  “inactive” signal.

## 4. `is_active` vs closing the listing account

**Decision**: Set `is_active = true` on list. Buy and cancel
`require!(listing.is_active)` then **close** the listing account (rent
to seller) after the NFT + SOL movements. A second list of the same
`(seller, mint)` is then allowed. Double-buy / buy-after-cancel fail
closed because the account is gone (`AccountNotInitialized`) and/or
would fail the `is_active` check if a stale account were ever left.

**Rationale**: Spec edge case: a second list MUST fail **until the first
listing is closed**, implying reuse after close. Closing (like escrow)
is the simplest reuse story. The `is_active` field still satisfies
FR-012 and lets us fail closed if a future change stops closing.

**Alternatives considered**:

- Keep the account and flip `is_active = false` forever — rejected;
  blocks re-list of the same mint without a new “reopen” instruction.
- `init_if_needed` reuse in place — rejected; easier to get wrong on
  leftover vault balances.

## 5. SOL-only payment

**Decision**: Buy transfers **exact** `listing.price` lamports from the
buyer (signer, `mut`) to the seller via `system_program::transfer`.
No SPL payment mint, no wrapped SOL vault.

**Rationale**: Constitution V / FR-009. Native SOL is one extra
SystemProgram CPI and matches “seller receives the listed SOL.”

**Alternatives considered**:

- wSOL ATA swap — extra accounts, no product value.
- SPL USDC — FR-014 / YAGNI.
- Buyer sends SOL to the listing PDA then PDA forwards — extra hop;
  seller can be the transfer destination directly.

## 6. NFT standard and collection gating

**Decision**: Program accepts classic SPL Token mints with **decimals =
0** and transfers **amount = 1**. It does **not** CPI Metaplex or
assert collection membership. The desk (later) defaults the catalog to
Exercise 10 collection `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd`
and members
`9MJyuTGDjdTmFGueYCJMtuBrMYu4JRHMCEhLrke4XfrQ`,
`YA936cqURpMGpZLNsWp9492B3DUwTUhFQ4hynEfKjUJ`,
`3t7ao1ar14m8gU7n7EECfwgRWwoMEKLa3S8XNtCdMAEp`.

**Rationale**: Tests must run on localnet without Exercise 10 mint
authorities. FR-008 says other owned NFTs MAY be accepted; they are not
required. On-chain collection proofs add Metaplex dependencies and
would block those tests.

**Alternatives considered**:

- Require verified collection on list — better demo purity, worse
  testability and YAGNI for v1.
- Token-2022 metadata — Exercise 10 is Tokenkeg + Metaplex.

## 7. Fail-closed errors and authorities

**Decision**: Custom errors `InvalidPrice`, `InvalidNft`,
`ListingInactive` plus Anchor constraint failures
(`ConstraintSeeds`, `ConstraintHasOne`, `AccountNotInitialized`,
`ConstraintAssociated`) for authority / mint mismatches. Seller-only
cancel: `seller` is the signer and is a listing seed + `has_one = seller`.
Buy binds `mint` and vault ATA to `listing.mint` / listing PDA.

**Rationale**: Principle II — reject and leave balances unchanged. Mirror
escrow’s constraint-first style so the six tests can assert either a
custom code or a constraint code, same as `escrow/tests/escrow.ts`.

**Alternatives considered**:

- Soft success / no-op on stale listings — constitution violation.
- Manual pubkey equality without seeds — weaker; seeds are the real ACL.

## 8. Test harness

**Decision**: Mocha + `ts-mocha` + chai + `@anchor-lang/core` 1.1.2,
file `marketplace/tests/marketplace.ts`, patterns copied from
`escrow/tests/escrow.ts` (retry helper, `expectFail`, fund keypairs,
explicit account metas). Six cases:

1. List → Buy  
2. List → Cancel  
3. Double-buy fails  
4. Buy after cancel fails  
5. Non-seller cancel fails  
6. Wrong mint / inactive listing fails  

`Anchor.toml` provider cluster defaults to **localnet**. Same tests run
on Devnet when `ANCHOR_PROVIDER_URL` / wallet point at Devnet.

**Rationale**: User asked to match repo escrow quality; localnet avoids
Devnet 429s in cloud CI. Constitution III names these six cases.

**Alternatives considered**:

- Bankrun / LiteSVM only — faster, but diverges from escrow’s mocha
  provider tests and is less “Devnet-ready.”
- Devnet-only like current `escrow/Anchor.toml` — flakes in this
  environment; still supported as an override.

## 9. Frontend (deferred)

**Decision**: Do not implement React in the program PR. Later:
`marketplace/frontend/` Vite + React + TypeScript (strict) + wallet-adapter,
routes `/`, `/list`, `/listing/:id` (`:id` = listing PDA base58), `/mine`.
Visuals follow the Superdesign purple crypto dark theme (Connect, Home,
List, Detail/Buy, My listings). Wallet control + Devnet badge on every
page. Patterns from `voting/frontend/`.

**Rationale**: Constitution IV (Superdesign before React) and this PR’s
explicit out-of-scope list. Listing URL id is the PDA address
(plan-time resolution of the spec assumption).

**Alternatives considered**:

- Scaffold empty Vite app now — rejected; unused surface, review noise.
- Put UI in `capstone/` — rejected; wrong product home.

## 10. Toolchain and secrets

**Decision**: Match repo: Solana CLI 4.x, Rust 1.89, Anchor 1.1.2, Node
22. Deploy / test keypairs live in `~/encode-solana-keys/` or gitignored
`keys/` and `marketplace/target/deploy/*-keypair.json`. `.gitignore`
already ignores `keys/` and `**/*-keypair.json`.

**Rationale**: Constitution Additional Constraints + Principle VII.

**Alternatives considered**: Committing the program upgrade key for
“easy Devnet deploys” — rejected; leak/rotation cost.
