# Capstone Submit Checklist — Encode Week 6 Option 2 (NFT Marketplace)

Written the same way `CAPSTONE-AUDIT.md` was: cites only what exists in the
repo right now, no invented links or results. Where something couldn't be
re-verified in this session, it's marked **UNVERIFIED** rather than assumed.

---

## Done

- **Constitution** (`.specify/memory/constitution.md`, v1.0.0) — seven
  principles (delivery, on-chain safety, test-first, spec-first, YAGNI,
  reuse, proofs), all satisfied below except the one open item under Missing.
- **Spec Kit artifacts** (`specs/001-nft-marketplace/`) — `spec.md`,
  `plan.md`, `research.md`, `data-model.md`, `contracts/marketplace-program.md`,
  `quickstart.md`, `tasks.md`. Merged to `main` (PR #2, PR #3).
- **Anchor program** (`marketplace/programs/marketplace/src/lib.rs`) —
  `list_nft`, `buy_nft`, `cancel_listing`. Listing PDA seeds
  `["listing", seller, mint]`; vault is an ATA owned by the listing PDA;
  buy/cancel release it via `invoke_signed`. Merged to `main`.
- **Buyer-ATA fix** (`init_if_needed` on `buy_nft`'s `buyer_ata`) — a real
  bug found in the original audit (a first-time buyer with no existing ATA
  for the mint would fail `buy_nft`) is fixed and committed.
- **React desk** (`marketplace/frontend/`) — Vite + React + TS strict +
  `@solana/wallet-adapter`, purple theme (page `#0c0614`, card `#160b24`,
  CTA `#8b5cf6` — no navy), routes `/`, `/list`, `/listing/:id`, `/mine`,
  wallet control + Devnet badge on every route. `npm run build` passes
  clean (re-verified this session).
- **Real Anchor wiring, not stubs** — `list_nft`, `cancel_listing`, and
  `buy_nft` are all wired to the real program via a hand-verified-then-
  replaced-with-real IDL (`marketplace/frontend/src/idl/marketplace.json`
  is the actual `anchor idl build` output, not hand-written).
- **Deployed on Solana Devnet** — program ID
  `DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2`. `declare_id!` /
  `Anchor.toml [programs.devnet]` / frontend `PROGRAM_ID` / IDL `address`
  all agree (checked this session).
- **Explorer proofs are real** — verified with `solana confirm` at deploy
  time (see `marketplace/README.md` §Explorer proofs):
  - Program: https://explorer.solana.com/address/DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2?cluster=devnet
  - `list_nft`: https://explorer.solana.com/tx/2VP4XyLtnXAPMiQmJby4UpnPdPvrXEgTynY6hQ2juMa7hP6xW9TbcmPgEoUNfouQhK4eNqjdiZ4cQQXfGTQ39dhc?cluster=devnet
  - `buy_nft`: https://explorer.solana.com/tx/jomrGKqc5hPDEp6vkjZ2PgUqGoVmYGehevQpsZxaJNuq3wFErbDpcMWFipYtoSY6jm9XZbkdmfJv6qG9GTC7TN1?cluster=devnet
  - `cancel_listing`: https://explorer.solana.com/tx/26owMVcUwFd5ANtAGwqWGDbkNo5wBZY63Qu2HGyedNBUyGHf7FQVopLruTwAT9N6iELz8RDeKUVR1jbXcHzuqUwX?cluster=devnet
- **`escrow/`, `voting/`, `nfts/`, `capstone/` untouched** throughout all
  seven tickets (constitution Principle VI).
- **No secrets committed** — deploy keypairs live only at
  `~/encode-solana-keys/` and gitignored `marketplace/target/`; checked
  `git ls-files | grep -i keypair` returns nothing.
- **Toolchain fixed and documented** — WSL now has working Node 22 (nvm)
  and Agave 4.2.2/platform-tools v1.54 (ships the `sbpfv3-solana-solana`
  target the localnet cluster requires). A real, non-obvious `anchor` CLI
  bug was found and worked around (every `anchor` subcommand silently
  reverts the active Solana release) — documented in `marketplace/README.md`
  and `WHERE-WE-ARE.md` so it doesn't cost the next person a debugging
  session.

## Missing

1. **7th test not re-verified after its fix.** Six of seven mocha tests
   were confirmed passing live against a local validator (TICKET-2). The
   7th (`wrong mint from buyer fails`) asserted a stale Anchor error code;
   commit `cef83d0` corrected the assertion, but that fix has not been
   re-run in this environment since — doing so would require rebuilding
   against the localnet keypair, which moves `declare_id!` off the live
   Devnet program ID until rebuilt back. **Action**: run `npm test` once
   more, then rebuild/redeploy for Devnet again if `declare_id!` moved.
2. **Superdesign's five screens aren't verifiable from the repo.**
   `.superdesign/` (uncommitted, local-only per course convention) has
   design tokens and route DNA in markdown plus a `resume.json` pointing at
   a superdesign.dev canvas URL — no local HTML mockups exist to diff the
   built frontend against. The frontend was built from the token values and
   route DNA, not a pixel-matched canvas export.
3. **Demo/Explorer-proof mints are throwaway test mints**, not the
   Exercise 10 collection the spec names as the default catalog. The
   frontend's catalog (`marketplace/frontend/src/lib/catalog.ts`) does
   reference the real Exercise 10 members, but no listing has actually been
   created for them yet — the Explorer proofs above are for freshly-minted
   0-decimal test tokens, not the Exercise 10 mints. This is disclosed
   already in `marketplace/README.md`'s Explorer proofs section.
4. **The Devnet buy proof's buyer wallet was funded by the seller**, not
   independently (Devnet faucet was rate-limited at the time). It's a
   genuinely different signer, so the two-party `buy_nft` path is really
   exercised — just not independently funded. Disclosed in the README.
5. **`.gitignore` / `.superdesign/` local-only state on `main`** predates
   this session's tickets and was never resolved either way (left
   untracked, which is consistent with "Superdesign is local-only" —
   nothing broken, just worth a conscious decision before final submit).

## Risks

1. **`declare_id!` is single-valued** — the program can only be "live" at
   one address in the source tree at a time. If anyone rebuilds for
   localnet testing (TICKET-2's workflow) without also rebuilding back for
   Devnet afterward, the frontend's hardcoded Devnet program ID will no
   longer match a locally-built binary — though the **already-deployed
   Devnet program is unaffected**, since deploys are independent of the
   local source tree once shipped. Only matters if someone redeploys.
2. **Original `6pKDR...` program ID (from the merged PR #3) is permanently
   unreachable** — its keypair was correctly never committed and doesn't
   exist anywhere. Anyone cross-referencing `specs/001-nft-marketplace/contracts/marketplace-program.md`
   (which still cites `6pKDR...`) against the live Devnet ID
   (`DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2`) will see a mismatch —
   documented in `marketplace/README.md`, not fixed in the spec doc itself
   (out of this ticket's scope; a spec-doc correction is cheap future work).
3. **`anchor` CLI toolchain-reverting quirk** could resurface for anyone
   running `anchor build`/`anchor deploy`/`anchor test` directly instead of
   following the documented workaround (`cargo-build-sbf` + `solana program
   deploy` + `ts-mocha`/`ts-node` directly, restoring the release around the
   unavoidable `anchor idl build`/`anchor keys sync` calls). If a grader
   runs the raw `anchor` commands from muscle memory, they'll hit the same
   `sbpfv3-solana-solana target may not be installed` error the original
   audit found — the fix is documented, not automatic.
4. **Large frontend bundle** (~818 KB minified JS, mostly wallet-adapter's
   own dependency tree) — a Vite warning, not a functional problem, but
   worth knowing before a grader opens dev tools.

## Constitution compliance (quick pass)

| Principle | Status |
| :--- | :--- |
| I. Course-First Delivery | **Met** — program + Phantom-connected UI, demoable on Devnet |
| II. On-Chain Safety First | **Met** — atomic instructions, PDA vault authority, seller-only cancel, fail-closed errors |
| III. Test-First On-Chain | **Mostly met** — 7 tests exist, 6/7 confirmed passing, 7th fixed but unverified (see Missing #1) |
| IV. Spec-Before-Code | **Met** — constitution → spec → plan → tasks all present and merged before implementation |
| V. Simplicity / YAGNI | **Met** — SOL-only, dedicated `marketplace/` tree, no v1 extras added |
| VI. Reuse Over Rewrite | **Met** — Exercise 10 catalog referenced, PDA pattern from `escrow/`, wallet-adapter pattern from `voting/frontend` |
| VII. Proofs and Documentation | **Met** — README architecture + runbooks + real Explorer links; no keys committed |

## What TICKET-7 changed

Docs only: this file, `marketplace/README.md` (grader quick-start section,
test-status honesty note), root `README.md` (pointer to this checklist and
the marketplace README). No program logic, no frontend code, no new
Explorer links beyond what TICKET-6 already produced.
