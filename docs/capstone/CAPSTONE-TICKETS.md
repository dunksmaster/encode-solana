# Capstone Tickets — Encode Week 6 Option 2 (NFT Marketplace)

Generated from `docs/capstone/CHUNK-A-tickets.md` per its brief. No code
was changed to produce this file — planning only.

**Source state audited** (see `CAPSTONE-AUDIT.md` at repo root for detail):
`main` has the constitution + `spec.md` only. `specs/001-nft-marketplace/plan.md`,
`tasks.md`, the `marketplace/` Anchor program, and its six tests exist only
on the open [PR #3](https://github.com/dunksmaster/encode-solana/pull/3)
(`cursor/nft-marketplace-plan-c543`) — **not merged**. No `marketplace/frontend/`
exists on either branch. No Devnet deploy or Explorer links exist yet.

**Skill-name note**: `implement-spec`, `tdd`, and `handoff` (named in
`CAPSTONE-CLAUDE-CHUNKS.md`) are not registered Claude Code skills in this
environment — only `code-review` is. Where a ticket below names one of
those three, treat it as a description of the working method (spec-driven
implementation / test-first / end-of-session handoff note), not a `/slash`
command, unless a future session has them installed. Cursor's
`.cursor/skills/speckit-implement` and `speckit-tasks` are Cursor-only and
not invocable from Claude Code either.

---

## TICKET-0: Merge PR #3 into `main`

**Depends on**: nothing — this blocks every other ticket below.

**Files to open**: none (a git operation, not a code-reading task). If
conflicts appear, open only the conflicting file(s).

**Skill to use**: none — plain `git merge` / GitHub PR merge. No Claude
session needed unless conflicts require judgment calls.

**Acceptance criteria**:
- `main` contains `specs/001-nft-marketplace/plan.md`, `research.md`,
  `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`.
- `main` contains `marketplace/` (Anchor.toml, Cargo.toml, `programs/marketplace/src/lib.rs`,
  `tests/marketplace.ts`, `README.md`).
- `escrow/`, `voting/`, `nfts/`, `capstone/` are unchanged by the merge
  (confirm with `git diff --stat` against pre-merge `main` over those paths
  — should be empty).
- No keypair/`*-keypair.json`/`id.json` files were introduced.

**Out of scope**: fixing anything found on inspection — the buyer-ATA gap
(TICKET-1) and toolchain gap (TICKET-2) are separate tickets and should be
done *after* this merge, on `main`, not on the PR branch.

---

## TICKET-1: Fix `buy_nft`'s missing `init_if_needed` on `buyer_ata`

**Depends on**: TICKET-0 (work happens on `main` once merged; can instead
be done directly on the PR #3 branch before merge if that's easier to land
as one review).

**Files to open**:
- `marketplace/programs/marketplace/src/lib.rs`
- `specs/001-nft-marketplace/contracts/marketplace-program.md`
- `marketplace/tests/marketplace.ts`

**Skill to use**: `tdd` (add the failing case first, then fix).

**Why this is a ticket**: the contract doc (`marketplace-program.md` line 56)
documents `buyer_ata` as `init_if_needed, payer = buyer`, but the actual
`BuyNft` struct in `lib.rs` only has a plain existing-account constraint.
Every current test passes only because the test helper (`ensureAta`)
pre-creates the buyer's ATA before every `doBuy()` call. A real first-time
buyer (no prior ATA for that mint) will hit `AccountNotInitialized` or an
owner-mismatch instead of completing the purchase.

**Acceptance criteria**:
- `BuyNft.buyer_ata` in `lib.rs` gets `init_if_needed, payer = buyer` (plus
  whatever `associated_token::mint`/`authority` constraints already exist).
- A new test in `marketplace.ts` exercises "buyer has never held this mint
  before" (i.e. does **not** call `ensureAta()` for the buyer first) and
  passes.
- All six existing scenario tests still pass.
- `IDL`/generated types regenerated if the account list order/attrs change.

**Out of scope**: the frontend (TICKET-4/5) — this is a program-only fix.
Do not touch `list_nft` or `cancel_listing`.

---

## TICKET-2: Local toolchain fix (Node in WSL + SBPFv3 platform-tools)

**Depends on**: nothing — can run in parallel with everything else. Blocks
being able to actually run `npm test` / `anchor test` locally to verify
TICKET-1 and any later program change.

**Files to open**: none — this is environment setup, not code.

**Skill to use**: none.

**Why this is a ticket**: `WHERE-WE-ARE.md` claims "Solana CLI 4.2.1 /
Node 22.x", but the WSL dev environment actually has `solana-cli 3.1.10`
(platform-tools v1.52, which ships only `sbpf`/`sbpfv1`/`sbpfv2` targets —
no `sbpfv3-solana-solana`) and no working `node` binary on `PATH` (only a
Windows npm shim visible from WSL; `~/.nvm` exists but has no `nvm.sh`).
`cargo-build-sbf --arch v3` — exactly what `marketplace/package.json`'s
`build` script and `scripts/test-localnet.sh` invoke — fails as a result.

**Acceptance criteria**:
- `node --version` and `npm --version` work natively inside the WSL
  Ubuntu shell (install via nvm, matching "Node 22.x").
- `solana-install update` (or equivalent) brings platform-tools to a
  version that ships an `sbpfv3-solana-solana` rustlib target, OR the
  build scripts are confirmed to work with `--arch v2` instead and
  `README.md` / `test-localnet.sh` are corrected to match reality — pick
  whichever is true after checking, don't guess.
- `cd marketplace && npm install && npm test` (with `solana-test-validator
  --reset` running) prints `6 passing` with **no** modification to test
  logic.

**Out of scope**: fixing any test failures this surfaces beyond TICKET-1's
known gap — file a new ticket if something else fails.

---

## TICKET-3: Scaffold `marketplace/frontend` (Vite + React + TS, purple theme, no chain calls)

**Status: DONE.** `marketplace/frontend/` exists (Vite + React 18 + TS
strict + `@solana/wallet-adapter` + `react-router-dom`), `npm run build`
passes clean. Left uncommitted in the working tree pending TICKET-0.

**Depends on**: TICKET-0 (needs `marketplace/` on `main` for IDL/account
shapes to reference).

**Files to open**:
- `marketplace/README.md`
- `marketplace/Anchor.toml`
- `marketplace/target/idl/marketplace.json` (after a build) — or, if no
  build is available yet, `marketplace/programs/marketplace/src/lib.rs`
  just for the account/instruction shapes
- `voting/frontend/package.json`, `voting/frontend/src/main.tsx`, and
  whichever single file holds its wallet-adapter provider setup — **not**
  the whole `voting/frontend/` tree
- `specs/001-nft-marketplace/plan.md` (UI section only) and
  `specs/001-nft-marketplace/data-model.md` (desk identifier section)
- Purple tokens (already given, don't re-derive): page `#0c0614`, card
  `#160b24`, border `#3b2460`/`#4c1d95`, text `#f3e8ff`, muted
  `#c4b5fd`/`#a78bfa`, CTA `#8b5cf6`/`#a855f7`, accent `#d946ef` sparingly.
  Banned colors: `#0b1220`, `#121a2b`, `#3b82f6` (these are navy, not the
  approved purple).

**Skill to use**: `implement-spec`.

**Acceptance criteria**:
- `marketplace/frontend/` exists: Vite + React + TypeScript (strict) +
  `@solana/wallet-adapter` (Phantom), mirroring `voting/frontend`'s wiring
  pattern.
- Four routes exist with placeholder content matching the Superdesign
  route DNA: `/` (browse), `/list` (create listing), `/listing/:id`
  (detail), `/mine` (wallet's own listings).
- Wallet control + a visible Devnet badge render on every route.
- Buttons for List / Buy / Cancel exist but are stubs (no real Anchor
  calls yet — that's TICKET-4/5).
- `npm run build` succeeds with no type errors.
- A short handoff note (files created, how to run `npm run dev`, what's
  stubbed) is left at the end of the session.

**Out of scope**: wiring any of the three instructions, fetching real
listing data, deploying anywhere. Don't try to pull the actual Superdesign
HTML — the live design lives on the superdesign.dev canvas referenced in
`.superdesign/resume.json` on `main` (uncommitted); use the token values
and route DNA above, not a scrape of that canvas.

---

## TICKET-4: Wire Phantom + Anchor IDL — `list_nft` and `cancel_listing`

**Depends on**: TICKET-3 (frontend scaffold), TICKET-0.

**Files to open**:
- `marketplace/frontend/` (TICKET-3's output)
- `marketplace/programs/marketplace/src/lib.rs` (for `ListNft`/`CancelListing`
  account shapes and error codes)
- `marketplace/target/idl/marketplace.json` / generated TS types
- `marketplace/tests/marketplace.ts` — **only** the List and Cancel test
  cases, for account-derivation reference (PDA seeds, ATA derivation)

**Skill to use**: `tdd`, then implement.

**Acceptance criteria**:
- A connected wallet on `/list` can pick an owned mint (from the Exercise 10
  catalog: `9MJyuTGDjdTmFGueYCJMtuBrMYu4JRHMCEhLrke4XfrQ`,
  `YA936cqURpMGpZLNsWp9492B3DUwTUhFQ4hynEfKjUJ`,
  `3t7ao1ar14m8gU7n7EECfwgRWwoMEKLa3S8XNtCdMAEp`), enter a SOL price, and
  successfully call `list_nft` on Devnet, with the new listing then visible
  on `/` or `/mine`.
- The seller can cancel their own open listing from `/mine` or
  `/listing/:id`, successfully calling `cancel_listing`, and the NFT
  returns to their wallet.
- A non-seller attempting cancel is blocked client-side (button
  disabled/hidden) **and** a raw attempt still fails on-chain with a
  surfaced, readable error (not a raw RPC dump).
- Disconnected wallets or wallets on the wrong cluster cannot trigger List
  or Cancel (constitution FR — badge + guard, not just hidden buttons).

**Out of scope**: `buy_nft` (TICKET-5). Do not redesign the scaffold's
layout — only wire behavior into it.

---

## TICKET-5: Wire `buy_nft`

**Depends on**: TICKET-4 (list/cancel wiring pattern established),
TICKET-1 (the buyer-ATA program fix — wiring buy against the *unfixed*
program will work in tests only because of the pre-created-ATA test
helper, and will break for real first-time buyers).

**Files to open**:
- `marketplace/frontend/` (TICKET-4's output — the list/cancel wiring)
- `marketplace/programs/marketplace/src/lib.rs` (`BuyNft` shape, post-TICKET-1)
- `marketplace/tests/marketplace.ts` — buy, double-buy, buy-after-cancel,
  wrong-mint cases only

**Skill to use**: `tdd`.

**Acceptance criteria**:
- A connected buyer on `/listing/:id` can pay the listed SOL price and
  receive the NFT in one signature; the seller's balance increases by the
  price; the listing disappears from the open desk afterward.
- Double-buy and buy-after-cancel both fail with a surfaced, readable
  error, not a raw RPC/AnchorError dump.
- Buying as a wallet that has never held that mint before (the TICKET-1
  case) succeeds without a separate manual "create ATA" step.

**Out of scope**: Devnet deploy itself (TICKET-6) — this can be built and
checked against localnet or an already-deployed Devnet program ID.

---

## TICKET-6: Devnet deploy + Explorer proofs

**Depends on**: TICKET-1 (program fix should be deployed, not the buggy
version), TICKET-2 (need a working toolchain to build/deploy).

**Files to open**:
- `marketplace/Anchor.toml`
- `marketplace/README.md`
- `marketplace/scripts/test-localnet.sh` (for a deploy-script pattern, if
  one needs to be written for Devnet)
- `WHERE-WE-ARE.md`

**Skill to use**: none required — this is CLI operation plus doc updates.

**Acceptance criteria**:
- `anchor deploy --provider.cluster devnet` succeeds; program ID matches
  `declare_id!` / `Anchor.toml`'s `[programs.devnet]` entry
  (`6pKDRYpkfoAjL8nVDDLT6QrZFjX9yFeo4jBiSf1Ht4pt`, unless it was
  regenerated).
- `anchor test --provider.cluster devnet` (or the six mocha tests pointed
  at Devnet) passes.
- `marketplace/README.md`'s "Explorer proofs" section is filled in with a
  **real** Explorer link for the deployed program and one real transaction
  signature each for `list_nft`, `buy_nft`, `cancel_listing` — copied from
  an actual run, never fabricated.
- `WHERE-WE-ARE.md` updated to reflect Devnet deployment status.
- No deploy/upgrade keypair is committed (`~/encode-solana-keys/` or
  gitignored `keys/` only).

**Out of scope**: mainnet anything (explicitly out of scope for v1 per the
constitution).

---

## TICKET-7: Capstone hand-in polish + review

**Depends on**: TICKET-6 (need real Explorer links to write a truthful
README), and ideally TICKET-4/5 (frontend done) — can start docs-only
polish earlier if the team wants a rolling draft.

**Files to open**:
- `marketplace/README.md`
- `WHERE-WE-ARE.md`
- `marketplace/frontend/README.md` (if TICKET-3 created one)
- `.specify/memory/constitution.md` (for the compliance checklist only)

**Skill to use**: `code-review` (against Encode Deck 06 Option 2
deliverables — this is the one skill in this list that's actually
installed in this Claude Code environment).

**Acceptance criteria**:
- Output `docs/capstone/CAPSTONE-SUBMIT-CHECKLIST.md`: Done / Missing /
  Risks, written the same way `CAPSTONE-AUDIT.md` was — citing only what
  exists in the repo, no invented links or results.
- Any doc-only gaps found (stale trade-off notes, missing runbook steps)
  get fixed directly.
- No app-code refactors performed under this ticket — if `code-review`
  surfaces a real bug, file it as a new ticket instead of fixing it here.

**Out of scope**: anything requiring a code change to `lib.rs` or the
frontend beyond doc corrections.

---

## Dependency graph

```text
TICKET-0 (merge PR #3)
  ├─→ TICKET-1 (fix buyer_ata)
  │     └─→ TICKET-5 (wire buy) ←── TICKET-4 (wire list/cancel) ←── TICKET-3 (scaffold)
  ├─→ TICKET-3 (scaffold frontend)
  └─→ TICKET-6 (Devnet deploy) ←── TICKET-1, TICKET-2

TICKET-2 (toolchain fix) ── independent, feeds TICKET-1 verification + TICKET-6

TICKET-7 (polish) ←── TICKET-6 (needs real Explorer links)
```

**Suggested order**: 0 → (1 ∥ 2 ∥ 3) → 4 → 5 → 6 → 7.

## Constraints carried into every ticket

- SOL-only pricing (no SPL/multi-currency payment).
- Reuse Exercise 10 NFTs (collection `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd`).
- `escrow/`, `voting/`, `nfts/`, `capstone/` stay untouched.
- Devnet only — never mainnet, never commit private keys.
- Purple theme tokens only (see TICKET-3) — no navy (`#0b1220`, `#121a2b`, `#3b82f6`).
