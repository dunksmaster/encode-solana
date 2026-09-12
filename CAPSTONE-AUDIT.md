# Capstone Audit — Encode Week 6 Option 2 (NFT Marketplace)

**Audited**: `main` (constitution + spec, already merged via PR #2) and
`origin/cursor/nft-marketplace-plan-c543` (PR #3, open, program + tests —
checked out into a separate worktree so `main`'s uncommitted changes
weren't touched).

**Scope**: gap vs. Deck 06 / constitution / spec, what's missing for a
submittable capstone, risks/bugs in `marketplace/programs/marketplace/src/lib.rs`
and `marketplace/tests/marketplace.ts`, and next steps. No Explorer links or
test results are asserted below beyond what the repo itself contains —
where something couldn't be verified in this environment, it's marked
**UNVERIFIED**, not assumed true or false.

---

## Done

- **Constitution** (`.specify/memory/constitution.md`, v1.0.0, on `main`):
  seven principles covering delivery, on-chain safety, test-first, spec-first,
  YAGNI, reuse, and proofs. Fully in place.
- **Spec Kit artifacts** for `001-nft-marketplace` (PR #3): `spec.md`,
  `plan.md`, `research.md`, `data-model.md`, `contracts/marketplace-program.md`,
  `quickstart.md`, `tasks.md`. All five user stories, functional
  requirements, and the six safety scenarios are written down and consistent
  with the constitution.
- **Anchor program** `marketplace/programs/marketplace/src/lib.rs` (PR #3):
  `list_nft(price_lamports)`, `buy_nft()`, `cancel_listing()` implemented.
  - Listing PDA seeds `["listing", seller, mint]`, fields `seller, mint,
    price, bump, is_active` — matches spec/data-model exactly.
  - Vault is an ATA owned by the listing PDA; `buy_nft`/`cancel_listing`
    release it via `CpiContext::new_with_signer` (`invoke_signed`).
  - Price validation (`InvalidPrice`), NFT validation (`InvalidNft`,
    0-decimal + amount check), inactive-listing check (`ListingInactive`),
    and seller-only cancel (`has_one`/seed match) are all present.
  - Listing + vault are closed (`close = seller` / `close_account` CPI) on
    both buy and cancel, so a seller can re-list the same mint later — this
    is called out as a deliberate trade-off in the README.
- **Tests** `marketplace/tests/marketplace.ts` (PR #3): six `it()` blocks
  matching the constitution's required scenarios (List→Buy, List→Cancel,
  double-buy, buy-after-cancel, non-seller cancel, wrong-mint). Structurally
  they assert the right balance/account changes. **Whether they currently
  pass could not be verified in this environment — see Risks.**
- **`escrow/`, `voting/`, `nfts/`, `capstone/` are untouched** by PR #3
  (`git diff --stat main…PR3` over those paths is empty) — Principle VI
  honored.
- **No secrets committed**: `git ls-files` on the PR #3 branch has no
  keypair/`id.json`/`.pem` files; root `.gitignore` (on both branches)
  covers `keys/`, `**/*-keypair.json`, `**/target/`, `**/.anchor/`.
- **Docs updated for the program slice**: `WHERE-WE-ARE.md` and
  `docs/capstone/OPTION2-PLAN.md` reflect "program done, React next" on
  PR #3; `marketplace/README.md` has architecture, a localnet + Devnet
  runbook, and a trade-offs section.
- **Superdesign**: a design system (`.superdesign/design-system.md`,
  `.superdesign/init/*.md`) and a **remote** canvas project (see
  `resume.json`: `target: "marketplace-home"`, purple palette spec, a
  `canvasUrl` on superdesign.dev) exist locally on `main`, uncommitted (not
  pushed, as the prior context already knew). `.superdesign/init/pages.md`
  documents target route trees for `/`, `/list`, `/listing/:id`, `/mine`.

## Missing

1. **React frontend does not exist at all.** There is no `marketplace/frontend/`
   directory in either branch. Tasks T015–T018 (Vite scaffold, wallet-adapter,
   Devnet badge, wiring the three instructions) are unchecked in `tasks.md`
   and are explicitly deferred to "the next PR". This is the single largest
   gap against constitution Principle I ("a program with no wallet UI does
   not satisfy this principle") and against Deck 06.
2. **No actual Superdesign screen files exist locally.** `.superdesign/`
   contains only design-system/theme/route-tree **markdown** and a
   `resume.json` pointing at a superdesign.dev canvas URL — there is no
   local HTML/mockup for Connect, Home, List, Detail/Buy, or My-listings.
   "Design-locked" currently means a documented palette + route DNA plus a
   remote canvas, not five checked-in screens. Confirm the actual canvas
   state at the `canvasUrl` in `resume.json` before treating the visual
   design as final — this repo can't confirm it.
3. **No Devnet deployment and no Explorer proofs.** `marketplace/README.md`'s
   "Explorer proofs" section literally says `_pending deploy_` /
   `_pending_` for the program and all three sample transactions.
   `Anchor.toml` has a `[programs.devnet]` entry but that only means the
   program ID is reserved, not that anything is deployed.
4. **Test execution is unverified in this environment** (see Risks below) —
   `node_modules/` and `target/` don't exist in the PR #3 worktree (expected,
   gitignored, not itself a problem), but this WSL environment has no working
   `node` binary and the pinned platform-tools version cannot build the
   SBPFv3 artifact the scripts require. The tasks file marks T007–T021 `[x]`,
   but that reflects the author's own prior run, not something reproducible
   here today.
5. **`buy_nft`'s buyer ATA handling doesn't match its own contract doc** —
   see Risks #1. If unfixed, a first-time buyer (no pre-existing ATA for
   that mint) cannot complete `buy_nft` from a real frontend.
6. **PR #3 is not merged.** `main` only has the constitution + spec (PR #2);
   the program and tests are only on `origin/cursor/nft-marketplace-plan-c543`.
   Any grading against `main` alone would see 0% of the marketplace program.
7. **Local `main` has uncommitted work**: modified `.gitignore`
   (adds `.superdesign/tmp/`) and an untracked `.superdesign/` directory.
   Neither is committed or pushed; nothing was changed by this audit.
8. **Toolchain version drift**: `WHERE-WE-ARE.md` claims "Solana CLI 4.2.1"
   but this machine has `solana-cli 3.1.10` / platform-tools v1.52 actually
   installed (see Risks #4). If the grading/demo machine is in the same
   state as this WSL install, the documented build/test commands will not
   run as written.

## Risks / Bugs in `marketplace/lib.rs` + tests

1. **`buy_nft`'s `buyer_ata` account has no `init_if_needed`, contradicting
   the contract spec.** `specs/001-nft-marketplace/contracts/marketplace-program.md`
   describes `buyer_ata` as `` `init_if_needed`, payer = buyer `` (line 56),
   but the actual struct in `lib.rs:221-226` is a plain existing-account
   constraint:
   ```rust
   #[account(
       mut,
       associated_token::mint = mint,
       associated_token::authority = buyer,
   )]
   pub buyer_ata: Box<Account<'info, TokenAccount>>,
   ```
   `marketplace.ts` only passes because `ensureAta()` is called before every
   `doBuy()` (test helper, `marketplace.ts:80-104`, `217`). A real buyer who
   has never held that mint before will not have this ATA yet, and `buy_nft`
   will fail (`AccountNotInitialized` or an owner mismatch) instead of
   creating it — meaning the frontend (once built) must always pre-create
   the buyer's ATA in a separate step/instruction before calling `buy_nft`,
   or this needs `init_if_needed` (with `payer = buyer` and the
   `associated_token::mint/authority` constraints) added to the program.
   Failure scenario: buyer's wallet has never touched the listed mint →
   clicks Buy in the future desk → transaction fails with no clear recovery
   path unless the UI/init logic special-cases it.
2. **Tests import `"@anchor-lang/core"` (not the classic `@coral-xyz/anchor`).**
   `package-lock.json` does resolve this to a real npm package
   (`@anchor-lang/core@1.2.0`), and it's plausibly correct given the program
   pins `anchor-lang = "=1.1.2"` (Anchor's newer major-version rewrite uses
   the `@anchor-lang/*` scope) — but this could not be confirmed by actually
   installing and running the suite in this environment (no working `node`
   binary in WSL; see #4). Whether `anchor.workspace`, `AnchorProvider`, and
   `AnchorError` behave identically to the classic client under this package
   is **UNVERIFIED**. Recommend `npm ci && npm test` be run once, watched
   end-to-end, before trusting the "[x]" marks in `tasks.md`.
3. **Listing/vault closing relies on Anchor's automatic `close =` post-
   processing**, not an explicit call in the handler body. This is standard
   Anchor and not a bug, but it means the SOL transfer (buyer→seller) in
   `buy_nft` happens *before* the vault/listing close CPIs in the same
   instruction — if any of the three CPIs after the SOL transfer fail, the
   whole transaction reverts (Solana transactions are atomic), so this is
   safe. Noted only because it's worth confirming during a real test run
   that a forced mid-instruction failure actually rolls back the SOL leg too
   — the six tests as written don't include a "third CPI fails" case.
4. **The documented build path cannot currently execute in this WSL
   environment.** Running
   `cargo-build-sbf --arch v3 --manifest-path programs/marketplace/Cargo.toml`
   (exactly what `marketplace/package.json`'s `build` script and
   `scripts/test-localnet.sh` invoke) fails here with:
   ```
   error[E0463]: can't find crate for `core`
   = note: the `sbpfv3-solana-solana` target may not be installed
   ```
   Inspecting `~/.cache/solana/v1.52/platform-tools/rust/lib/rustlib/` shows
   only `sbpf-solana-solana`, `sbpfv1-solana-solana`, `sbpfv2-solana-solana`
   — **no `sbpfv3-solana-solana` target ships with platform-tools v1.52**
   (the version pinned by `solana-cli 3.1.10`, which is what's actually
   installed — not the 4.2.1 that `WHERE-WE-ARE.md` claims). `README.md`'s
   own comment ("Agave 4.2 localnet (SIMD-0500): SBPF v3 only") implies the
   author's machine has since moved to a newer Solana CLI/platform-tools
   than what's installed here. **This means the six tests cannot be proven
   to pass in this environment as configured** — either the toolchain here
   needs upgrading (`solana-install update` to an Agave 4.x release that
   ships SBPFv3 platform-tools), or the build needs to target v2 until then.
5. **`node` is not on `PATH` inside this WSL distro.** Only the Windows npm
   shim under `/mnt/c/Program Files/nodejs/npm` is visible; `~/.nvm` exists
   but has no `nvm.sh` (looks like an un-initialized clone of the nvm repo,
   not an installed nvm). `npm install`/`npm test` for `marketplace/` cannot
   be run from WSL as-is. This blocks reproducing the "6/6 tests" claim
   locally until Node is actually installed in WSL (matching the
   "Node 22.x" toolchain line in `WHERE-WE-ARE.md`).
6. **Minor: redundant but harmless constraint duplication.** `BuyNft`'s
   `seller` field has both `address = listing.seller` (on the
   `UncheckedAccount`) and the `listing` account's own `has_one = seller`.
   Not a bug — just double-enforced — no action needed.

## Exact next commands and file-level task list to close gaps

### 1. Fix the buyer-ATA gap (program correctness, do first — cheap, high value)
- Edit `marketplace/programs/marketplace/src/lib.rs`, `BuyNft.buyer_ata`
  (around line 221): add `init_if_needed, payer = buyer` and
  `associated_token_program`/`system_program` are already in scope. Rebuild
  the IDL/types after.
- Add a "first-time buyer, no existing ATA" case to
  `marketplace/tests/marketplace.ts` that does **not** call `ensureAta()`
  first, to actually exercise this path.

### 2. Get a working local toolchain, then actually run the six tests
```bash
# In WSL:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# restart shell, then:
nvm install 22 && nvm use 22
solana-install update            # or install an Agave 4.x release with SBPFv3 platform-tools
cd ~/encode-solana/marketplace
npm install
solana-test-validator --reset    # separate terminal
npm test
```
Only after this actually prints `6 passing` should `tasks.md` T007–T021 be
trusted as verified rather than author-claimed.

### 3. Merge or rebase PR #3 onto `main`
```bash
cd ~/encode-solana
git fetch origin
git merge origin/cursor/nft-marketplace-plan-c543   # or open/merge the PR on GitHub
```
`main` currently has none of the marketplace program; nothing here is
submittable until this lands.

### 4. Clean up `main`'s uncommitted state before merging
- Commit or discard the `.gitignore` change (adds `.superdesign/tmp/`) and
  decide whether `.superdesign/` should stay untracked (course says
  Superdesign is local-only, so leaving it untracked is consistent — but the
  `.gitignore` edit itself is currently uncommitted and should be resolved
  one way or the other).

### 5. Devnet deploy + Explorer proofs (README currently says "_pending_")
```bash
cd ~/encode-solana/marketplace
anchor deploy --provider.cluster devnet
anchor test --provider.cluster devnet
```
Then paste the real Explorer links for the program and one `list_nft` /
`buy_nft` / `cancel_listing` transaction each into `marketplace/README.md`
§"Explorer proofs" — do not fabricate these; they don't exist yet.

### 6. Build the React desk (the big remaining item)
- Confirm what's actually on the superdesign.dev canvas at the `canvasUrl`
  in `.superdesign/resume.json` — the five screens are not in git.
- `marketplace/frontend/`: Vite + React + TS strict + `@solana/wallet-adapter`,
  routes `/`, `/list`, `/listing/:id`, `/mine` (tasks T015–T018), wired to
  the three instructions, with the Devnet badge + wallet control everywhere
  (task T017), reusing `voting/frontend`'s wallet-adapter setup per the
  constitution.
- Update `tasks.md` (check off T015–T018), `WHERE-WE-ARE.md`, and
  `docs/capstone/OPTION2-PLAN.md` once the desk exists and is wired up.

### 7. Re-run this audit after the above to confirm what changed
Nothing above was executed as a side effect of writing this audit except
read-only inspection and one intentionally-failing local build attempt (to
verify the toolchain gap) inside a throwaway `git worktree` at
`/tmp/encode-solana-pr3`, which can be removed with:
```bash
cd ~/encode-solana && git worktree remove /tmp/encode-solana-pr3
```
