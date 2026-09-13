/**
 * Shared keyless Devnet RPC list — imported by the Vite desk (`rpc.ts`)
 * and by `scripts/smoke-rpc.mjs` so both resolve the same candidates.
 *
 * Verified with getLatestBlockhash(finalized) + Devnet genesis
 * `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
 *
 * Dropped (do not use as defaults): OnFinality public (429), Ankr public
 * (API key), PublicNode / dRPC / Omniatech / Alchemy demo (403 / 521 / 429).
 */

/** @type {readonly string[]} */
export const KEYLESS_DEVNET_RPCS = Object.freeze([
  "https://api.devnet.solana.com",
  "https://devnet.rpcpool.com",
  "https://solana-devnet.gateway.tatum.io",
]);

export const PROGRAM_ID = "DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2";
