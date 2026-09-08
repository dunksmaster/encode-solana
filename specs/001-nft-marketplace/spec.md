# Feature Specification: NFT Marketplace Listing Desk

**Feature Branch**: `001-nft-marketplace`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "Build an NFT marketplace listing desk for Encode Week 6 Option 2: seller lists an NFT at a fixed SOL price; buyer pays and receives the NFT in one atomic transaction so neither side can cheat."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - List an NFT at a fixed SOL price (Priority: P1)

A seller connects a browser wallet on the public Solana test network, picks an NFT they already own from the course collection, sets a price in SOL, and signs once. After the signature succeeds, the NFT is no longer in the seller's wallet and an open listing appears on the desk at that price.

**Why this priority**: Without a listing there is nothing to buy or cancel. This is the minimum slice that proves custody moved into marketplace escrow.

**Independent Test**: Connect as a seller who holds a course-collection NFT, list it at a known SOL price, then confirm the NFT left the seller wallet and a new open listing shows that mint, price, and seller.

**Acceptance Scenarios**:

1. **Given** a connected seller who owns a course-collection NFT and is on Devnet, **When** they choose that mint, enter a positive SOL price, and sign List, **Then** a listing is created, the NFT sits in the marketplace vault (not the seller wallet), and the desk shows the listing as open.
2. **Given** a connected seller, **When** they attempt to list an NFT they do not own, **Then** the listing is rejected and no vault or listing is created.
3. **Given** a connected seller, **When** they submit a zero or negative price, **Then** the listing is rejected before custody changes.

---

### User Story 2 - Buy a listed NFT in one atomic payment (Priority: P1)

A buyer browses open listings (image, name, price, seller), chooses Buy, and signs once. In that single action the seller receives the listed SOL amount, the buyer receives the NFT, and the listing is closed so it cannot be bought again.

**Why this priority**: Atomic buy is the product one-liner — neither side can cheat. Encode Deck 06 is not met until this path works.

**Independent Test**: With an open listing created in Story 1, connect as a different funded buyer, buy it, then confirm the buyer holds the NFT, the seller's SOL increased by the listed price, and the listing is no longer open.

**Acceptance Scenarios**:

1. **Given** an open listing (List then Buy), **When** a buyer other than the seller signs Buy and pays the listed SOL price, **Then** the buyer receives the NFT, the seller receives that SOL, the vault is emptied, and the listing is closed / inactive.
2. **Given** a listing that was just bought, **When** anyone tries to buy it again (double-buy), **Then** the second buy fails and balances are unchanged.
3. **Given** an open listing, **When** a buyer signs Buy with a different mint than the listing, **Then** the buy fails and the original listing stays open with the NFT still in the vault.

---

### User Story 3 - Seller cancels and recovers the NFT (Priority: P1)

The seller who created a still-open listing can cancel it. After one signature the NFT returns to the seller and the listing is closed. Anyone else who tries to cancel is rejected.

**Why this priority**: Cancel is the third required flow and the seller's only recovery if no one buys. Seller-only enforcement is a safety requirement, not a polish item.

**Independent Test**: List an NFT, cancel as the seller, confirm the NFT returned and the listing is closed; then repeat with a third-party wallet and confirm cancel is rejected.

**Acceptance Scenarios**:

1. **Given** an open listing created by seller S (List then Cancel), **When** S signs Cancel, **Then** the NFT returns to S, the vault is emptied, and the listing is closed / inactive.
2. **Given** a listing that was cancelled, **When** anyone tries to buy it (buy after cancel), **Then** the buy fails and no SOL or NFT moves.
3. **Given** an open listing owned by S, **When** a different wallet signs Cancel (non-seller cancel), **Then** the cancel fails, the listing stays open, and the NFT remains in the vault.

---

### User Story 4 - Browse the open desk (Priority: P2)

Any visitor (connected or not) can see open listings on a home desk: image, name, price in SOL, and seller. Choosing a listing opens a detail view with Buy (if the visitor is a connected buyer) and Cancel (only if they are the seller). A "mine" view shows the connected wallet's own listings.

**Why this priority**: The desk is how a reviewer finds something to buy. It can be demonstrated as soon as Story 1 produces a listing, even before buy/cancel UI is wired, but it is not the safety-critical path.

**Independent Test**: With at least one open listing, open the home desk and a listing detail page and confirm image, name, price, and seller match the on-chain listing; open the mine view while connected as that seller and see the same listing.

**Acceptance Scenarios**:

