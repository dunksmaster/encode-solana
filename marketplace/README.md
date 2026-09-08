# Marketplace — Encode Week 6 Option 2

Fixed-price NFT list / buy / cancel with a PDA vault. This directory is
the Option 2 home. `escrow/` stays the Exercise 8 token-escrow reference.
`capstone/` stays the prior Quoted Escrow Desk experiment.

The **React desk** (Superdesign purple: Connect, Home, List, Detail/Buy,
My listings) is **not** in this slice. It will live in `frontend/` after
the program merges.

## Architecture

```text
seller  --list_nft(price)-->  Listing PDA ["listing", seller, mint]
                              + vault ATA (authority = listing)
buyer   --buy_nft()-------->  SOL → seller; NFT → buyer; close vault+listing
seller  --cancel_listing()--> NFT → seller; close vault+listing
```

| Item | Value |
| :--- | :--- |
| Program ID | `6pKDRYpkfoAjL8nVDDLT6QrZFjX9yFeo4jBiSf1Ht4pt` |
| Instructions | `list_nft`, `buy_nft`, `cancel_listing` |
| Listing fields | seller, mint, price, bump, `is_active` |
| Payment | Native SOL only |
| Token program | Classic SPL Token (Tokenkeg), 0-decimal amount 1 |
| Demo NFTs | Exercise 10 collection `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd` |

Buy and cancel release the vault with Anchor `CpiContext::new_with_signer`
(`invoke_signed` as the listing PDA). See
`specs/001-nft-marketplace/contracts/marketplace-program.md`.

## Localnet runbook

```bash
cd marketplace
npm install
solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json   # if needed
solana-test-validator --reset    # other terminal
anchor test --skip-local-validator
# or: anchor test
```

Six mocha tests (constitution Principle III):

1. List → Buy
2. List → Cancel
3. Double-buy fails
4. Buy after cancel fails
5. Non-seller cancel fails
6. Wrong mint / inactive listing fails

Tests mint local NFT-like tokens. They do not need Exercise 10 mint
authorities.

## Devnet runbook

```bash
# Wallet and upgrade key stay outside git:
#   ~/encode-solana-keys/  or  keys/ (gitignored)
anchor deploy --provider.cluster devnet
anchor test --provider.cluster devnet
```

Demo listings should use Exercise 10 members:

- `9MJyuTGDjdTmFGueYCJMtuBrMYu4JRHMCEhLrke4XfrQ`
- `YA936cqURpMGpZLNsWp9492B3DUwTUhFQ4hynEfKjUJ`
- `3t7ao1ar14m8gU7n7EECfwgRWwoMEKLa3S8XNtCdMAEp`

## Trade-offs

- **No on-chain collection gate** — tests and YAGNI. The later desk
  defaults the catalog to Exercise 10.
- **Listing account is closed** on buy/cancel so the same seller can
  re-list the same mint. `is_active` is still stored and checked.
- **SOL transfer is direct** buyer → seller (no wSOL vault).
- **Frontend deferred** — Superdesign is design-locked; React is the
  next PR.

## Explorer proofs (fill after first Devnet deploy)

- Program: _pending deploy_
- Sample `list_nft`: _pending_
- Sample `buy_nft`: _pending_
- Sample `cancel_listing`: _pending_

Never commit private keys or `*-keypair.json`.
