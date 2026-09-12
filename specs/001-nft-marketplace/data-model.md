# Data Model: NFT Marketplace Listing Desk

**Feature**: `001-nft-marketplace`  
**Date**: 2026-09-08

On-chain state only. No off-chain database. Metadata name/image are read
from existing Metaplex / Irys URIs (see `nfts/config/collection.devnet.json`).

## Entities

### Listing (PDA account)

Program-derived offer to sell one NFT at a fixed SOL price.

| Field | Type | Description |
| :--- | :--- | :--- |
| `seller` | `Pubkey` | Wallet that created the listing; only cancel authority; SOL recipient on buy |
| `mint` | `Pubkey` | SPL mint being sold (v1: 0 decimals, amount 1) |
| `price` | `u64` | Price in lamports (`price_sol * 1_000_000_000`) |
| `bump` | `u8` | PDA bump stored for `invoke_signed` |
| `is_active` | `bool` | `true` while open; required on buy/cancel |

- **Seeds**: `["listing", seller, mint]`
- **Space**: `8 + 32 + 32 + 8 + 1 + 1` (discriminator + fields). Align with
  `#[derive(InitSpace)]` in Anchor 1.1 (`8 + Listing::INIT_SPACE`).
- **Identity**: one listing per `(seller, mint)` while the account exists.
- **Rent payer**: seller (list). **Close destination**: seller (buy or cancel).

#### Validation

- `price > 0` on list (`InvalidPrice`).
- Mint decimals must be `0` (`InvalidNft`).
- Seller ATA must hold at least 1 token of `mint` or list fails (token
  program / amount check).
- `init` of the PDA fails if a listing for that pair still exists
  (second list while open).
- Buy / cancel: `is_active == true` (`ListingInactive`) and seeds /
  `has_one` match.

#### State transitions

```text
                    list_nft(price > 0)
  (no account) ──────────────────────────► Active (is_active = true)
                                              │
                         buy_nft()            │           cancel_listing()
                    (buyer pays price,        │      (seller signer only,
                     NFT → buyer)             │       NFT → seller)
                                              ▼
                                        Closed (account closed;
                                        vault ATA closed)
                                              │
                                              └── list_nft() may reuse PDA
```

Closed is represented by **account absence**, not a lingering
`is_active = false` row (see `research.md` §4).

### Vault (ATA)

Associated token account for `listing.mint`.

| Attribute | Value |
| :--- | :--- |
| Mint | Listing mint |
| Authority | Listing PDA (not a user keypair) |
| Amount while Active | `1` |
| Amount after buy/cancel | Account closed (rent to seller) |

Created in `list_nft` (`init`, payer = seller). Released only by
`invoke_signed` as the listing PDA.

### NFT (mint)

Off-chain catalog for the demo (not stored on the listing beyond `mint`):

| Name | Mint |
| :--- | :--- |
| Collection | `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd` |
| Encode Member #1 | `9MJyuTGDjdTmFGueYCJMtuBrMYu4JRHMCEhLrke4XfrQ` |
| Encode Member #2 | `YA936cqURpMGpZLNsWp9492B3DUwTUhFQ4hynEfKjUJ` |
| Encode Member #3 | `3t7ao1ar14m8gU7n7EECfwgRWwoMEKLa3S8XNtCdMAEp` |

Custody: seller ATA → vault (list) → buyer ATA (buy) or seller ATA (cancel).

### Seller

Signer of `list_nft` and `cancel_listing`. Receives `price` lamports on
buy and vault/listing rent on close.

### Buyer

Signer of `buy_nft`. Pays `price` lamports; receives 1 token of `mint`.
Must have enough SOL for price + fees or the transaction fails and the
listing stays Active.

## Relationships

```text
Seller 1 ─── * Listing * ─── 1 Mint
Listing 1 ─── 1 Vault (ATA)
Buyer   * ─── 1 Listing   (at most one successful buy; then listing gone)
```

## Desk identifier (UI, later)

Listing `:id` in `/listing/:id` is the listing **PDA address** (base58).
Clients derive it with `findProgramAddressSync(["listing", seller, mint], programId)`.
