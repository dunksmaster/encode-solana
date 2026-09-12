# Capstone Option 2 — Claude Code chunks (<200k context each)

Goal: finish Encode Week 6 NFT marketplace without stuffing the whole repo into one session.

## Skills to load (prefer these, not everything)

Per chunk, only attach what that chunk needs:

| Skill | When |
| --- | --- |
| `to-tickets` / `speckit-tasks` | Break work into tickets once |
| `implement-spec` / `speckit-implement` | Build against plan/spec |
| `tdd` | Program bugs / new tests |
| `handoff` / `claude-handoff` | End of each chunk → next session |
| `code-review` | After frontend or program change |
| Superdesign canvas (reference URLs only) | UI implementation |

Repo: https://github.com/dunksmaster/encode-solana  
PR with program (merge first): https://github.com/dunksmaster/encode-solana/pull/3  
Branch: `cursor/nft-marketplace-plan-c543`  
Local: `~/encode-solana` (WSL)

---

## Chunk 0 — Merge + sync (human / SOL, ~5 min)

1. Merge PR #3 into main  
2. `cd ~/encode-solana && git pull origin main`  
3. Confirm `marketplace/` exists  

No Claude needed.

---

## Chunk A — Ticketize remaining work (~30–50k context)

**Open in Claude Code:** only these files

- `specs/001-nft-marketplace/spec.md`
- `specs/001-nft-marketplace/plan.md`
- `specs/001-nft-marketplace/tasks.md`
- `docs/capstone/OPTION2-PLAN.md`
- `WHERE-WE-ARE.md`
- this file `CAPSTONE-CLAUDE-CHUNKS.md`

**Skill:** `/to-tickets` or Spec Kit tasks skill  

**Prompt:**

```text
Use to-tickets (or turn tasks.md into GitHub-ready tickets).

Remaining Encode Week 6 Option 2 work only:
1) Merge already assumed done — skip
2) marketplace/frontend Vite+React+TS purple Superdesign desk (Connect, Home, List, Detail/Buy, My listings)
3) Wire Phantom + Anchor IDL for list_nft / buy_nft / cancel_listing
4) Devnet deploy + Explorer proofs
5) Capstone README polish

Constraints: SOL-only, reuse Ex 10 NFTs, keep escrow/ untouched, no mainnet.

Output: CAPSTONE-TICKETS.md with tickets sized for <200k context each (title, files to open, acceptance criteria, skill to use). Do not implement.
```

---

## Chunk B — Frontend scaffold only (~80–120k)

**Open:**

- `marketplace/README.md`
- `marketplace/Anchor.toml`
- `marketplace/target/idl/marketplace.json` (after build) OR program lib for account shapes
- `voting/frontend/` as pattern (package.json, wallet provider, App) — not whole tree if huge; only wallet + main App
- `specs/001-nft-marketplace/plan.md` UI section
- design tokens from plan: purple `#0c0614` / `#160b24` / `#8b5cf6` (do NOT pull entire Superdesign HTML)

**Skill:** `implement-spec`  

**Prompt:**

```text
Use implement-spec. Scaffold marketplace/frontend only:
- Vite + React + TS + @solana/wallet-adapter
- Routes: /, /list, /listing/:id, /mine
- Purple crypto dark tokens (page #0c0614, card #160b24, CTA #8b5cf6)
- Placeholder screens matching Connect / Home / List / Detail / Mine
- No real Anchor calls yet — stub buttons
- Mirror voting/frontend wallet wiring patterns

Stop when `npm run build` succeeds. Do not deploy. Write a short handoff note at end.
```

---

## Chunk C — Wire list + cancel (~100–150k)

**Open:**

- `marketplace/frontend/` (Chunk B output)
- `marketplace/programs/marketplace/src/lib.rs`
- IDL / types
- `marketplace/tests/marketplace.ts` (list + cancel cases only)

**Skill:** `tdd` then implement  

**Prompt:**

```text
Use tdd. Wire Phantom to list_nft and cancel_listing only.
Acceptance:
- Connected wallet can list an owned NFT mint at SOL price
- Seller can cancel and reclaim NFT
- Non-seller cancel fails (surface error)
Do not implement buy yet. Keep Devnet cluster. Handoff when tests or manual checklist for list/cancel pass.
```

---

## Chunk D — Wire buy (~80–120k)

**Open:** Chunk C frontend + buy paths in lib.rs + buy tests in marketplace.ts  

**Skill:** `tdd`  

**Prompt:**

```text
Use tdd. Wire buy_nft only.
Acceptance: buyer pays SOL, receives NFT, listing closes; double-buy and buy-after-cancel fail with clear UI errors.
Do not redesign UI. Handoff when buy path works on localnet or Devnet.
```

---

## Chunk E — Devnet deploy + proofs (~40–80k)

**Open:**

- `marketplace/Anchor.toml`
- `marketplace/README.md`
- deploy scripts if any
- WHERE-WE-ARE.md

**Prompt:**

```text
Deploy marketplace program to Solana Devnet (no private keys in git).
Update README with: program id, Explorer program link, sample list/buy/cancel tx links.
Update WHERE-WE-ARE.md. Do not change program logic unless deploy requires Anchor.toml cluster tweak.
```

---

## Chunk F — Capstone polish + review (~40–80k)

**Open:** README, WHERE-WE-ARE, frontend README, constitution checklist  

**Skill:** `code-review`  

**Prompt:**

```text
Use code-review against Encode Deck 06 Option 2 deliverables.
Output CAPSTONE-SUBMIT-CHECKLIST.md: Done / Missing / Risks.
Fix only docs gaps; no big refactors.
```

---

## Context budget rules (keep under ~200k)

1. Never open whole `node_modules`, `target/`, `Cargo.lock`, or all of Week 1–5.
2. One feature per session (scaffold OR list OR buy OR deploy).
3. End every session with `handoff` summary (files changed, commands to run, next chunk letter).
4. Prefer PR #3 branch / main after merge — not random uncommitted Superdesign HTML dumps.
5. If Claude starts reading escrow + voting + nfts + marketplace all at once → stop and restart with the file list above.

## Suggested order

A → B → C → D → E → F

Parallel OK after A: B can start while you merge if you checkout the PR branch.
