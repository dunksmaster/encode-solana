#!/usr/bin/env bash
# Build (SBPFv3), deploy, and run the mocha tests against a local validator.
# Usage: from marketplace/  ./scripts/test-localnet.sh
# Prerequisite: solana-test-validator listening on 127.0.0.1:8899
#
# Why this doesn't just call `anchor build` / `anchor program deploy` / `anchor test`:
# on this machine, anchor-cli 1.1.2 has a side effect where every `anchor ...`
# subcommand silently reverts ~/.config/solana/install/config.yml's
# explicit_release back to an old pinned version (3.1.10, platform-tools
# v1.52 — no sbpfv3-solana-solana rustlib target), even when it isn't asked
# to touch the toolchain. That breaks any SBPFv3 binary built right before
# or after calling `anchor`. So we call `cargo-build-sbf` / `solana program
# deploy` / `ts-mocha` directly and restore the release right before each
# step that needs it, instead of going through the `anchor` wrapper.
set -euo pipefail
ROOT="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SOLANA_BIN="$HOME/.local/share/solana/install/active_release/bin"
export PATH="$SOLANA_BIN:$PATH"

restore_toolchain() {
  agave-install init stable >/dev/null
  export PATH="$SOLANA_BIN:$PATH"
}

restore_toolchain

if ! solana cluster-version --url http://127.0.0.1:8899 >/dev/null 2>&1; then
  echo "ERROR: no local validator at http://127.0.0.1:8899" >&2
  echo "Start one: solana-test-validator --reset" >&2
  exit 1
fi

# Agave 4.x localnet disables SBPF v0-v2 deploy (SIMD-0500). Build v3.
# Requires platform-tools >= v1.54 (agave-install init stable / a recent
# release channel) — v1.52 has no sbpfv3-solana-solana target.
cargo-build-sbf --arch v3 --manifest-path programs/marketplace/Cargo.toml

# `anchor idl build` also reverts the toolchain (see note above) — run it,
# then restore before deploying the SBPFv3 binary.
mkdir -p target/idl target/types
anchor idl build -o target/idl/marketplace.json -t target/types/marketplace.ts
restore_toolchain

solana program deploy target/deploy/marketplace.so \
  --program-id target/deploy/marketplace-keypair.json \
  --url http://127.0.0.1:8899

ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 \
ANCHOR_WALLET="$HOME/.config/solana/id.json" \
  npx ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"
