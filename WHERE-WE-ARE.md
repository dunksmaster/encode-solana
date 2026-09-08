# Encode Solana — where we are

Last updated: 8 September 2026 (Europe/Budapest) — plan + marketplace program

Dorian Kane. Encode Solana Developer Course (6 weeks, 10 builds + capstone, all on **devnet**).
Work lives in WSL Ubuntu at `~/encode-solana`. **GitHub now has Weeks 1–5.**

**Progress: ~93% of builds** (10/11). Weeks 1–5 complete. **Week 6 official
path is Option 2 — NFT Marketplace**: spec + plan done; Anchor program +
six tests in `marketplace/`. React desk is next. Quoted Escrow Desk in
`capstone/` is a prior experiment.

Main wallet: `5kyuXhe2qeRGvANAATZAG9n9nRZM4iyc768mcxrqcDDG`

## Done

### Week 1 — foundations
Accounts, programs, PDAs, tokens, transaction lifecycle. No build.

### Week 2 Exercise 1 — Hello Solana
- Path: `hello-solana/`
- Program ID: `7S8zokoG9gvRRoxKw135HgP86FuXMNLQQ9PGikQrsBG7`

### Week 2 Exercise 2 — per-user PDA counter
- Path: `counter/`
- Program ID: `8qfKeo7f2EWEJzPCntc7qLBZu4rRxZZRh5XK5TxmMEgz`
- Counter PDA: `5zx27MCb66LhdWYx8UcqdVPxKWhWj6osNhFQytR8ed4K`

### Week 3 Exercise 3 — classic SPL token
- Path: `tokens/`
- Mint: `APZWUxbqLkVxBomyKW4K11jFLj7jqrAakGndRiQqPXZc` (Tokenkeg)

### Week 3 Exercise 4 — Token-2022 extensions
- Path: `tokens/token2022/`
- Mint: `9EH8icESGWuNnNhCkpEN4z237ZnBWJChBQ784v2VgUAJ` (TokenzQd)
- Extensions: transfer fee 100bps + metadata pointer + token metadata

### Week 4 Exercise 5 — voting state machine
- Path: `voting/`
- Program ID: `Gbfuc9mEzKx2oY5HycvF17HGMmMHEeXrvnKvdMiexWYv`
- Tests: Draft / Active / Closed rejections covered on devnet

### Week 4 Exercise 6 — tip jar CPI
- Path: `tip-jar/`
- Program ID: `F3ToLTqLcoBazVckKkNgy24D4BfiREQftff93cyn9BLE`

### Week 4 Exercise 7 — React + Phantom
- Path: `voting/frontend/`
- Vite + wallet-adapter UI for the voting program

### Week 5 Exercise 8 — token escrow
- Path: `escrow/`
- Program ID: `4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr`
- Tests: Make→Take, Make→Cancel, and failure cases (6 passing)

### Week 5 Exercise 9 — Pyth + Jupiter quotes
- Path: `defi-quotes/`
- CLI: Pyth SOL/USD (+ confidence / freshness) vs Jupiter SOL→USDC quote + spread

### Week 5 Exercise 10 — Metaplex NFT collection
- Path: `nfts/`
- Collection: `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd`
- Members: `9MJyuTGDjdTmFGueYCJMtuBrMYu4JRHMCEhLrke4XfrQ`, `YA936cqURpMGpZLNsWp9492B3DUwTUhFQ4hynEfKjUJ`, `3t7ao1ar14m8gU7n7EECfwgRWwoMEKLa3S8XNtCdMAEp`

## In progress

### Week 6 — Capstone Option 2 (NFT Marketplace) — program in progress
- Constitution: `.specify/memory/constitution.md` (v1.0.0)
- Feature spec + plan: `specs/001-nft-marketplace/` (`plan.md`, `research.md`,
  `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`)
- Agreed product plan: `docs/capstone/OPTION2-PLAN.md`
- Anchor program: `marketplace/` — `list_nft` / `buy_nft` / `cancel_listing`
  — program ID `6pKDRYpkfoAjL8nVDDLT6QrZFjX9yFeo4jBiSf1Ht4pt`
- Six mocha tests in `marketplace/tests/marketplace.ts` (localnet default)
- Superdesign purple desk is design-locked; **React not started**
- `capstone/` Quoted Escrow Desk stays as the pre-brief Idea A experiment
- Next: merge program, then Vite + Phantom desk in `marketplace/frontend/`

## Still missing

1. **Week 6 — Option 2 NFT Marketplace**: Vite + Phantom desk (Superdesign
   purple) + Devnet deploy + Explorer proofs (program + six tests exist)
2. Skill-process scaffold (optional): `docs/agents/` via `/setup-matt-pocock-skills` — see `SKILL_AUDIT_AND_GAP_ANALYSIS.md`

## Toolchain

- Solana CLI 4.2.1, Rust 1.98, Anchor 1.1.2, Node 22.x, spl-token-cli 5.x
- Deploy keypairs live only at `~/encode-solana-keys/` (and local `keys/` which is gitignored) — never commit them
