# Marketplace — Encode Week 6 Option 2

Fixed-price NFT list / buy / cancel with a PDA vault. This directory is
the Option 2 home. `escrow/` stays the Exercise 8 token-escrow reference.
`capstone/` stays the prior Quoted Escrow Desk experiment.

The **React desk** (Superdesign purple: Connect, Home, List, Detail/Buy,
My listings) lives in `frontend/` — scaffolded and wired to `list_nft`,
`buy_nft`, `cancel_listing` (TICKET-3/4/5). Deployed program is now live on
Devnet (TICKET-6, see Explorer proofs below).

## Architecture

```text
seller  --list_nft(price)-->  Listing PDA ["listing", seller, mint]
                              + vault ATA (authority = listing)
buyer   --buy_nft()-------->  SOL → seller; NFT → buyer; close vault+listing
seller  --cancel_listing()--> NFT → seller; close vault+listing
```

| Item | Value |
| :--- | :--- |
| Program ID (Devnet, live) | `DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2` |
| Instructions | `list_nft`, `buy_nft`, `cancel_listing` |
| Listing fields | seller, mint, price, bump, `is_active` |
| Payment | Native SOL only |
| Token program | Classic SPL Token (Tokenkeg), 0-decimal amount 1 |
| Demo NFTs | Exercise 10 collection `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd` |

Buy and cancel release the vault with Anchor `CpiContext::new_with_signer`
(`invoke_signed` as the listing PDA). See
`specs/001-nft-marketplace/contracts/marketplace-program.md` — note its
program ID (`6pKDRYpkfoAjL8nVDDLT6QrZFjX9yFeo4jBiSf1Ht4pt`) is now stale:
that keypair was correctly never committed and no longer exists on any
machine, so it was never deployable. `anchor keys sync` regenerated
`declare_id!`/`Anchor.toml` against fresh, actually-held keypairs — one for
localnet testing, a separate one (above) for this Devnet deploy.

## Localnet runbook

```bash
cd marketplace
npm install
solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json   # if needed
agave-install init stable   # need platform-tools >= v1.54 for SBPFv3 (see below)

# Terminal 1 — Agave 4.x localnet (SIMD-0500: SBPF v3 only)
solana-test-validator --reset

# Terminal 2
npm test
```

**Toolchain note (found while fixing TICKET-2):** `npm test` does **not**
call `anchor build` / `anchor program deploy` / `anchor test` — on this
machine, `anchor-cli 1.1.2` has a side effect where every `anchor ...`
subcommand silently reverts `~/.config/solana/install/config.yml`'s
`explicit_release` back to an old pinned Solana CLI (3.1.10, platform-tools
v1.52 — no `sbpfv3-solana-solana` rustlib target), breaking any SBPFv3
binary built just before or after. `scripts/test-localnet.sh` instead calls
`cargo-build-sbf`, `anchor idl build` (host target, needed for the IDL
only), `solana program deploy`, and `npx ts-mocha` directly, restoring the
release (`agave-install init stable`) around the two `anchor` calls. If you
hit `can't find crate for std` / `sbpfv3-solana-solana target may not be
installed`, that's this issue — run `agave-install init stable` again
before rebuilding.

**Program ID note:** `declare_id!` is a single value compiled into the
binary, so it can only match *one* deployed address at a time. The
`[programs.localnet]` entry above (from TICKET-2) and the live Devnet ID
(from TICKET-6, see Explorer proofs) are two different keypairs — rebuilding
for localnet again means re-running `anchor keys sync` against the localnet
keypair and rebuilding, which will move `declare_id!` away from the Devnet
ID until you rebuild for Devnet again.

Six mocha tests (constitution Principle III), plus a seventh added for the
buyer-ATA fix:

1. List → Buy
2. List → Cancel
3. Double-buy fails
4. Buy after cancel fails
5. Non-seller cancel fails
6. Wrong mint / inactive listing fails
7. Buy with no pre-existing buyer ATA (TICKET-1)

Tests mint local NFT-like tokens. They do not need Exercise 10 mint
authorities.

## Devnet runbook

```bash
# Wallet and upgrade key stay outside git:
#   ~/encode-solana-keys/  or  keys/ (gitignored)

# Fresh deploy keypair (never commit):
solana-keygen new --no-bip39-passphrase -o ~/encode-solana-keys/marketplace-devnet-keypair.json
cp ~/encode-solana-keys/marketplace-devnet-keypair.json marketplace/target/deploy/marketplace-keypair.json

# Update declare_id! in programs/marketplace/src/lib.rs and
# Anchor.toml's [programs.devnet] to that keypair's pubkey, then:
agave-install init stable   # see toolchain note above — needed before every rebuild
cargo-build-sbf --arch v3 --manifest-path programs/marketplace/Cargo.toml
solana program deploy target/deploy/marketplace.so \
  --program-id target/deploy/marketplace-keypair.json \
  --url https://api.devnet.solana.com

# IDL (used by tests and the frontend) — anchor idl build also reverts the
# toolchain, so restore again after:
anchor idl build -o target/idl/marketplace.json -t target/types/marketplace.ts
agave-install init stable
```

