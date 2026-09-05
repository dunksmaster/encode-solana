/**
 * Encode Solana — Week 5 Exercise 9
 * Quote-only CLI: Pyth SOL/USD oracle vs Jupiter SOL→USDC route price.
 * NO SWAP EXECUTION.
 *
 * Pyth sources (in order):
 * 1) Hermes HTTP if PYTH_API_KEY is set
 * 2) On-chain sponsored push price-feed account (mainnet, keyless)
 */
import { Connection, PublicKey } from "@solana/web3.js";
import {
  FRESHNESS_MAX_AGE_SECONDS,
  JUPITER_QUOTE_URL,
  MAINNET,
  PYTH_HERMES_URL,
  SOLANA_MAINNET_RPC,
} from "./config";

type PythParsedPrice = {
  price: string;
  conf: string;
  expo: number;
  publish_time: number;
};

type PythLatestResponse = {
  parsed?: Array<{
    id: string;
    price: PythParsedPrice;
    ema_price?: PythParsedPrice;
  }>;
};

type JupiterQuoteResponse = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold?: string;
  priceImpactPct?: string;
  routePlan?: unknown[];
};

type PythQuote = {
  price: number;
  conf: number;
  publishTime: number;
  ageSeconds: number;
  source: string;
};

function parseArgs(argv: string[]): { pair: string } {
  const pairArg = argv.find((a) => !a.startsWith("-") && a.includes("/"));
  return { pair: (pairArg ?? "SOL/USDC").toUpperCase() };
}

function scalePyth(raw: string | number | bigint, expo: number): number {
  return Number(raw) * Math.pow(10, expo);
}

/**
 * Parse Pyth Solana Receiver PriceUpdateV2 account bytes.
 * Layout: disc(8) + write_authority(32) + verification_level(1) + PriceFeedMessage + posted_slot(u64)
 */
function parsePriceUpdateV2Account(data: Buffer): {
  price: number;
  conf: number;
  publishTime: number;
} {
  if (data.length < 125) {
    throw new Error(`PriceUpdateV2 account too small (${data.length} bytes)`);
  }

  // verification_level is 1 byte at offset 40; message starts at 41
  const msgOff = 41;
  const feedId = data.subarray(msgOff, msgOff + 32).toString("hex");
  if (feedId !== MAINNET.PYTH_SOL_USD_FEED_ID) {
    throw new Error(
      `Unexpected feed id ${feedId} (wanted ${MAINNET.PYTH_SOL_USD_FEED_ID})`,
    );
  }

  const priceRaw = data.readBigInt64LE(msgOff + 32);
  const confRaw = data.readBigUInt64LE(msgOff + 40);
  const expo = data.readInt32LE(msgOff + 48);
  const publishTime = Number(data.readBigInt64LE(msgOff + 52));

  return {
    price: scalePyth(priceRaw, expo),
    conf: scalePyth(confRaw, expo),
    publishTime,
  };
}

async function fetchPythFromHermes(apiKey: string): Promise<PythQuote> {
  const url = new URL(PYTH_HERMES_URL);
  url.searchParams.append("ids[]", MAINNET.PYTH_SOL_USD_FEED_ID);
  url.searchParams.set("parsed", "true");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pyth Hermes HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as PythLatestResponse;
  const feed = data.parsed?.[0];
  if (!feed?.price) {
    throw new Error("Pyth Hermes response missing parsed price for SOL/USD");
  }

  const price = scalePyth(feed.price.price, feed.price.expo);
  const conf = scalePyth(feed.price.conf, feed.price.expo);
  const publishTime = feed.price.publish_time;
  const ageSeconds = Math.max(0, Math.floor(Date.now() / 1000 - publishTime));

  return {
    price,
    conf,
    publishTime,
    ageSeconds,
    source: "Hermes HTTP",
  };
}

async function fetchPythOnChain(): Promise<PythQuote> {
  const connection = new Connection(SOLANA_MAINNET_RPC, "confirmed");
  const accountPk = new PublicKey(MAINNET.PYTH_SOL_USD_PRICE_ACCOUNT);
  const info = await connection.getAccountInfo(accountPk);
  if (!info?.data) {
    throw new Error(
      `Pyth on-chain account missing: ${MAINNET.PYTH_SOL_USD_PRICE_ACCOUNT}`,
    );
  }

  const buf = Buffer.from(info.data);
  const parsed = parsePriceUpdateV2Account(buf);
  const ageSeconds = Math.max(
    0,
    Math.floor(Date.now() / 1000 - parsed.publishTime),
  );

  return {
    price: parsed.price,
    conf: parsed.conf,
    publishTime: parsed.publishTime,
    ageSeconds,
    source: `on-chain push ${MAINNET.PYTH_SOL_USD_PRICE_ACCOUNT.slice(0, 8)}…`,
  };
}

