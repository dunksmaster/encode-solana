# SKILL_AUDIT_AND_GAP_ANALYSIS

**Skills source:** [dunksmaster/skills-upgrade](https://github.com/dunksmaster/skills-upgrade) (Matt Pocock agent skills fork)  
**Target:** [dunksmaster/encode-solana](https://github.com/dunksmaster/encode-solana) (`main`, audited 2026-09-05)  
**Local note:** WSL `~/encode-solana` was unreachable during this run. Memory/prior work indicates local is **ahead** of GitHub (Week 5 escrow, defi-quotes, NFTs, voting frontend). Matrix scores **GitHub main**; local deltas called out where they change a skill score.

---

## Scope note (read first)

`skills-upgrade` is **not** a catalog of runtime enterprise modules (SecureSecrets, Redis, GracefulShutdown, etc.). Those names do **not** exist in this repo.

It is a set of **agent workflow / engineering process skills** (slash-command disciplines): grilling, domain modeling (`CONTEXT.md` + ADRs), setup scaffolding (`docs/agents/`), TDD red→green, triage, wayfinder, implement, code-review, etc.

This audit applies **only** skills that exist under `skills/engineering/` and `skills/productivity/` (25 skills). Deprecated / in-progress trees were not treated as standards unless shipped in those buckets.

**Category mismatch:** encode-solana is a Solana course portfolio (Anchor programs + TS clients on **devnet**). Most Matt Pocock skills expect a product repo configured with `/setup-matt-pocock-skills`. Absence is a **process gap**, not a “funds lost on crash” runtime gap—except where money risk is real for Solana key material and on-chain programs (called out honestly, and again in the appendix for findings **outside** the skill catalog).

---

## 1. Executive Summary

| Field | Value |
| :--- | :--- |
| **Verdict** | **Incomplete** |
| **Score** | **0 / 25** correctly implemented; **2 / 25** partial (⚠️) |
| **Partial credit** | **2 / 25** at ⚠️ (tdd, handoff-like status doc) |
| **Ready for skill-driven AFK agenting?** | **No** — `/setup-matt-pocock-skills` never run; tracker/docs/ADR scaffold missing |

**Harsh read:** Against the Absolute Standard in `skills-upgrade`, encode-solana fails almost every skill that leaves durable repo artifacts. Tests exist for several programs, but that is **not** skill-compliant TDD (no pre-agreed seams, no red→green discipline documented, no `CONTEXT.md` vocabulary). Progress markdown (`WHERE-WE-ARE.md`) is useful for humans but is **not** a domain glossary / ADR system.

**Money mindset:** On-chain programs touch value. Missing process skills raise the odds of shipping unsafe instruction logic, leaking keypairs, or drifting glossary (“vault” / “escrow” / “account”) without ADRs. GitHub `.gitignore` now excludes `keys/` and `*-keypair.json` (good hygiene), but GitHub tree is still stale vs completed Week 5 work—submission/Explorer proofs risk being wrong if you ship from remote alone.

---

## 2. The Skill Matrix

| Skill Name (from skills-upgrade) | Status | Gap Description | Risk Level | Fix Required |
| :--- | :---: | :--- | :--- | :--- |
| setup-matt-pocock-skills | ❌ | No `docs/agents/issue-tracker.md`, triage labels, domain layout | Critical | Run `/setup-matt-pocock-skills` once; write tracker + label docs |
| domain-modeling | ❌ | No root `CONTEXT.md`, no `docs/adr/` | Critical | Create glossary + ADRs for PDA/escrow/token terms |
| grill-with-docs | ❌ | No grilling paper trail; no ADRs from design sessions | High | Use skill before capstone; leave CONTEXT/ADRs |
| grill-me | ❌ | No evidence of structured interview artifacts | Med | Process-only; use before large decisions |
| grilling | ❌ | Primitive unused (same as above) | Med | Invoked by grill-* skills |
| tdd | ⚠️ | Mocha/Anchor tests exist (voting, tip-jar, counter; local: escrow) but no red→green / seam agreement / anti-pattern discipline | High | Adopt `/tdd` for remaining work; confirm seams first |
| implement | ❌ | No tickets/specs driving `/implement` → `/tdd` → `/code-review` | High | Capstone via to-spec → to-tickets → implement |
| code-review | ❌ | No documented coding standards; no two-axis reviews; no `docs/agents/issue-tracker.md` | High | Add `CODING_STANDARDS.md`; review diffs before push |
| to-spec | ❌ | No specs in tracker / `.scratch/` / docs | High | Publish capstone spec to tracker |
| to-tickets | ❌ | No tracer-bullet tickets with blocking edges | High | Split capstone into vertical slices |
| triage | ❌ | No triage labels / roles configured | Med | After setup; label issues |
| wayfinder | ❌ | Capstone is multi-session fog; no `wayfinder:map` | High | Chart decision tickets before building |
| ask-matt | ❌ | Skills not installed/configured in this repo | Med | Install skills + run setup |
| improve-codebase-architecture | ❌ | No architecture survey HTML / deepening work | Med | Run after Week 5 pushed |
| codebase-design | ❌ | No shared deep-module vocabulary in docs | Med | Introduce via CONTEXT + design sessions |
| diagnosing-bugs | ❌ | No disciplined loop artifacts; RPC 429s handled ad hoc | Med | Use skill on next hard failure |
| prototype | ❌ | No throwaway logic/UI prototypes marked as such | Low | Use for capstone UX/state questions |
| research | ❌ | No cited primary-source research notes in repo | Low | Capture oracle/Metaplex notes as MD |
| resolving-merge-conflicts | ❌ | N/A unless conflict mid-flight; no skill practice evidence | Low | Follow skill when conflicts appear |
| wizard | ❌ | No HITL bash wizards for wallet/CI secrets | Med | Wizard for deploy-key / Phantom setup |
| handoff | ⚠️ | `WHERE-WE-ARE.md` is a weak handoff analog, not skill-format handoff doc | Med | Use `/handoff` between sessions; keep WHERE-WE-ARE updated |
| teach | ❌ | Not a teaching workspace under this skill | Low | N/A unless using skill deliberately |
| to-questionnaire | ❌ | No questionnaires for async decisions | Low | Use for Encode submission unknowns |
| wait-what | ❌ | Relies on CONTEXT.md vocabulary — missing | Med | Needs domain-modeling first |
| writing-for-agents | ❌ | Thin README; WHERE-WE-ARE not agent-pointer shaped; no AGENTS.md skill section | Med | Add AGENTS.md pointers + prune status doc |

**Score detail:** 0 ✅ · 2 ⚠️ (`tdd`, `handoff`) · 23 ❌

---

## 3. Detailed Gap Analysis

### setup-matt-pocock-skills — ❌ Critical

- **Missing:** `docs/agents/issue-tracker.md`, triage label mapping, domain doc layout confirmation, optional `AGENTS.md` / `CLAUDE.md` `## Agent skills` section.
- **Risk:** Every downstream skill (`to-spec`, `to-tickets`, `triage`, `wayfinder`, `code-review`) tells the agent to abort and run setup. Capstone work with real value at stake proceeds without a tracker contract → missed tickets, untriaged bugs, no AFK-ready briefs.
- **Solution:** Run the skill once. Prefer **GitHub Issues** (remote is `dunksmaster/encode-solana`) or **local markdown** under `.scratch/` for solo. Write defaults: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Single-context: root `CONTEXT.md` + `docs/adr/`.

### domain-modeling — ❌ Critical

- **Missing:** `CONTEXT.md` (glossary: Account, PDA, vault, escrow, maker/taker, mint, ATA, proposal state). No `docs/adr/` (e.g. Token program vs Token-2022, CPI patterns, Metaplex Umi choice).
- **Risk:** Agents and you overload “account”; wrong CPI authority → stuck funds on mainnet later; glossary drift across escrow / tip-jar / voting.
- **Solution:** Create `CONTEXT.md` Language + Relationships; first ADRs when decisions crystallize (e.g. “classic SPL for escrow vaults”, “devnet-only until capstone review”).

### grill-with-docs / grill-me / grilling — ❌ High/Med

- **Missing:** No interview-driven ADRs or glossary updates from design sessions.
- **Risk:** Capstone combines 3+ subsystems without forced clarity → rebuilds, wrong architecture.
- **Solution:** Before Week 6 build, `/grill-with-docs` on the capstone idea; update CONTEXT/ADRs inline.

### tdd — ⚠️ High

- **Present:** `voting/tests/voting.ts`, `tip-jar/tests/tip-jar.ts`, `counter/tests/counter.ts` (GitHub). Local (when online): escrow six-test suite.
- **Gap:** Skill requires **pre-agreed seams**, **red before green**, vertical slices, no implementation-coupled tests. Evidence is post-hoc behavioral tests, not the loop.
- **Risk:** False confidence; refactors break brittle tests; mainnet defects without regression harness.
- **Solution:** For each remaining feature: name seams with user → one failing test → minimal program/client fix → repeat. Prefer instruction-level public interfaces.

### implement / to-spec / to-tickets / code-review — ❌ High

- **Missing:** Specs, tracer tickets with blockers, two-axis reviews, coding standards file.
- **Risk:** Capstone becomes one big ball of mud; unreviewed diffs; GitGuardian-class leaks recur.
- **Solution:** Capstone path: grill → `to-spec` → `to-tickets` → per-ticket `implement` (drives `tdd`) → `code-review` before commit. Add `CODING_STANDARDS.md` (no keypairs in git, Anchor patterns, explorer proof required).

### triage / wayfinder — ❌ Med/High

- **Missing:** Label vocabulary; no wayfinder map for multi-session capstone fog.
- **Risk:** Capstone scope thrash; decisions not recorded; duplicate work.
- **Solution:** After setup, open a `wayfinder:map` for “Week 6 Capstone destination”; resolve decision tickets before `/to-spec`.

### ask-matt / improve-codebase-architecture / codebase-design — ❌ Med

- **Missing:** Skills not wired into repo; no deepening survey; monorepo of shallow exercise folders with duplicated Anchor boilerplate.
- **Risk:** Agent navigability poor; copy-paste bugs across programs.
- **Solution:** Install skills into agent toolchain; after push of Week 5, run architecture survey focusing on shared test helpers / PDA utilities.

### diagnosing-bugs / prototype / research / resolving-merge-conflicts / wizard — ❌ Low–Med

- **Missing:** No HITL wizard for wallet/deploy keys; research notes not captured as cited MD; prototypes not marked throwaway.
- **Risk:** Humans paste secrets into chat; knowledge lost; conflict aborts lose intent.
- **Solution:** Add `scripts/` wizard for “fund wallet / set cluster / never commit keys”; research notes under `docs/research/`; use diagnose loop on next 429/Constraint* failure.

### handoff — ⚠️ Med

- **Present:** `WHERE-WE-ARE.md` (stale on GitHub: still says next is Ex 7 / Week 5).
- **Gap:** Not a `/handoff` document (session compact for another agent). Local progress ahead of file on remote.
- **Risk:** Wrong agent/human continues from stale state → redeploys wrong program, skips proofs.
- **Solution:** Refresh WHERE-WE-ARE; use formal handoff when switching agents/sessions.

### teach / to-questionnaire / wait-what / writing-for-agents — ❌ Low–Med

- **Missing:** Agent-oriented docs (`AGENTS.md` pointers), CONTEXT for wait-what, questionnaires for Encode submission process.
- **Risk:** Agents verbose / wrong jargon; submission steps unclear.
- **Solution:** `AGENTS.md` with pointers to CONTEXT, WHERE-WE-ARE, coding standards; questionnaire for “how Encode wants capstone submitted” if still unknown.

---

## 4. Prioritized Action Plan

### Phase 1 — Survival (do before any real-money / mainnet / capstone ship)

1. **Run `/setup-matt-pocock-skills`** → `docs/agents/issue-tracker.md` + triage labels + domain layout.
2. **Create `CONTEXT.md`** with Solana course glossary (PDA, vault authority, maker/taker, proposal states).
3. **Confirm secrets hygiene** on every machine: `keys/` and `*-keypair.json` gitignored; never commit deploy keypairs; rotate if ever public.
4. **Push local Week 5** (escrow, defi-quotes, nfts, voting/frontend) so GitHub matches reality—stale remote is an operational hazard.

### Phase 2 — Stability

1. **`/grill-with-docs`** on Week 6 capstone idea → ADRs.
2. **`/wayfinder`** if scope still foggy → then `/to-spec` → `/to-tickets`.
3. **Adopt `/tdd`** for every new instruction; keep existing tests, stop adding post-hoc-only coverage.
4. **`CODING_STANDARDS.md` + `/code-review`** before each push.

### Phase 3 — Optimization

1. `/improve-codebase-architecture` across exercise folders (shared helpers).
2. Research notes for Pyth/Jupiter/Metaplex as cited MD.
3. HITL `wizard` for environment bootstrap.
4. `AGENTS.md` + writing-for-agents cleanup of WHERE-WE-ARE.

---

## 5. List of Files to Create/Modify

| Path | Action | Based on skill |
| :--- | :--- | :--- |
| `docs/agents/issue-tracker.md` | **Create** | setup-matt-pocock-skills |
| `docs/agents/triage-labels.md` | **Create** (if triage used) | setup / triage |
| `CONTEXT.md` | **Create** | domain-modeling, grill-with-docs |
| `docs/adr/0001-*.md` … | **Create** as decisions land | domain-modeling |
| `CODING_STANDARDS.md` | **Create** | code-review |
| `AGENTS.md` | **Create** | setup / writing-for-agents |
| `WHERE-WE-ARE.md` | **Update** (GitHub stale) | handoff-adjacent |
| `.scratch/<capstone>/issues/*` | **Create** if local tracker | to-tickets |
| `docs/research/*.md` | **Create** as needed | research |
| `scripts/*-wizard.sh` | **Create** | wizard |
| GitHub Issues / labels | **Configure** | triage, wayfinder, to-spec |

**Do not invent** Redis configs, `src/config/secrets.ts`, graceful-shutdown hooks, etc.—they are **not** in `skills-upgrade`.

---

## Appendix A — Out-of-catalog findings (not skill-matrix rows)

These matter for real money / course completion but are **not** named skills in `skills-upgrade`:

| Finding | Severity | Notes |
| :--- | :--- | :--- |
| GitHub missing Week 5 dirs (escrow, defi-quotes, nfts) + voting frontend | High | Local ahead; push before submission |
| Prior keypair leak / GitGuardian history | Critical (historical) | HEAD gitignores keys; history scrub may still need verify |
| Devnet-only programs | Info | Fine for course; treat mainnet as new threat model |
| Public RPC 429 during tests | Med | Harden test sleeps / private RPC for serious runs |

---

## Appendix B — Skills inventory (source of truth)

**Engineering (18):** ask-matt, code-review, codebase-design, diagnosing-bugs, domain-modeling, grill-with-docs, implement, improve-codebase-architecture, prototype, research, resolving-merge-conflicts, setup-matt-pocock-skills, tdd, to-spec, to-tickets, triage, wayfinder, wizard  

**Productivity (7):** grill-me, grilling, handoff, teach, to-questionnaire, wait-what, writing-for-agents  

**Total audited: 25**

---

*Generated 2026-09-05 against live GitHub clones of `dunksmaster/skills-upgrade` and `dunksmaster/encode-solana`. No hallucinated skills.*
