# Encode Solana — where we are

Last updated: 12 September 2026 (Europe/Budapest) — Devnet deploy + Explorer proofs

Dorian Kane. Encode Solana Developer Course (6 weeks, 10 builds + capstone, all on **devnet**).
Work lives in WSL Ubuntu at `~/encode-solana`. **GitHub now has Weeks 1–5 + Week 6 program/frontend.**

**Progress: ~93% of builds** (10/11), Week 6 capstone deployed to Devnet.
Weeks 1–5 complete. **Week 6 official path is Option 2 — NFT Marketplace**:
spec + plan done, Anchor program (7 tests, 6/7 passing locally — see
`marketplace/README.md`), React/Phantom desk wired to list/buy/cancel, and
now deployed live on Devnet with Explorer proofs. Quoted Escrow Desk in
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

## Done (continued)

### Week 6 — Capstone Option 2 (NFT Marketplace)
- Constitution: `.specify/memory/constitution.md` (v1.0.0)
- Feature spec + plan: `specs/001-nft-marketplace/` (`plan.md`, `research.md`,
  `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`)
- Agreed product plan: `docs/capstone/OPTION2-PLAN.md`
- Anchor program: `marketplace/` — `list_nft` / `buy_nft` / `cancel_listing`
- Desk: `marketplace/frontend/` — Vite + React + TS + wallet-adapter,
  purple Superdesign theme, wired to all three instructions
- **Deployed on Devnet** — program ID `DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2`
  (the originally-`declare_id!`'d `6pKDR...` keypair was correctly never
  committed and no longer exists anywhere, so it was re-synced to a fresh
  keypair actually held on this machine — see `marketplace/README.md`)
- Explorer proofs (program + sample list/buy/cancel txs): `marketplace/README.md`
- 7 mocha tests, 6 passing locally (`marketplace/tests/marketplace.ts`);
  1 pre-existing test asserts a stale expected error code, not yet fixed
- `capstone/` Quoted Escrow Desk stays as the pre-brief Idea A experiment

## Still missing

1. Fix the one pre-existing failing test (`wrong mint from buyer fails`
   expects `ConstraintHasOne`, program correctly returns `ConstraintTokenMint`)
2. Capstone hand-in polish / final review pass (`docs/capstone/CAPSTONE-TICKETS.md` TICKET-7)
3. Skill-process scaffold (optional): `docs/agents/` via `/setup-matt-pocock-skills` — see `SKILL_AUDIT_AND_GAP_ANALYSIS.md`

## Toolchain

- Solana CLI 4.2.2 (Agave, `agave-install init stable`), platform-tools v1.54
  (needed for the SBPFv3 target — v1.52 doesn't have it), Rust 1.98 (host) /
  1.89 (sbf), Anchor 1.1.2, Node 22.x (via nvm), spl-token-cli 5.x
- **Known quirk**: every `anchor` CLI subcommand (`build`, `idl build`,
  `program deploy`, `test`) silently reverts the active Solana release back
  to an old pinned 3.1.10/v1.52 — breaks any SBPFv3 binary built around it.
  `marketplace/scripts/test-localnet.sh` and `marketplace/README.md`'s
  Devnet runbook work around this by calling `cargo-build-sbf` /
  `solana program deploy` / `ts-mocha` directly and restoring the release
  (`agave-install init stable`) around the two unavoidable `anchor` calls.
- Deploy keypairs live only at `~/encode-solana-keys/` (and local `keys/` which is gitignored) — never commit them
