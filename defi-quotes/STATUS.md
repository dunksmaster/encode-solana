# Encode Solana Week 5 Exercise 9 - STATUS

Built: 2026-09-02 ~01:30 CEST on WSL Ubuntu.

## Built
CLI at /home/gigabyte/encode-solana/defi-quotes/
src/quote.ts src/config.ts package.json README.md
Quote only. No swap. Escrow untouched.

## Run
cd ~/encode-solana/defi-quotes
npm install && npm run quote

## Sample output summary (real run)
Pyth SOL/USD: 99.74 +/- 0.02 (age 25s, freshness PASS)
Jupiter SOL/USDC: 99.77 for 1 SOL
Spread: 0.029% (+2.9 bps vs Pyth)
Pyth source: on-chain push account 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE
Hermes needs PYTH_API_KEY since Aug 2026; optional for fresher oracle polls.
Freshness threshold: 30s (per deck).
