# Encode Solana — where we are

Last updated: 27 August 2026 (Europe/Budapest)

Dorian Kane. Encode Solana Developer Course (6 weeks, 10 builds + capstone, all on devnet).
Work lives in WSL Ubuntu at ~/encode-solana. Windows is just the host.

Current position: Week 4 Exercise 6 is done. Next is Week 4 Exercise 7 (React + Phantom frontend).

Main wallet: 5kyuXhe2qeRGvANAATZAG9n9nRZM4iyc768mcxrqcDDG
Second wallet (token recipient): DGyLWLXMJVKYDfD9rbrhszMG1rLyJiEvHsyM81KUvsW2

## Done

### Week 1 — foundations
Accounts, programs, PDAs, tokens, transaction lifecycle. No build.

### Week 2 Exercise 1 — Hello Solana
First Anchor program on devnet.
- Path: hello-solana/
- Program ID: 7S8zokoG9gvRRoxKw135HgP86FuXMNLQQ9PGikQrsBG7
- Explorer: https://explorer.solana.com/address/7S8zokoG9gvRRoxKw135HgP86FuXMNLQQ9PGikQrsBG7?cluster=devnet

### Week 2 Exercise 2 — per-user PDA counter
- Path: counter/
- Program ID: 8qfKeo7f2EWEJzPCntc7qLBZu4rRxZZRh5XK5TxmMEgz
- Counter PDA: 5zx27MCb66LhdWYx8UcqdVPxKWhWj6osNhFQytR8ed4K (seeds counter + wallet, count 1)
- Client: counter/scripts/run-devnet.ts
- Explorer: https://explorer.solana.com/address/8qfKeo7f2EWEJzPCntc7qLBZu4rRxZZRh5XK5TxmMEgz?cluster=devnet

### Week 3 Exercise 3 — classic SPL token
- Path: tokens/
- Mint: APZWUxbqLkVxBomyKW4K11jFLj7jqrAakGndRiQqPXZc (9 decimals, supply 1000)
- Main ATA 8zTRHZ8KytDwppTQvSHAWgCFUraqLE38oij38gDiub1v holds 900
- Second ATA EjVw8WKkkaPRPNkXjgT4mGzGD27GKFphMrF9ytMGKGX8 holds 100
- Metadata: tokens/config/tokens.devnet.json
- Balance script: tokens/balance.js

### Week 3 Exercise 4 — Token-2022 extensions
Skipped. Jumped to Week 4.

### Week 4 Exercise 5 — voting state machine
Draft to Active to Closed. Creator activates/closes. Vote only while Active.
- Path: voting/
- Program ID: Gbfuc9mEzKx2oY5HycvF17HGMmMHEeXrvnKvdMiexWYv
- Happy-path proposal id 1 Ship the frontend is Closed with 1 yes
- Tests: 5 passing on devnet
- Explorer: https://explorer.solana.com/address/Gbfuc9mEzKx2oY5HycvF17HGMmMHEeXrvnKvdMiexWYv?cluster=devnet


### Week 4 Exercise 6 — tip jar CPI
Deposit uses invoke (user signs). Withdraw uses invoke_signed (vault PDA signs with seeds vault + owner).
- Path: tip-jar/
- Program ID: F3ToLTqLcoBazVckKkNgy24D4BfiREQftff93cyn9BLE
- Vault PDA: G39cx5EcGCM1wnoBnRUgu8YDdXARkdvxNgvfLTFc5eyA
- Tests: 7 passing on devnet
- Explorer: https://explorer.solana.com/address/F3ToLTqLcoBazVckKkNgy24D4BfiREQftff93cyn9BLE?cluster=devnet

﻿
## Next

1. Week 4 Exercise 7 — React + wallet adapter (Phantom)
2. Week 5 — escrow, oracles, NFTs
3. Week 6 — capstone

## Toolchain

- Solana CLI 4.2.1, Rust 1.98, Anchor 1.1.2, Node 22.23.2
- Wallet keypair is not in this repo

## What is not in git

- node_modules/ and target/
- Wallet keypair (id.json)
- Program deploy keypairs are copied into keys/

