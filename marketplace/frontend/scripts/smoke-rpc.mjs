#!/usr/bin/env node
/**
 * Keyless Devnet smoke: same endpoint list as the desk, then a program read.
 *
 *   cd marketplace/frontend && npm run smoke:rpc
 *
 * Exit 0 only if at least one RPC answers getLatestBlockhash("finalized")
 * and getProgramAccounts for the marketplace program succeeds (0 listings OK).
 * No paid / private RPC key is required.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, PublicKey } from "@solana/web3.js";
import { KEYLESS_DEVNET_RPCS, PROGRAM_ID } from "../src/lib/rpc-endpoints.js";

const LISTING_DISCRIMINATOR = Buffer.from([218, 32, 50, 73, 43, 134, 26, 58]);

function envRpcOverride() {
  const override = process.env.VITE_SOLANA_RPC;
  return typeof override === "string" && override.trim() ? override.trim() : undefined;
}

function candidateEndpoints() {
  const override = envRpcOverride();
  const publicUrls = [...KEYLESS_DEVNET_RPCS];
  if (!override) return publicUrls;
  return [override, ...publicUrls.filter((url) => url !== override)];
}

function isFailoverError(err) {
  const msg = err?.message ? String(err.message) : String(err);
  if (/429|too many requests|blockhash not found|failed to fetch|fetch failed|networkerror|econnreset|etimedout|socket hang up/i.test(msg)) {
    return true;
  }
  const status = err?.status ?? err?.statusCode ?? err?.code;
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function shortErr(err) {
  const msg = err?.message ? String(err.message) : String(err);
  return msg.replace(/\s+/g, " ").slice(0, 180);
}

async function probeBlockhash(url) {
  const connection = new Connection(url, { commitment: "confirmed" });
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
  return { blockhash, lastValidBlockHeight };
}

async function fetchListingCount(url) {
  const idl = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/idl/marketplace.json"), "utf8")
  );
  if (idl.address !== PROGRAM_ID) {
    throw new Error(`IDL address ${idl.address} != PROGRAM_ID ${PROGRAM_ID}`);
  }
  const connection = new Connection(url, { commitment: "confirmed" });
  const programId = new PublicKey(PROGRAM_ID);
  const accounts = await connection.getProgramAccounts(programId, { commitment: "confirmed" });
  const listings = accounts.filter((entry) =>
    entry.account.data.subarray(0, 8).equals(LISTING_DISCRIMINATOR)
  );
  return { total: accounts.length, listings: listings.length };
}

async function fetchListingCountWithRetry(working) {
  const queue = working.length > 0 ? [...working] : candidateEndpoints();
  let lastError;
  for (let i = 0; i < queue.length; i++) {
    const url = queue[i];
    try {
      const counts = await fetchListingCount(url);
      return { url, ...counts, retried: i > 0 };
    } catch (err) {
      lastError = err;
      const canRetry = isFailoverError(err) && i < queue.length - 1;
      console.log(`  FAIL ${url}  getProgramAccounts: ${shortErr(err)}`);
      if (canRetry) {
        console.log(`  retrying once on next endpoint after 429 / blockhash / fetch failure…`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function main() {
  const candidates = candidateEndpoints();
  console.log("marketplace RPC smoke (keyless — no Helius/QuickNode required)");
  console.log(`program  ${PROGRAM_ID}`);
  console.log(`candidates (${candidates.length}):`);
  for (const url of candidates) {
    const tag = envRpcOverride() && url === envRpcOverride() ? "  (VITE_SOLANA_RPC)" : "";
    console.log(`  - ${url}${tag}`);
  }
  console.log("");
  console.log('getLatestBlockhash("finalized"):');

  const working = [];
  for (const url of candidates) {
    try {
      const { blockhash, lastValidBlockHeight } = await probeBlockhash(url);
      working.push(url);
      console.log(`  OK   ${url}`);
      console.log(`       blockhash=${blockhash} lastValidBlockHeight=${lastValidBlockHeight}`);
    } catch (err) {
      console.log(`  FAIL ${url}  ${shortErr(err)}`);
    }
  }

  if (working.length === 0) {
    console.error("\nNo keyless Devnet RPC answered getLatestBlockhash. smoke failed.");
    process.exit(1);
  }

  console.log("");
  console.log(`using ${working[0]} for program account read (listing.all equivalent)`);
  const result = await fetchListingCountWithRetry(working);
  console.log(
    `  OK   ${result.url}  programAccounts=${result.total} listingAccounts=${result.listings}` +
      (result.retried ? "  (after failover retry)" : "")
  );
  console.log("");
  console.log(`listings on-chain: ${result.listings} (0 is OK)`);
  console.log("smoke passed");
}

main().catch((err) => {
  console.error("\nsmoke failed:", shortErr(err));
  process.exit(1);
});
