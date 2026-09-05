# Encode Solana Week 5 Exercise 10 (NFTs)

Metaplex Token Metadata NFTs on Solana Devnet using Umi.

Creates one parent collection NFT and three member NFTs with verified collection references (supply 1, decimals 0). Metadata URIs are public JSON uploaded via Irys on devnet.

## Setup

```bash
cd nfts
npm install
```

## Mint

```bash
npm run mint
```

Saves mint addresses to config/collection.devnet.json.

## List

```bash
npm run list
```

Fetches collection items and prints name / image / attributes.

## Explorer

https://explorer.solana.com/address/<MINT>?cluster=devnet
