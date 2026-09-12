# CHUNK B — Frontend scaffold only (no Anchor calls)

**Goal:** Scaffold `marketplace/frontend` purple React desk with stub screens. **No real program instructions yet.**

**Skills:** `implement-spec` (preferred)  
**Depends on:** Chunk A tickets helpful; PR #3 / `marketplace/` program folder should exist for IDL path later (scaffold can still proceed with stubs).  
**Context budget:** Keep under ~200k. Open ONLY the files listed below.

## Open these files only

- `docs/capstone/CHUNK-B-frontend-scaffold.md` (this brief)
- `docs/capstone/CAPSTONE-TICKETS.md` (if exists)
- `docs/capstone/OPTION2-PLAN.md`
- `specs/001-nft-marketplace/plan.md` (UI sections)
- `marketplace/README.md`
- `marketplace/Anchor.toml`
- Pattern reference (narrow): `voting/frontend/package.json`, wallet provider / main App entry only — not the whole voting tree
- Optional after `anchor build`: `marketplace/target/idl/marketplace.json` (do not invent IDL)

Do **not** open: Superdesign full HTML exports, `node_modules`, `target/deploy`, escrow program source, all of `nfts/`.

## Build

Create `marketplace/frontend` with:

- Vite + React + TypeScript
- `@solana/wallet-adapter-react` + Phantom (mirror voting/frontend patterns)
- Routes: `/` (home grid), `/list`, `/listing/:id`, `/mine`, plus a clear Connect / disconnected state
- Purple crypto dark theme:
  - page bg `#0c0614`
  - cards `#160b24`
  - borders `#3b2460`
  - text `#f3e8ff` / muted `#c4b5fd`
  - primary CTA `#8b5cf6`
  - Devnet pill always visible
- Placeholder listing cards + stub List / Buy / Cancel buttons (no transactions)
- `npm run build` must succeed

## Out of scope

- Real `list_nft` / `buy_nft` / `cancel_listing` calls (Chunks C–D)
- Devnet deploy
- Editing Anchor Rust

## Output / stop condition

- Scaffold committed or left clean in working tree
- `cd marketplace/frontend && npm run build` passes
- Short handoff at end: files created, how to run `npm run dev`, next chunk = C (wire list + cancel)
