# Encode Solana — domain language

Course portfolio: Anchor programs and TypeScript clients on **Solana devnet** (Encode Solana Developer Course). Wallet keypairs and program deploy keypairs are **never** committed.

## Language

**Program**:
On-chain executable (BPF). Identified by a Program ID. Deployed with Anchor / Solana CLI.
_Avoid_: smart contract (use only when comparing to EVM)

**Account**:
A Solana account: data + lamports + owner program. Not a user login.
_Avoid_: wallet (wallet is a signing keypair that *owns* accounts)

**PDA** (Program Derived Address):
Deterministic address from seeds + program ID, no private key. Program signs for it via `invoke_signed`.
_Avoid_: account address (too vague when you mean a PDA)

**Vault**:
PDA-owned token or SOL account that holds escrowed/tipped funds. Authority is the PDA, not a user key.
_Avoid_: wallet, treasury (unless you mean a different design)

**Escrow**:
Trustless token swap: maker locks Token A; taker provides Token B and receives A; maker can cancel before take.
_Avoid_: vault (vault is the holding account; escrow is the deal)

**Maker / Taker**:
Maker creates the escrow offer; taker fills it.

**Mint / ATA**:
Mint = token type. ATA = Associated Token Account for a (wallet, mint) pair.

**Proposal state** (voting):
Draft → Active → Closed. Votes only in Active; bad transitions reject.

**CPI**:
Cross-Program Invocation. `invoke` when a user signs; `invoke_signed` when a PDA signs.

**Devnet**:
Public test cluster. Not real money. Capstone proofs use Explorer links on devnet.

## Relationships

- A **Program** owns many **Accounts** (including **PDAs**)
- An **Escrow** uses a **Vault** PDA to hold the maker's tokens
- A **Tip jar** vault PDA holds tipped SOL/tokens for an owner
- A **Proposal** has many vote-record PDAs (one per voter)

## Flagged ambiguities

- "Account" vs "wallet" — wallet signs; account holds data/lamports
- "Vault" vs "escrow" — vault is storage; escrow is the swap protocol
- Classic SPL (`Tokenkeg`) vs Token-2022 (`TokenzQd`) — different programs; do not mix in one vault without an ADR