1. **Given** one or more open listings, **When** a visitor opens the home desk, **Then** each open listing shows image, name, price, and seller.
2. **Given** an open listing, **When** a visitor opens its detail view, **Then** they see the same facts and a Buy action if a wallet is connected.
3. **Given** a connected seller with open listings, **When** they open the mine view, **Then** they see only listings they created, including Cancel.
4. **Given** a listing that is bought or cancelled, **When** anyone returns to the desk, **Then** that listing is no longer shown as open.

---

### User Story 5 - Stay oriented to wallet and network (Priority: P2)

A wallet control and a visible Devnet badge stay on screen on every page. If the wallet is on the wrong network, the desk warns and does not pretend a listing or buy succeeded. Unconnected visitors can browse but cannot list, buy, or cancel.

**Why this priority**: Encode demos fail silently when Phantom is on mainnet. The badge is a demo reliability requirement, not a new product surface.

**Independent Test**: Load every desk route connected and disconnected; confirm the wallet control and Devnet badge are visible; confirm list/buy/cancel are blocked when disconnected or on the wrong network.

**Acceptance Scenarios**:

1. **Given** any desk route (`/`, `/list`, `/listing/:id`, `/mine`), **When** the page loads, **Then** the wallet control and a Devnet badge are visible without scrolling away the chrome.
2. **Given** no connected wallet, **When** the visitor tries List, Buy, or Cancel, **Then** the action is blocked with a connect prompt and no transaction is sent.
3. **Given** a wallet on a network other than Devnet, **When** the visitor tries a write action, **Then** the desk refuses and explains that only Devnet is supported.

---

### Edge Cases

These six cases are the on-chain quality gate (constitution Principle III). They MUST appear as automated tests before the feature is claimed done.

