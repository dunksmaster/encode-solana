# CHUNK A — Ticketize remaining NFT marketplace work

**Goal:** Turn remaining Encode Week 6 Option 2 work into small tickets. **Do not implement code.**

**Skills:** `to-tickets` (preferred) or Spec Kit `speckit-tasks`  
**Context budget:** Keep under ~200k. Open ONLY the files listed below.

## Open these files only

- `docs/capstone/CHUNK-A-tickets.md` (this brief)
- `docs/capstone/OPTION2-PLAN.md` (if present) or `docs/capstone/` plan docs
- `specs/001-nft-marketplace/spec.md`
- `specs/001-nft-marketplace/plan.md` (on PR #3 / after merge)
- `specs/001-nft-marketplace/tasks.md` (if present)
- `WHERE-WE-ARE.md`
- `marketplace/README.md` (if `marketplace/` exists — from PR #3)

Do **not** open: `node_modules`, `target/`, `Cargo.lock`, Week 1–5 exercise trees, Superdesign HTML dumps, whole `escrow/` or `voting/`.

## Already done (do not ticket as new work)

- Constitution + feature spec (merged)
- Superdesign purple UI design lock (5 screens) — design only
- Anchor program `list_nft` / `buy_nft` / `cancel_listing` + 6 localnet tests — on PR #3 (merge may be pending)

## Remaining scope to ticket

1. Confirm / sync `marketplace/` on main (merge PR #3) — note as blocker if missing
2. `marketplace/frontend` Vite + React + TS purple desk (Connect, Home, List, Detail/Buy, My listings)
3. Wire Phantom + Anchor IDL: list + cancel
4. Wire buy
5. Devnet deploy + Explorer proofs
6. Capstone README / hand-in polish

## Constraints

- SOL-only pricing
- Reuse Ex 10 NFTs (collection `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd`)
- Keep `escrow/` intact; new code under `marketplace/`
- Devnet only; never commit private keys
- Purple tokens: page `#0c0614`, card `#160b24`, CTA `#8b5cf6` (not navy)

## Output

Write `docs/capstone/CAPSTONE-TICKETS.md` with tickets sized for &lt;200k context each:

For each ticket include:
- Title
- Depends on
- Files to open (explicit allow-list)
- Skill to use (`implement-spec`, `tdd`, `code-review`, etc.)
- Acceptance criteria
- Out of scope

**Stop** when `CAPSTONE-TICKETS.md` is written. No app code changes.
