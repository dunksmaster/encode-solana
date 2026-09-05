# Encode Solana Week 5 Exercise 9: DeFi Quotes

Quote-only TypeScript CLI: Pyth SOL/USD (confidence interval + freshness) vs Jupiter Sol-USDC mainnet route price. NO SWAP EXECUTION.

## How to run

    cd ~/encode-solana/defi-quotes
    npm install
    npm run quote

Optional: `npm run quote -- SOL/USDC`

Optional Hermes API key (free trial at Pyth Terminal):

    export PYTH_API_KEY=your-key
    npm run quote

Without a key, the CLI reads the on-chain Pyth SOL/USD price account on mainnet (fallback).

## Network note

Pyth and Jupiter quotes are mainnet-beta price references. Course programs are usually on Solana devnet. This tool never builds or signs swaps.

## Output shape

    SOL/USD (Pyth): $148.23 +-/ $0.12
    Last updated: 2s ago
    Freshness (<=30s): PASS

    SOL/USDC (Jupiter): $148.15 (for 1 SOL)

    Spread: 0.054%

Freshness exit code 2 if Pyth age > 30s.

## Config

SEL 9 hecimals, USDC 6 decimals - see src/config.ts.
