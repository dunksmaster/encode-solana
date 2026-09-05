/** Mainnet-beta mint addresses and Pyth feed IDs used for quote references. */
export const MAINNET = {
  SOL_MINT: "So11111111111111111111111111111111111111112",
  USDC_MINT: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  SOL_DECIMALS: 9,
  USDC_DECIMALS: 6,
  /** Pyth Core SOL/USD price feed id (hex). */
  PYTH_SOL_USD_FEED_ID:
    "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  /**
   * Sponsored Pyth push-oracle SOL/USD price feed account (shard 0) on mainnet.
   * Prefer this keyless path when Hermes requires PYTH_API_KEY.
   */
  PYTH_SOL_USD_PRICE_ACCOUNT: "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE",
} as const;

/** Hermes HTTP API (requires PYTH_API_KEY since Pyth Core upgrade Aug 2026). */
export const PYTH_HERMES_URL =
  "https://hermes.pyth.network/v2/updates/price/latest";

/** Public Solana mainnet RPC for on-chain Pyth price account reads. */
export const SOLANA_MAINNET_RPC =
  process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

/**
 * Jupiter free quote gateway (mainnet routes).
 * Quote only — this tool never calls /swap.
 */
export const JUPITER_QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";

/** Warn / fail freshness if Pyth publish_time is older than this (deck: >30s). */
export const FRESHNESS_MAX_AGE_SECONDS = 30;
