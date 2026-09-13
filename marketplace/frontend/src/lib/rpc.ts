import { Connection, type Commitment } from "@solana/web3.js";

/** Matches ConnectionProvider + AnchorProvider. */
export const COMMITMENT: Commitment = "confirmed";

/**
 * Free, keyless Devnet HTTP endpoints verified in this environment with
 * `getLatestBlockhash` (commitment finalized) and `getGenesisHash`
 * (`EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`).
 *
 * Dropped after probing (do not use as defaults):
 * - OnFinality public → HTTP 429 (API key required)
 * - Ankr public → Unauthorized (API key required)
 * - PublicNode / dRPC / Omniatech / Alchemy demo → 403 / 521 / 429
 */
export const KEYLESS_DEVNET_RPCS = [
  "https://api.devnet.solana.com",
  "https://devnet.rpcpool.com",
  "https://solana-devnet.gateway.tatum.io",
] as const;

export function envRpcOverride(): string | undefined {
  try {
    const override = import.meta.env.VITE_SOLANA_RPC;
    if (typeof override === "string" && override.trim()) {
      return override.trim();
    }
  } catch {
    // import.meta.env unavailable outside Vite
  }
  return undefined;
}

/** Prefer optional private RPC, then the verified keyless list. */
export function candidateEndpoints(): string[] {
  const override = envRpcOverride();
  const publicUrls = [...KEYLESS_DEVNET_RPCS];
  if (!override) return publicUrls;
  return [override, ...publicUrls.filter((url) => url !== override)];
}

let currentEndpoint = candidateEndpoints()[0];
const listeners = new Set<(url: string) => void>();

export function getCurrentEndpoint(): string {
  return currentEndpoint;
}

export function subscribeEndpoint(listener: (url: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setCurrentEndpoint(url: string): void {
  if (url === currentEndpoint) return;
  currentEndpoint = url;
  for (const listener of listeners) listener(url);
}

export function makeConnection(url: string = getCurrentEndpoint()): Connection {
  return new Connection(url, { commitment: COMMITMENT });
}

function errorText(err: unknown): string {
  const e = err as { error?: { errorMessage?: string; errorCode?: { code?: string } }; message?: string };
  return [e?.error?.errorMessage, e?.error?.errorCode?.code, e?.message, String(err)]
    .filter(Boolean)
    .join(" ");
}

/** 429 / blockhash / transport failures that should rotate to the next RPC. */
export function isFailoverError(err: unknown): boolean {
  const msg = errorText(err);
  if (
    /429|too many requests|blockhash not found|failed to fetch|fetch failed|networkerror|econnreset|etimedout|socket hang up/i.test(
      msg
    )
  ) {
    return true;
  }
  const status = (err as { status?: number; statusCode?: number; code?: number }).status
    ?? (err as { statusCode?: number }).statusCode
    ?? (err as { code?: number }).code;
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export async function probeEndpoint(url: string, timeoutMs = 4000): Promise<boolean> {
  const connection = makeConnection(url);
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("probe timeout")), timeoutMs);
  });
  try {
    await Promise.race([connection.getLatestBlockhash("finalized"), timeout]);
    return true;
  } catch {
    return false;
  }
}

/** First URL that answers getLatestBlockhash, else the first known-good candidate. */
export async function pickWorkingEndpoint(): Promise<string> {
  const candidates = candidateEndpoints();
  for (const url of candidates) {
    if (await probeEndpoint(url)) {
      setCurrentEndpoint(url);
      return url;
    }
  }
  setCurrentEndpoint(candidates[0]);
  return candidates[0];
}

function rotateFromCurrent(candidates: string[]): string[] {
  const start = candidates.indexOf(getCurrentEndpoint());
  if (start <= 0) return candidates;
  return [...candidates.slice(start), ...candidates.slice(0, start)];
}

/**
 * Run `fn` against the current (or each) candidate endpoint. On 429 /
 * Blockhash not found / fetch failed, switch URL and retry.
 */
export async function withRpcFailover<T>(
  fn: (connection: Connection, endpoint: string) => Promise<T>
): Promise<T> {
  const ordered = rotateFromCurrent(candidateEndpoints());
  let lastError: unknown;
  for (let i = 0; i < ordered.length; i++) {
    const url = ordered[i];
    try {
      const result = await fn(makeConnection(url), url);
      setCurrentEndpoint(url);
      return result;
    } catch (err) {
      lastError = err;
      if (!isFailoverError(err) || i === ordered.length - 1) {
        throw err;
      }
    }
  }
  throw lastError;
}
