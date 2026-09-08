# Quickstart: NFT Marketplace program

Validate the on-chain slice for `001-nft-marketplace`. This is a run
guide, not an implementation dump. See [data-model.md](./data-model.md)
and [contracts/marketplace-program.md](./contracts/marketplace-program.md)
for account fields and instruction metas.

Frontend (Vite desk) is **not** in this slice. Superdesign remains the
UI source of truth for a later PR.

## Prerequisites

- Solana CLI 4.x, Rust 1.89 (`marketplace/rust-toolchain.toml`), Anchor
  1.1.2, Node 22
- From repo root, workspace `marketplace/` exists (created by the
  implementation slice)
- No private keys in git. Wallet for localnet: `solana-keygen` at
  `~/.config/solana/id.json` (or `ANCHOR_WALLET`)

## Setup

```bash
cd marketplace
npm install
# first time only — generates gitignored program keypair under target/deploy/
anchor keys sync   # or: anchor build
```

Confirm `declare_id!` in `programs/marketplace/src/lib.rs` matches
`[programs.localnet]` / `[programs.devnet]` in `Anchor.toml`.

## Run the six tests (localnet)

```bash
cd marketplace
# Terminal 1: solana-test-validator --reset
# Agave 4.2 localnet accepts SBPF v3 only (SIMD-0500); npm test builds --arch v3.
npm test
```

`Anchor.toml` `[scripts] test` uses `ts-mocha` on `tests/**/*.ts`, same
pattern as `escrow/`.

Expected: six passing cases from Principle III / the program contract.

| Test | Pass signal |
| :--- | :--- |
| List → Buy | Buyer ATA amount +1; seller SOL increased by `price`; vault and listing accounts gone |
| List → Cancel | Seller ATA amount +1; vault and listing gone |
| Double-buy fails | Second `buy_nft` errors; buyer not charged twice |
| Buy after cancel fails | `buy_nft` errors; no SOL/NFT movement |
| Non-seller cancel fails | Stranger tx errors; listing still fetchable and `is_active` |
| Wrong mint / inactive fails | Wrong mint rejected; buy after close rejected |

## Devnet (optional, after a funded deploy)

```bash
cd marketplace
# ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
# ANCHOR_WALLET=~/encode-solana-keys/<deploy>.json   # not in git
anchor test --provider.cluster devnet
```

Demo listings SHOULD use Exercise 10 members (collection
`DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd`). Automated tests mint
their own 0-decimal tokens and do not need those authorities.

After first Devnet deploy, add Explorer links (program + one list / buy /
cancel tx) to `marketplace/README.md` (Principle VII).

## Out of scope here

- `anchor deploy` key material
- React / Superdesign implementation
- Changes under `escrow/`, `voting/`, `nfts/`