- **List then Buy**: Happy path. Buyer pays exact listed SOL; seller receives SOL; buyer receives the listed mint; listing becomes inactive; a second buy fails.
- **List then Cancel**: Happy path. Seller recovers the same mint; listing becomes inactive; vault is empty.
- **Double-buy fails**: After a successful buy, a second buy of the same listing MUST fail closed (no second SOL debit, no NFT movement).
- **Buy after cancel fails**: After a successful cancel, buy MUST fail closed.
- **Non-seller cancel fails**: A wallet that is not the listing seller MUST be rejected; listing stays active; NFT stays in the vault.
- **Wrong mint or inactive listing fails**: Buy (or list reuse) against a mint that does not match the listing, or against a listing that is not active, MUST fail closed.
- What happens when the seller lists the same mint twice while the first listing is still active? The listing identity is seller + mint, so a second list MUST fail until the first listing is closed.
- What happens if the buyer cannot pay the listed lamports? Buy MUST fail; listing stays open; NFT stays in the vault.
- How does the desk handle a listing whose metadata image cannot be fetched? The listing still shows name, price, and seller, with a visible placeholder for the image.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sellers MUST be able to list an NFT they currently own at a fixed price denominated in SOL (stored on-chain as lamports).
- **FR-002**: Listing MUST move the NFT into marketplace custody in the same transaction that creates the listing, so the seller cannot keep the NFT and also show it as listed.
- **FR-003**: Buyers MUST be able to purchase an open listing in one transaction that pays the seller the listed SOL amount, delivers the NFT to the buyer, and closes the listing.
- **FR-004**: Only the seller who created a listing MUST be able to cancel it. Cancel MUST return the NFT to that seller and close the listing in the same transaction.
- **FR-005**: The system MUST reject and leave balances unchanged for: double-buy, buy after cancel, cancel by a non-seller, buy or operate with the wrong mint, and any operation on an inactive listing.
- **FR-006**: Open listings MUST be browsable with image, name, price, and seller. Closed listings MUST NOT appear as buyable.
- **FR-007**: Users MUST be able to reach four desk surfaces: home (open listings), list (create a listing), listing detail, and mine (the connected wallet's listings).
- **FR-008**: Users MUST be able to pick an owned mint from the existing Exercise 10 collection (collection `DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd`; members `9MJyuTGDjdTmFGueYCJMtuBrMYu4JRHMCEhLrke4XfrQ`, `YA936cqURpMGpZLNsWp9492B3DUwTUhFQ4hynEfKjUJ`, `3t7ao1ar14m8gU7n7EECfwgRWwoMEKLa3S8XNtCdMAEp`) as the default catalog for the demo. Other owned NFTs MAY be accepted later; they are not required for v1.
- **FR-009**: Payment MUST be SOL only. The desk MUST NOT accept another token as payment in v1.
- **FR-010**: A wallet control and a Devnet network badge MUST remain visible on every desk surface.
- **FR-011**: Vault authority for a listed NFT MUST be the listing itself (a program-derived listing identity), not a user keypair. Release of the NFT on buy or cancel MUST be authorized only by that listing identity.
- **FR-012**: The listing record MUST include seller, mint, price, a bump, and an active flag, and MUST be uniquely derived from seller plus mint so the same seller cannot have two active listings of the same mint.
- **FR-013**: The existing token-escrow program MUST remain unchanged and MUST NOT be reused as the marketplace program. Marketplace list / buy / cancel is a new program surface.
- **FR-014**: The product MUST NOT include offers, auctions, a royalties configuration UI, search, SPL-token payment, or mainnet deployment in v1.

### Key Entities

- **Listing**: An open or closed offer to sell one NFT at a fixed SOL price. Identity is the seller plus the mint. Attributes: seller, mint, price (lamports), bump, active flag. Closed by a successful buy or cancel.
- **NFT (mint)**: The unique token being sold. For the demo, a member of the Exercise 10 collection. Custody moves seller → vault on list, then vault → buyer on buy or vault → seller on cancel.
- **Vault**: Marketplace custody for exactly one listed NFT. Controlled by the listing identity, not by the seller or buyer key.
- **Seller**: The wallet that created the listing and is the only party allowed to cancel. Receives SOL on a successful buy.
- **Buyer**: The wallet that pays SOL and receives the NFT. Must not be able to take the NFT without paying, or pay without receiving the NFT.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A seller who already owns a course-collection NFT can complete a listing (connect, pick mint, set price, sign) in under three minutes on a funded Devnet wallet.
- **SC-002**: A buyer can complete a purchase from an open listing in one approval and, immediately afterward, can show the NFT in their wallet and the seller can show the received SOL.
- **SC-003**: In 100% of the six safety scenarios (list→buy, list→cancel, double-buy, buy-after-cancel, non-seller cancel, wrong mint / inactive), the outcome matches the edge-case table: happy paths transfer the right assets; failure paths transfer nothing extra.
- **SC-004**: A reviewer who is not the author can follow the published runbook and reproduce list, buy, and cancel on Devnet, including public Explorer links for the program and one sample transaction of each type.
- **SC-005**: At least 90% of first-time demo walkthroughs (seller list + second wallet buy, or seller list + cancel) complete without a stuck listing that requires manual repair.
- **SC-006**: Unconnected or wrong-network visitors never send a list, buy, or cancel transaction; they always see a wallet control and a Devnet badge on the four desk surfaces.

## Assumptions

- Encode Deck 06 Option 2 is the product brief: fixed-price NFT list / buy / cancel with escrow, combining NFT / Metaplex, PDA vault, and Phantom UI.
- Demo cluster is Solana Devnet only. No mainnet program or mainnet UI target in v1.
- Payment is native SOL. Price is entered in SOL in the UI and stored as lamports on the listing.
- A new dedicated `marketplace/` tree holds the program and the desk UI. `capstone/` (Quoted Escrow Desk) remains a prior experiment and is not the Option 2 home. `escrow/` (program `4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr`) stays intact and is a pattern reference only.
- On-chain delivery uses Anchor. Instructions are `list_nft(price_lamports)`, `buy_nft()`, and `cancel_listing()`. Listing PDA seeds are `["listing", seller, mint]`. Vault is the listing mint's associated token account owned by that PDA. Buy and cancel use `invoke_signed` as the listing PDA.
- Desk UI uses Vite + React + TypeScript (strict) and Solana wallet-adapter with Phantom. Routes: `/`, `/list`, `/listing/:id`, `/mine`. Visual direction is a dark listing desk. A Superdesign canvas MUST be approved before React implementation (constitution Principle IV).
- Wallet and Phantom connection patterns are reused from `voting/frontend` (and `capstone/` only as reference). NFT metadata and mints are reused from `nfts/`. Vault/PDA patterns are reused from `escrow/`.
- Buyers and sellers already have Devnet SOL for fees (and the buyer has enough SOL to cover the price). The desk does not ship a faucet.
- Listing `:id` in the URL may be the listing address or an equivalent stable identifier resolved from seller + mint; exact encoding is a plan-time detail.
- Metadata (name, image) is read from the existing Metaplex / Irys URIs on the Exercise 10 mints; the marketplace does not host new art.
- This specify pass does not implement the program or UI. Next approved steps are `/speckit-plan`, then Superdesign, then `/speckit-tasks` — not `/speckit-implement` yet.
