# Implementation Plan: NFT Marketplace Listing Desk

**Branch**: `001-nft-marketplace` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-nft-marketplace/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Sellers list a course-collection NFT at a fixed SOL price; buyers pay that
price and receive the NFT in one atomic transaction; sellers can cancel and
recover the NFT. Delivery is a **new Anchor program** in a dedicated
`marketplace/` workspace (escrow stays intact) plus, later, a Vite + React
Phantom desk matching the Superdesign purple crypto theme.

On-chain: `list_nft(price_lamports)`, `buy_nft()`, `cancel_listing()`.
Listing PDA seeds `["listing", seller, mint]` store seller, mint, price,
bump, and `is_active`. The vault is the mint ATA owned by that PDA; buy and
cancel release the NFT with `invoke_signed` (Anchor `CpiContext::new_with_signer`).
Payment is native SOL only. Six Anchor/mocha tests are the quality gate
before the program is claimed done. React is **out of scope for the first
implementation slice** (this PR): Superdesign is design-locked; frontend
follows after the program merges.

## Technical Context

**Language/Version**: Rust 1.89 (workspace `rust-toolchain.toml`, edition
2021) for the program; TypeScript 5.x (strict where a `tsconfig` applies)
for tests and the later desk.

**Primary Dependencies**: Anchor 1.1.2 + `anchor-lang` / `anchor-spl`
(match `escrow/`); `@solana/web3.js` + `@solana/spl-token` in tests; later
UI: Vite + React + `@solana/wallet-adapter` (Phantom). Metaplex metadata
is read-only off-chain for the desk; the program does not CPI Metaplex.

**Storage**: Solana accounts only. Listing PDA + vault ATA. No database.
Off-chain metadata (name, image) stays on existing Irys URIs for Exercise
10 mints.

**Testing**: Anchor mocha (`ts-mocha` + chai) mirroring `escrow/tests/escrow.ts`.
Default cluster for automated tests: **localnet** (reproducible in CI /
cloud agents). The same suite is Devnet-ready via `Anchor.toml` provider
override. Tests mint local 0-decimal / amount-1 tokens; they do not require
Exercise 10 keypairs.

**Target Platform**: Solana **Devnet** for the graded demo. Localnet for
program tests. Mainnet is out of scope (constitution).

**Project Type**: Anchor program workspace + (later) Vite SPA. Monorepo
sibling of `escrow/`, `voting/`, `nfts/`.

**Performance Goals**: Each list / buy / cancel completes in a single
transaction. Desk list / buy / cancel under three minutes for a funded
Devnet wallet (SC-001 / SC-002). No throughput target — demo scale.

**Constraints**: Atomic instructions; vault authority = listing PDA; seller-only
cancel; fail-closed on double-buy, buy-after-cancel, wrong mint, inactive
listing; SOL-only; never commit private keys; do not rewrite `escrow/` or
treat `capstone/` as the Option 2 home.

**Scale/Scope**: One program, three instructions, four desk routes later
(`/`, `/list`, `/listing/:id`, `/mine`). Demo catalog is three Exercise 10
members under collection `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd`.
No offers, auctions, royalties UI, search, or SPL payment in v1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| :--- | :--- | :--- |
| I. Course-First Delivery | PASS (feature-complete) | Plan includes program + Phantom desk. This implementation slice ships the program + six tests only; React waits on the already-locked Superdesign canvas (Principle IV). A program-only merge does **not** finish Week 6. |
| II. On-Chain Safety First | PASS | One-tx list / buy / cancel; vault authority = listing PDA; seller-only cancel; fail-closed errors. |
| III. Test-First On-Chain | PASS | Six deck scenarios are mandatory automated tests; UI is not a substitute. |
| IV. Spec-Before-Code | PASS | Constitution + specify exist; this plan; Superdesign locked before React; `/speckit-tasks` next for remaining UI work. |
| V. Simplicity / YAGNI | PASS | SOL-only; new `marketplace/` tree; `escrow/` untouched; no v1 extras. |
| VI. Reuse Over Rewrite | PASS | Ex 10 collection + members; PDA/vault pattern from `escrow/`; wallet-adapter from `voting/frontend` when UI starts. |
| VII. Proofs and Documentation | PASS (at demo) | Marketplace README: architecture, Devnet runbook, trade-offs, Explorer links. Keys never committed. Explorer links fill in after first Devnet deploy. |

**Gate result**: PASS. No unjustified violations. Complexity Tracking left empty.

### Post-design re-check (after Phase 1)

Design artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`)
keep the same gates: dedicated program, PDA vault + `invoke_signed`, SOL
transfer, six tests, frontend deferred. Still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-nft-marketplace/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── marketplace-program.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
marketplace/                          # NEW workspace (program now; frontend later)
├── Anchor.toml
├── Cargo.toml
├── rust-toolchain.toml
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md                         # architecture + Devnet runbook + proofs
├── programs/marketplace/
│   ├── Cargo.toml
│   └── src/lib.rs                    # list_nft / buy_nft / cancel_listing
└── tests/
    └── marketplace.ts                # six constitution scenarios

# Later PR (out of scope here)
marketplace/frontend/                 # Vite + React + wallet-adapter
# Superdesign-locked routes: /, /list, /listing/:id, /mine

# Untouched (pattern / catalog references only)
escrow/                               # Exercise 8 — do not rewrite
nfts/                                 # Exercise 10 collection + members
voting/frontend/                      # Phantom adapter patterns
capstone/                             # prior Quoted Escrow Desk experiment
```

**Structure Decision**: Dedicated Anchor workspace at `marketplace/`,
mirroring `escrow/` so the token-escrow exercise stays a working reference.
The future Vite desk lives under `marketplace/frontend/` in a later PR.
Do not nest the marketplace program inside `escrow/` or reuse
`capstone/` as the Option 2 home.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations. Table omitted.
