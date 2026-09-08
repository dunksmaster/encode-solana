# Tasks: NFT Marketplace Listing Desk

**Input**: Design documents from `/specs/001-nft-marketplace/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/marketplace-program.md](./contracts/marketplace-program.md)

**Tests**: Required by constitution Principle III (six on-chain scenarios). Frontend tests are out of scope until the desk PR.

**Organization**: User-story phases. This PR implements Setup → Foundational → US1–US3 (program + tests) and Polish (program docs). US4–US5 (desk UI) stay unchecked until after Superdesign-faithful React work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)

## Path Conventions

- Program workspace: `marketplace/`
- Program crate: `marketplace/programs/marketplace/src/lib.rs`
- Tests: `marketplace/tests/marketplace.ts`
- Later desk: `marketplace/frontend/` (not this PR)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dedicated Anchor workspace; escrow stays intact

- [x] T001 Create `marketplace/` Anchor workspace files: `marketplace/Anchor.toml`, `marketplace/Cargo.toml`, `marketplace/rust-toolchain.toml`, `marketplace/package.json`, `marketplace/tsconfig.json`, `marketplace/.gitignore`, `marketplace/.prettierignore`
- [x] T002 Add program crate `marketplace/programs/marketplace/Cargo.toml` (anchor-lang / anchor-spl 1.1.2) and stub `marketplace/programs/marketplace/src/lib.rs` with a unique `declare_id!` (not escrow `4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr`)
- [x] T003 [P] Confirm root `.gitignore` ignores `keys/`, `**/*-keypair.json`, `**/target/`, `**/.anchor/` (append only if missing)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Listing account, errors, PDA seeds — blocks all instructions

**⚠️ CRITICAL**: No user-story instruction work until this phase is complete

- [x] T004 Define `Listing` account (`seller`, `mint`, `price`, `bump`, `is_active`) with `InitSpace` in `marketplace/programs/marketplace/src/lib.rs`
- [x] T005 [P] Define `MarketplaceError` (`InvalidPrice`, `InvalidNft`, `ListingInactive`) in `marketplace/programs/marketplace/src/lib.rs`
- [x] T006 Document program ID + localnet/devnet entries in `marketplace/Anchor.toml` matching `declare_id!`

**Checkpoint**: Foundation ready — instruction implementation can begin

---

## Phase 3: User Story 1 - List an NFT at a fixed SOL price (Priority: P1) 🎯 MVP

**Goal**: Seller lists an owned 0-decimal NFT; custody moves to the listing PDA vault

**Independent Test**: `list_nft` creates listing + vault; seller ATA amount 0; vault amount 1 and authority = listing PDA

### Tests for User Story 1

- [x] T007 [US1] Add mocha helpers (fund, `expectFail`, NFT mint, listing PDA) and a List happy-path assertion scaffold in `marketplace/tests/marketplace.ts`

### Implementation for User Story 1

- [x] T008 [US1] Implement `list_nft(price_lamports)` + `ListNft` accounts (seeds `["listing", seller, mint]`, vault ATA authority = listing) in `marketplace/programs/marketplace/src/lib.rs`
- [x] T009 [US1] Reject `price_lamports == 0` and non-NFT mints (`decimals != 0`) in `marketplace/programs/marketplace/src/lib.rs`

**Checkpoint**: List works independently; second list of same `(seller, mint)` fails while open

---

## Phase 4: User Story 2 - Buy a listed NFT in one atomic payment (Priority: P1)

**Goal**: Buyer pays exact SOL; receives NFT; listing + vault close

**Independent Test**: After buy, buyer ATA +1, seller lamports +price (plus rent), vault and listing gone; second buy fails

### Tests for User Story 2

- [x] T010 [US2] Add List→Buy, double-buy, and wrong-mint cases in `marketplace/tests/marketplace.ts`

### Implementation for User Story 2

- [x] T011 [US2] Implement `buy_nft()` + `BuyNft` accounts: SOL `system_program` transfer, `invoke_signed` vault → buyer, close vault + listing in `marketplace/programs/marketplace/src/lib.rs`
- [x] T012 [US2] Fail closed when listing inactive / missing or `mint` ≠ `listing.mint` in `marketplace/programs/marketplace/src/lib.rs`

**Checkpoint**: US1 + US2 independently testable

---

## Phase 5: User Story 3 - Seller cancels and recovers the NFT (Priority: P1)

**Goal**: Seller-only cancel returns the NFT and closes the listing

**Independent Test**: Seller cancel restores NFT; stranger cancel fails; buy after cancel fails

### Tests for User Story 3

- [x] T013 [US3] Add List→Cancel, buy-after-cancel, and non-seller cancel cases in `marketplace/tests/marketplace.ts`

### Implementation for User Story 3

- [x] T014 [US3] Implement `cancel_listing()` + `CancelListing` accounts (`seller` signer + seed/`has_one`, `invoke_signed` vault → seller) in `marketplace/programs/marketplace/src/lib.rs`

**Checkpoint**: All six Principle III tests exist and can be run via `marketplace/quickstart.md`

---

## Phase 6: User Story 4 - Browse the open desk (Priority: P2) — DEFERRED

**Goal**: Home / detail / mine views (Superdesign purple). **Not this PR.**

**Independent Test**: Open listings show image, name, price, seller; closed listings hidden

- [ ] T015 [P] [US4] Scaffold Vite + React + TS (strict) app in `marketplace/frontend/` matching Superdesign routes `/`, `/listing/:id`, `/mine`
- [ ] T016 [US4] Fetch open listings + Metaplex/Irys metadata for Exercise 10 members in `marketplace/frontend/src/`

---

## Phase 7: User Story 5 - Stay oriented to wallet and network (Priority: P2) — DEFERRED

**Goal**: Wallet control + Devnet badge on every desk surface. **Not this PR.**

**Independent Test**: Every route shows wallet + Devnet badge; writes blocked when disconnected or wrong cluster

- [ ] T017 [US5] Add wallet-adapter (Phantom) + persistent Devnet badge on `/`, `/list`, `/listing/:id`, `/mine` in `marketplace/frontend/src/`
- [ ] T018 [US5] Wire List / Buy / Cancel UI to the three program instructions in `marketplace/frontend/src/`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Docs and proofs for the program slice

- [x] T019 [P] Write `marketplace/README.md` (architecture, localnet/Devnet runbook, trade-offs, Explorer placeholder)
- [x] T020 [P] Update `WHERE-WE-ARE.md` and `docs/capstone/OPTION2-PLAN.md` for plan + program-in-progress
- [ ] T021 Run `marketplace/` build + the six tests per [quickstart.md](./quickstart.md); do not commit keypairs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS US1–US3
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on US1 (needs an open listing)
- **US3 (Phase 5)**: Depends on US1 (needs an open listing); parallelizable with US2 after T008
- **US4–US5**: Depend on program merge + Superdesign; **blocked for this PR**
- **Polish**: Depends on US1–US3 for this PR

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational
- **User Story 2 (P1)**: After US1 instruction exists
- **User Story 3 (P1)**: After US1 instruction exists
- **User Story 4–5 (P2)**: After program + Superdesign; later PR

### Parallel Opportunities

- T003, T005, T019, T020 once their prerequisites exist
- US4/US5 only after this PR merges

---

## Parallel Example: User Story 1

```bash
# After T004–T006:
Task: "Implement list_nft in marketplace/programs/marketplace/src/lib.rs"
Task: "Add list helpers + assertions in marketplace/tests/marketplace.ts"
```

---

## Implementation Strategy

### MVP (this PR)

1. Phase 1–2: workspace + Listing + errors
2. Phase 3–5: list / buy / cancel + six mocha tests
3. Phase 8: README + WHERE-WE-ARE
4. **STOP**: do not start T015–T018

### Incremental Delivery

1. Program + tests merge
2. Later PR: Vite desk (T015–T018) + Devnet Explorer proofs

### Suggested MVP scope

US1–US3 on-chain only (T001–T014, T019–T021).

---

## Notes

- Do not edit `escrow/`, `voting/`, or `nfts/` app code
- Do not commit private keys
- `[x]` on T001–T014 / T019–T021 means the program slice is done, not Week 6