`anchor deploy` / `anchor test` were **not** used here — same toolchain-
reverting issue as the localnet runbook (they silently downgrade the active
Solana release mid-command, corrupting the just-built SBPFv3 binary).

**How to demo List:** default catalog mint is the seeded Devnet test NFT
`2SkyZmpZZ8D7RttFpM2zBNJV8N38es1p1ZPJSAeW7PVY` (list this). Or paste any
Devnet mint the connected wallet owns. Do **not** list an Exercise 10
member you don't hold — the program checks ATA ownership (`amount >= 1`),
and Phantom will revert on `InvalidNft`. List refuses submit client-side
in that case so the wallet is never opened.

Catalog dropdown (default first):

- `2SkyZmpZZ8D7RttFpM2zBNJV8N38es1p1ZPJSAeW7PVY` — seeded Devnet test NFT (list this)
- `9MJyuTGDjdTmFGueYCJMtuBrMYu4JRHMCEhLrke4XfrQ` — Encode Member #1
- `YA936cqURpMGpZLNsWp9492B3DUwTUhFQ4hynEfKjUJ` — Encode Member #2
- `3t7ao1ar14m8gU7n7EECfwgRWwoMEKLa3S8XNtCdMAEp` — Encode Member #3

## Frontend local run

```bash
cd marketplace/frontend
npm install
npm run dev
```

The desk defaults to official Devnet (`clusterApiUrl("devnet")` →
`https://api.devnet.solana.com`) with `confirmed` commitment and `finalized`
preflight so Phantom can see the blockhash. Public Ankr / Omniatech fail
`getLatestBlockhash`; OnFinality's public URL rate-limits (HTTP 429 — apply
an API key).

If List / Buy / Cancel fail with **Blockhash not found** or **429 Too Many
Requests**, set `VITE_SOLANA_RPC` to a private Helius or QuickNode Devnet key
and restart Vite:

```bash
# marketplace/frontend/.env.local
VITE_SOLANA_RPC=https://your-helius-or-quicknode-devnet-rpc
```

## Trade-offs

- **No on-chain collection gate** — tests and YAGNI. The later desk
  defaults the catalog to the seeded Devnet test NFT, then Exercise 10;
  List also accepts a pasted mint.
- **Listing account is closed** on buy/cancel so the same seller can
  re-list the same mint. `is_active` is still stored and checked.
- **SOL transfer is direct** buyer → seller (no wSOL vault).
- **Devnet proof mints are throwaway test mints**, not the Exercise 10
  collection — see the honesty note under Explorer proofs.

## Explorer proofs

Deployed and exercised on Devnet 2026-09-12. All four links are real,
finalized Devnet transactions/accounts — verify by opening them.

- Program: https://explorer.solana.com/address/DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2?cluster=devnet
- Sample `list_nft`: https://explorer.solana.com/tx/2VP4XyLtnXAPMiQmJby4UpnPdPvrXEgTynY6hQ2juMa7hP6xW9TbcmPgEoUNfouQhK4eNqjdiZ4cQQXfGTQ39dhc?cluster=devnet
- Sample `buy_nft`: https://explorer.solana.com/tx/jomrGKqc5hPDEp6vkjZ2PgUqGoVmYGehevQpsZxaJNuq3wFErbDpcMWFipYtoSY6jm9XZbkdmfJv6qG9GTC7TN1?cluster=devnet
- Sample `cancel_listing` (separate listing from the buy, so cancel had
  something open to close): https://explorer.solana.com/tx/26owMVcUwFd5ANtAGwqWGDbkNo5wBZY63Qu2HGyedNBUyGHf7FQVopLruTwAT9N6iELz8RDeKUVR1jbXcHzuqUwX?cluster=devnet
- Its `list_nft` (opens the listing the cancel above closes): https://explorer.solana.com/tx/M7LjoTLL8JxomkjV5GW1oARzkZ3vCcsNWCZNRFKpbz5xAQtZAKYXE2WwoVxk69KtuBH8L4xtjKNBmDgn7LxivXF?cluster=devnet

**Honesty note on the `buy_nft` sample:** the buyer wallet
(`3mZCBeHC3kEVzQA3mTZxHtnRDd84CUkhHFxVJg3fw7Mf`) was funded with 0.05 SOL
transferred from the seller wallet (Devnet airdrop was rate-limited at the
time) — it's a genuinely different signer from the seller, so the
transaction exercises the real two-party buy path, it just wasn't
independently pre-funded via faucet. Mints used for these proofs are
throwaway 0-decimal test mints created for this deploy, not the Exercise 10
collection — a real demo walkthrough can paste any owned Devnet mint or
use an Exercise 10 catalog member if the wallet holds it.

Never commit private keys or `*-keypair.json`.
