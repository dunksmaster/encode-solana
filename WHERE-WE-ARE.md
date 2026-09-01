# Encode Solana — where we are

Last updated: 1 September 2026 (Europe/Budapest)

Dorian Kane. Encode Solana Developer Course (6 weeks, 10 builds + capstone, all on devnet).
Work lives in WSL Ubuntu at ~/encode-solana.

Current position: Week 3 complete and Week 4 Ex 5-6 done. Next is Week 4 Exercise 7 (React + Phantom).

Main wallet: 5kyuXhe2qeRGvANAATZAG9n9nRZM4iyc768mcxrqcDDG
Second wallet: DGyLWLXMJVKYDfD9rbrhszMG1rLyJiEvHsyM81KUvsW2


## Done

### Week 1 — foundations
Accounts, programs, PDAs, tokens, transaction lifecycle. No build.

### Week 2 Exercise 1 — Hello Solana
- Path: hello-solana/
- Program ID: 7S8zokoG9gvRRoxKw135HgP86FuXMNLQQ9PGikQrsBG7

### Week 2 Exercise 2 — per-user PDA counter
- Path: counter/
- Program ID: 8qfKeo7f2EWEJzPCntc7qLBZu4rRxZZRh5XK5TxmMEgz
- Counter PDA: 5zx27MCb66LhdWYx8UcqdVPxKWhWj6osNhFQytR8ed4K

### Week 3 Exercise 3 — classic SPL token
- Path: tokens/
- Mint: APZWUxbqLkVxBomyKW4K11jFLj7jqrAakGndRiQqPXZc (Tokenkeg)
- Main ATA 900 / Second ATA 100

### Week 3 Exercise 4 — Token-2022 extensions
- Path: tokens/token2022/
- Mint: 9EH8icESGWuNnNhCkpEN4z237ZnBWJChBQ784v2VgUAJ (TokenzQd)
- Extensions: transfer fee 100bps + metadata pointer + token metadata
- Sent 100, second got 99, withheld 1
- Config: tokens/config/token2022.devnet.json
- Decode: tokens/token2022/decode.js
- Explorer: https://explorer.solana.com/address/9EH8icESGWuNnNhCkpEN4z237ZnBWJChBQ784v2VgUAJ?cluster=devnet


### Week 4 Exercise 5 — voting state machine
- Path: voting/
- Program ID: Gbfuc9mEzKx2oY5HycvF17HGMmMHEeXrvnKvdMiexWYv
- Tests: 5 passing on devnet

### Week 4 Exercise 6 — tip jar CPI
- Path: tip-jar/
- Program ID: F3ToLTqLcoBazVckKkNgy24D4BfiREQftff93cyn9BLE
- Vault PDA: G39cx5EcGCM1wnoBnRUgu8YDdXARkdvxNgvfLTFc5eyA
- Tests: 7 passing on devnet

## Still missing

1. Week 4 Exercise 7 — React + Phantom wallet adapter
2. Week 5 — escrow, oracles, NFTs
3. Week 6 — capstone

## Toolchain

- Solana CLI 4.2.1, Rust 1.98, Anchor 1.1.2, Node 22.23.2, spl-token-cli 5.5.0
- Wallet keypair is not in this repo


Program deploy keypairs live only on this machine at ~/encode-solana-keys/ (never commit them).
