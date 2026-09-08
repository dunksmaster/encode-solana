# Contract: Marketplace program

**Program name**: `marketplace`  
**Cluster (demo)**: Solana Devnet  
**Workspace**: `marketplace/`  
**Program ID**: `6pKDRYpkfoAjL8nVDDLT6QrZFjX9yFeo4jBiSf1Ht4pt`
(`declare_id!` + `Anchor.toml`). Must not equal escrow
`4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr`.

This is the public on-chain interface for v1. Clients (tests now; Vite
desk later) MUST use these instruction names, account roles, and seeds.

## PDA

```text
listing_pda = findProgramAddress(["listing", seller, mint], program_id)
vault_ata   = getAssociatedTokenAddress(mint, listing_pda, allowOwnerOffCurve = true)
```

## Instructions

### `list_nft(price_lamports: u64)`

Seller escrows 1 NFT and opens a listing.

| Account | Mut | Signer | Notes |
| :--- | :---: | :---: | :--- |
| `seller` | ✓ | ✓ | Payer; NFT owner |
| `mint` | | | 0-decimal SPL mint |
| `seller_ata` | ✓ | | ATA(`mint`, `seller`); amount ≥ 1 |
| `listing` | ✓ | | `init`, seeds `["listing", seller, mint]`, space `8 + Listing::INIT_SPACE` |
| `vault` | ✓ | | `init` ATA(`mint`, `listing`) |
| `associated_token_program` | | | |
| `token_program` | | | Tokenkeg |
| `system_program` | | | |

**Args**: `price_lamports > 0`.

**Effects**: `Listing { seller, mint, price, bump, is_active: true }`;
transfer 1 token seller ATA → vault.

**Fails**: `InvalidPrice`, `InvalidNft` (decimals ≠ 0), missing NFT,
listing PDA already exists.

### `buy_nft()`

Buyer pays exact listing price; receives the NFT; listing + vault close.

| Account | Mut | Signer | Notes |
| :--- | :---: | :---: | :--- |
| `buyer` | ✓ | ✓ | Pays `price` lamports + fees |
| `seller` | ✓ | | Must equal `listing.seller`; receives SOL + rent |
| `mint` | | | Must equal `listing.mint` |
| `listing` | ✓ | | seeds + bump; `has_one` seller/mint; `is_active`; `close = seller` |
| `vault` | ✓ | | ATA(`mint`, `listing`); amount 1 |
| `buyer_ata` | ✓ | | ATA(`mint`, `buyer`); `init_if_needed`, payer = buyer |
| `associated_token_program` | | | |
| `token_program` | | | |
| `system_program` | | | |

**Effects** (atomic):

1. `system_program::transfer` `listing.price` lamports buyer → seller  
2. `invoke_signed` token transfer vault → `buyer_ata` (1)  
3. `invoke_signed` close vault → seller  
4. Close listing → seller  

**Fails**: inactive / missing listing (`ListingInactive` or
`AccountNotInitialized`); wrong mint (`ConstraintHasOne` /
`ConstraintAssociated`); insufficient buyer SOL; double-buy (account gone).

### `cancel_listing()`

Seller-only recovery.

| Account | Mut | Signer | Notes |
| :--- | :---: | :---: | :--- |
| `seller` | ✓ | ✓ | Must be `listing.seller` (seed + `has_one`) |
| `mint` | | | Must equal `listing.mint` |
| `listing` | ✓ | | `is_active`; `close = seller` |
| `seller_ata` | ✓ | | ATA(`mint`, `seller`); `init_if_needed` if needed |
| `vault` | ✓ | | ATA(`mint`, `listing`) |
| `associated_token_program` | | | |
| `token_program` | | | |
| `system_program` | | | |

**Effects**: `invoke_signed` vault → seller ATA (1); close vault; close listing.

**Fails**: non-seller (`ConstraintSeeds` / `ConstraintHasOne`); inactive
listing; wrong mint.

## Errors

| Code | Name | When |
| :--- | :--- | :--- |
| custom | `InvalidPrice` | `price_lamports == 0` |
| custom | `InvalidNft` | mint decimals ≠ 0 or vault/seller amount ≠ 1 |
| custom | `ListingInactive` | `is_active == false` |
| constraint | `ConstraintSeeds` | PDA / seller mismatch (e.g. non-seller cancel) |
| constraint | `ConstraintHasOne` | wrong mint or seller field |
| constraint | `AccountNotInitialized` | buy/cancel after close |
| constraint | `ConstraintAssociated` | wrong ATA mint/owner |

## Test mapping (constitution Principle III)

| # | Scenario | Instruction sequence | Expected |
| :--- | :--- | :--- | :--- |
| 1 | List → Buy | `list_nft` then `buy_nft` | Buyer token +1; seller lamports +price; vault + listing gone |
| 2 | List → Cancel | `list_nft` then `cancel_listing` | Seller token +1; vault + listing gone |
| 3 | Double-buy | buy then buy again | Second tx fails; no second debit |
| 4 | Buy after cancel | cancel then buy | Buy fails; no SOL/NFT move |
| 5 | Non-seller cancel | stranger `cancel_listing` | Fails; listing stays open |
| 6 | Wrong mint / inactive | buy with other mint, or buy after close | Fails closed |

## Frontend contract (later PR)

Not implemented in the program slice. Desk MUST call the three
instructions above. Routes: `/`, `/list`, `/listing/:id` (`:id` =
listing PDA), `/mine`. Wallet + Devnet badge on every page.