async function fetchPythSolUsd(): Promise<PythQuote> {
  const apiKey = process.env.PYTH_API_KEY?.trim();
  if (apiKey) {
    try {
      return await fetchPythFromHermes(apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Hermes failed (${msg}); falling back to on-chain Pyth…`);
    }
  } else {
    console.log(
      "Note: PYTH_API_KEY not set — using on-chain Pyth mainnet push account (Hermes requires a free key since Aug 2026).",
    );
  }
  return fetchPythOnChain();
}

async function fetchJupiterSolUsdcQuote(): Promise<{
  impliedPrice: number;
  inAmount: bigint;
  outAmount: bigint;
  priceImpactPct: string | undefined;
}> {
  // 1 SOL in base units (9 decimals)
  const amount = BigInt(10) ** BigInt(MAINNET.SOL_DECIMALS);
  const url = new URL(JUPITER_QUOTE_URL);
  url.searchParams.set("inputMint", MAINNET.SOL_MINT);
  url.searchParams.set("outputMint", MAINNET.USDC_MINT);
  url.searchParams.set("amount", amount.toString());
  url.searchParams.set("slippageBps", "50");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jupiter quote HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as JupiterQuoteResponse;
  if (!data.outAmount || !data.inAmount) {
    throw new Error("Jupiter quote missing inAmount/outAmount");
  }

  const inAmount = BigInt(data.inAmount);
  const outAmount = BigInt(data.outAmount);
  const sol = Number(inAmount) / 10 ** MAINNET.SOL_DECIMALS;
  const usdc = Number(outAmount) / 10 ** MAINNET.USDC_DECIMALS;
  const impliedPrice = usdc / sol;

  return {
    impliedPrice,
    inAmount,
    outAmount,
    priceImpactPct: data.priceImpactPct,
  };
}

function formatUsd(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function computeSpreadPct(pyth: number, jupiter: number): number {
  if (pyth === 0) return 0;
  return ((jupiter - pyth) / pyth) * 100;
}

async function main(): Promise<void> {
  const { pair } = parseArgs(process.argv.slice(2));

  if (pair !== "SOL/USDC" && pair !== "SOL/USD") {
    console.error(
      `Unsupported pair "${pair}". This exercise quotes SOL/USDC (Pyth SOL/USD + Jupiter SOL→USDC).`,
    );
    process.exit(1);
  }

  console.log("=== Encode Solana Week 5 · Exercise 9 — Quote Compare ===");
  console.log("Mode: QUOTE ONLY (no swap execution)");
  console.log("Network for prices: Solana mainnet-beta references");
  console.log(`Pair: ${pair}`);
  console.log("");

  const [pyth, jup] = await Promise.all([
    fetchPythSolUsd(),
    fetchJupiterSolUsdcQuote(),
  ]);

  const fresh = pyth.ageSeconds <= FRESHNESS_MAX_AGE_SECONDS;
  const freshnessLabel = fresh ? "PASS" : "FAIL / WARN";

  console.log(
    `SOL/USD (Pyth): $${formatUsd(pyth.price)} +/- $${formatUsd(pyth.conf)}`,
  );
  console.log(`Last updated: ${pyth.ageSeconds}s ago`);
  console.log(`Pyth source: ${pyth.source}`);
  console.log(
    `Freshness (<=${FRESHNESS_MAX_AGE_SECONDS}s): ${freshnessLabel}`,
  );
  console.log("");

  console.log(
    `SOL/USDC (Jupiter): $${formatUsd(jup.impliedPrice)} (for 1 SOL)`,
  );
  if (jup.priceImpactPct !== undefined) {
    console.log(`Jupiter price impact: ${jup.priceImpactPct}%`);
  }
  console.log("");

  const spreadPct = computeSpreadPct(pyth.price, jup.impliedPrice);
  const spreadBps = spreadPct * 100;
  const sign = spreadBps >= 0 ? "+" : "";
  console.log(
    `Spread: ${Math.abs(spreadPct).toFixed(3)}% (${sign}${spreadBps.toFixed(1)} bps vs Pyth)`,
  );
  console.log(
    `  Jupiter ${jup.impliedPrice >= pyth.price ? "above" : "below"} Pyth by $${formatUsd(Math.abs(jup.impliedPrice - pyth.price), 4)}`,
  );

  if (!fresh) {
    console.log("");
    console.log(
      `WARNING: Pyth last update is ${pyth.ageSeconds}s old (>${FRESHNESS_MAX_AGE_SECONDS}s). Treat oracle price as stale.`,
    );
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(
    "Quote compare failed:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
