#!/usr/bin/env bash
# Build (SBPFv3), deploy, and run the six mocha tests against a local validator.
# Usage: from marketplace/  ./scripts/test-localnet.sh
# Prerequisite: solana-test-validator listening on 127.0.0.1:8899
set -euo pipefail
ROOT="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! solana cluster-version --url http://127.0.0.1:8899 >/dev/null 2>&1; then
  echo "ERROR: no local validator at http://127.0.0.1:8899" >&2
  echo "Start one: solana-test-validator --reset" >&2
  exit 1
fi

# Agave 4.2 localnet disables SBPF v0–v2 deploy (SIMD-0500). Build v3.
cargo-build-sbf --arch v3 --manifest-path programs/marketplace/Cargo.toml
anchor program deploy --provider.cluster localnet
anchor test --skip-local-validator --skip-build --skip-deploy
