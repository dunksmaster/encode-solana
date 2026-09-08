<!--
Sync Impact Report
- Version change: (placeholder / unversioned template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Course-First Delivery
  - [PRINCIPLE_2_NAME] → II. On-Chain Safety First
  - [PRINCIPLE_3_NAME] → III. Test-First On-Chain (NON-NEGOTIABLE)
  - [PRINCIPLE_4_NAME] → IV. Spec-Before-Code
  - [PRINCIPLE_5_NAME] → V. Simplicity / YAGNI
- Added principles:
  - VI. Reuse Over Rewrite
  - VII. Proofs and Documentation
- Added sections:
  - Additional Constraints (replaces [SECTION_2_NAME])
  - Development Workflow (replaces [SECTION_3_NAME])
  - Governance (filled from [GOVERNANCE_RULES])
- Removed sections: none (template placeholders replaced)
- Follow-up TODOs: none — all placeholders replaced
-->

# Encode Solana — Week 6 Capstone Constitution

## Core Principles

### I. Course-First Delivery

The Week 6 capstone MUST ship a demoable Solana Devnet program plus a
Phantom-connected UI that satisfies Encode Deck 06. The demo MUST combine
at least three prior course skills: NFT / Metaplex (Exercise 10), an
escrow-style PDA vault (Exercise 8 pattern), and a React + Phantom frontend
(Exercise 7 pattern). A write-up, a local scaffold, or a program with no
wallet UI does not satisfy this principle.

**Rationale**: The course grades a live Devnet walkthrough, not a design
doc. Delivery is the program + UI a reviewer can operate with Phantom.

### II. On-Chain Safety First

List, buy, and cancel MUST each complete atomically in a single transaction.
The marketplace vault authority MUST be the listing PDA (never a user
keypair). Only the listing seller MUST be able to cancel. The program MUST
fail closed — reject and leave state unchanged — on double-buy, buy after
cancel, wrong mint, and inactive listing.

**Rationale**: An NFT marketplace is a custody protocol. Partial fills,
shared vault keys, or silent success on stale listings let one side cheat.

### III. Test-First On-Chain (NON-NEGOTIABLE)

Anchor / integration tests covering the six deck scenarios MUST exist and
pass before the marketplace is claimed done:

1. List then Buy
2. List then Cancel
3. Double-buy fails
4. Buy after cancel fails
5. Non-seller cancel fails
6. Wrong mint or inactive listing fails

Tests MUST be written (or updated) before treating an instruction as
complete. A UI demo MUST NOT be used as a substitute for these tests.

**Rationale**: Exercise 8 already proved these six cases catch the failure
modes that lose NFTs or SOL. Repeating them is the quality gate.

### IV. Spec-Before-Code

New features MUST follow Spec Kit in order: constitution → specify → plan
→ tasks, then implementation. The Superdesign canvas for the marketplace
UI MUST be reviewed and approved before React screens are coded. Pull
requests that jump straight to program or frontend code for a new feature
MUST be rejected until the spec artifacts exist.

**Rationale**: The repo already paid for ad-hoc scaffolds (Quoted Escrow
Desk). Spec-first keeps Option 2 scoped to Encode Deck 06.

### V. Simplicity / YAGNI

v1 MUST accept SOL-only payment. The marketplace MUST live in a dedicated
`marketplace/` tree and MUST NOT replace or rewrite the existing token
escrow program under `escrow/`. v1 MUST NOT include offers, auctions, a
royalties UI, multi-currency / SPL payment, search, or mainnet deployment.

**Rationale**: Deck 06 asks for list / buy / cancel with escrow. Extra
market features delay the demo and expand the attack surface.

### VI. Reuse Over Rewrite

The capstone MUST reuse the Exercise 10 NFT collection already on Devnet
(collection `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd` and its
members), the PDA / vault patterns from `escrow/`, and the Phantom
wallet-adapter patterns from `voting/frontend` (and the `capstone/` desk
only as a prior experiment). Existing token escrow MUST remain intact for
reference. New code MUST be justified by a gap those pieces do not cover.

**Rationale**: Encode grades composition of prior skills. Rewriting escrow
or reminting the collection wastes the Week 5 proofs.

### VII. Proofs and Documentation

The marketplace README MUST include architecture, a Devnet runbook,
explicit trade-offs, and Solana Explorer links for the deployed program
plus sample list / buy / cancel transactions. Private keys and deploy
keypairs MUST NEVER be committed.

**Rationale**: The course deliverable is a reproducible demo another
student or reviewer can follow from the repo alone.

## Additional Constraints

- **Cluster**: Demo and proofs MUST target Solana Devnet only. Mainnet is
  out of scope for v1.
- **Secrets**: Private keys, program upgrade authorities, and wallet
  keypairs MUST stay outside git (`keys/`, `~/encode-solana-keys/`, or
  equivalent). If a key is leaked, it MUST be rotated and removed from
  history before the next push.
- **Stack**: On-chain work MUST use Anchor. The UI MUST use Vite + React +
  TypeScript with `@solana/wallet-adapter`. TypeScript MUST be compiled in
  strict mode where a `tsconfig` applies.
- **Program identity**: Instructions are `list_nft(price_lamports)`,
  `buy_nft()`, and `cancel_listing()`. Listing PDA seeds MUST be
  `["listing", seller, mint]` and MUST store seller, mint, price, bump,
  and `is_active`. The vault ATA MUST be owned by the listing PDA; buy and
  cancel MUST `invoke_signed` as that PDA.
- **Prior experiment**: `capstone/` (Quoted Escrow Desk) stays as a prior
  experiment. It MUST NOT be the Option 2 marketplace home.

## Development Workflow

1. Amend or confirm this constitution if governance changes.
2. `/speckit-specify` — feature spec, quality checklist, and feature
   directory under `specs/`.
3. `/speckit-plan` — technical plan against this constitution.
4. `/speckit-tasks` — implementation task breakdown.
5. Superdesign canvas for the marketplace UI; approval required before
   React implementation.
6. Anchor tests for the six scenarios (Principle III), then program + UI.
7. README proofs: Explorer program + sample transaction links.

PRs for new features MUST include the Spec Kit artifacts for that feature
(or an explicit amendment recorded below). Reviewers MUST check Principles
II and III before approving on-chain changes.

## Governance

This constitution supersedes ad-hoc coding habits, prior Idea A / Quoted
Escrow Desk assumptions, and undocumented shortcuts. When a habit and a
principle conflict, the principle wins.

Amendments MUST be written in this file with the change date, a short
reason, and a semantic version bump:

- **MAJOR**: remove or redefine a principle in a backward-incompatible way
- **MINOR**: add a principle or materially expand guidance
- **PATCH**: clarification, wording, or typo-only refinement

Compliance review: every PR that adds a feature or changes on-chain
behavior MUST show that Spec Kit specify → plan → tasks was not skipped,
that the six safety tests are present or scheduled, and that no private
keys are included. Exceptions require an amendment dated in this file
before merge.

**Version**: 1.0.0 | **Ratified**: 2026-09-07 | **Last Amended**: 2026-09-07
