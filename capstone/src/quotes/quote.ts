/**
 * Browser port of defi-quotes/src/quote.ts.
 * Pyth SOL/USD (on-chain push account) vs Jupiter SOL→USDC. NO SWAP. NO SECRETS.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import {
  FRESHNESS_MAX_AGE_SECONDS,
  JUPITER_QUOTE_URL,
  MAINNET,
  mainnetRpcCandidates,
} from "./config";

export type PythQuote = {
  price: number;
  conf: number;
  publishTime: number;
  ageSeconds: number;
  source: string;
  fresh: boolean;
};

export type JupiterQuote = {
  impliedPrice: number;
  inAmount: bigint;
  outAmount: bigint;
  priceImpactPct: string | undefined;
};

export type QuoteSnapshot = {
  pyth: PythQuote | null;
  jupiter: JupiterQuote | null;
  spreadPct: number | null;
  spreadBps: number | null;
  errors: string[];
};

type JupiterQuoteResponse = {
  inAmount?: string;
  outAmount?: string;
  priceImpactPct?: string;
};

function scalePyth(raw: string | number | bigint, expo: number): number {
  return Number(raw) * Math.pow(10, expo);
}

/**
 * Parse Pyth Solana Receiver PriceUpdateV2 account bytes.
 * Layout: disc(8) + write_authority(32) + verification_level(1) + PriceFeedMessage + posted_slot(u64)
 */
export function parsePriceUpdateV2Account(data: Uint8Array): {
  price: number;
  conf: number;
  publishTime: number;
} {
  if (data.length < 125) {
    throw new Error(`PriceUpdateV2 account too small (${data.length} bytes)`);
  }

  const msgOff = 41;
  const feedId = Array.from(data.subarray(msgOff, msgOff + 32))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (feedId !== MAINNET.PYTH_SOL_USD_FEED_ID) {
    throw new Error(
      `Unexpected feed id ${feedId} (wanted ${MAINNET.PYTH_SOL_USD_FEED_ID})`,
    );
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const priceRaw = view.getBigInt64(msgOff + 32, true);
  const confRaw = view.getBigUint64(msgOff + 40, true);
  const expo = view.getInt32(msgOff + 48, true);
  const publishTime = Number(view.getBigInt64(msgOff + 52, true));

  return {
    price: scalePyth(priceRaw, expo),
    conf: scalePyth(confRaw, expo),
    publishTime,
  };
}

export async function fetchPythOnChain(): Promise<PythQuote> {
  const accountPk = new PublicKey(MAINNET.PYTH_SOL_USD_PRICE_ACCOUNT);
  const endpoints = mainnetRpcCandidates();
  let lastError: unknown;

  for (const rpc of endpoints) {
    try {
      const connection = new Connection(rpc, "confirmed");
      const info = await connection.getAccountInfo(accountPk);
      if (!info?.data) {
        throw new Error(`Pyth on-chain account missing: ${MAINNET.PYTH_SOL_USD_PRICE_ACCOUNT}`);
      }

      const parsed = parsePriceUpdateV2Account(Uint8Array.from(info.data));
      const ageSeconds = Math.max(0, Math.floor(Date.now() / 1000 - parsed.publishTime));
      const host = new URL(rpc).host;

      return {
        price: parsed.price,
        conf: parsed.conf,
        publishTime: parsed.publishTime,
        ageSeconds,
        source: `on-chain push ${MAINNET.PYTH_SOL_USD_PRICE_ACCOUNT.slice(0, 8)}… via ${host}`,
        fresh: ageSeconds <= FRESHNESS_MAX_AGE_SECONDS,
      };
    } catch (err) {
      lastError = err;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Pyth on-chain read failed on all RPCs: ${msg}`);
}

export async function fetchJupiterSolUsdcQuote(): Promise<JupiterQuote> {
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

  return {
    impliedPrice: usdc / sol,
    inAmount,
    outAmount,
    priceImpactPct: data.priceImpactPct,
  };
}

export function computeSpreadPct(pyth: number, jupiter: number): number {
  if (pyth === 0) return 0;
  return ((jupiter - pyth) / pyth) * 100;
}

export async function fetchQuoteSnapshot(): Promise<QuoteSnapshot> {
  const errors: string[] = [];
  const [pythResult, jupiterResult] = await Promise.allSettled([
    fetchPythOnChain(),
    fetchJupiterSolUsdcQuote(),
  ]);

  const pyth = pythResult.status === "fulfilled" ? pythResult.value : null;
  const jupiter = jupiterResult.status === "fulfilled" ? jupiterResult.value : null;
  if (pythResult.status === "rejected") {
    errors.push(pythResult.reason instanceof Error ? pythResult.reason.message : String(pythResult.reason));
  }
  if (jupiterResult.status === "rejected") {
    errors.push(jupiterResult.reason instanceof Error ? jupiterResult.reason.message : String(jupiterResult.reason));
  }

  const spreadPct =
    pyth && jupiter ? computeSpreadPct(pyth.price, jupiter.impliedPrice) : null;

  return {
    pyth,
    jupiter,
    spreadPct,
    spreadBps: spreadPct === null ? null : spreadPct * 100,
    errors,
  };
}

export function formatUsd(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function staleTakeReason(pyth: PythQuote | null | undefined): string | null {
  if (!pyth) return "Take is disabled until a fresh Pyth SOL/USD quote is loaded.";
  if (pyth.fresh) return null;
  return `Take is disabled: Pyth last update is ${pyth.ageSeconds}s old (>${FRESHNESS_MAX_AGE_SECONDS}s). Treat the oracle as stale.`;
}
