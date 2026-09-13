import { AnchorProvider, Program } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import idl from "../idl/marketplace.json";
import { withRpcFailover } from "./rpc";

export const PROGRAM_ID = new PublicKey("DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2");

export type ListingAccount = {
  seller: PublicKey;
  mint: PublicKey;
  price: bigint | number;
  bump: number;
  isActive: boolean;
};

/** Mirrors voting/frontend's provider/program construction. IDL is the real `anchor idl build` output (target/idl/marketplace.json, copied in after the TICKET-6 Devnet deploy) — regenerate and re-copy if the program changes. */
export function getProgram(connection: Connection, wallet: WalletContextState) {
  if (!wallet.publicKey || !wallet.signTransaction) return null;
  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
    preflightCommitment: "finalized",
  });
  return new Program(idl as any, provider);
}

export const RPC_SEND_OPTS = {
  commitment: "confirmed" as const,
  preflightCommitment: "finalized" as const,
  maxRetries: 5,
};

function errorText(err: unknown): string {
  const e = err as any;
  return e?.error?.errorMessage || e?.error?.errorCode?.code || e?.message || String(err);
}

/** Covers both "stale blockhash rejected up front" and "expired waiting for confirmation". */
export function isBlockhashNotFound(err: unknown): boolean {
  return /blockhash not found|block height exceeded|has expired/i.test(errorText(err));
}

/** Re-fetch a blockhash and resend when Phantom / the RPC races on a stale one. */
export async function rpcWithBlockhashRetry<T>(send: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await send();
    } catch (err) {
      lastError = err;
      if (!isBlockhashNotFound(err) || i === attempts - 1) {
        throw err;
      }
    }
  }
  throw lastError;
}

type WiredProgram = Exclude<ReturnType<typeof getProgram>, null>;

/** list / buy / cancel: rotate public RPCs on 429 / blockhash / fetch failed, then retry the send. */
export async function rpcSendWithFailover<T>(
  wallet: WalletContextState,
  send: (program: WiredProgram) => Promise<T>
): Promise<T> {
  return withRpcFailover(async (connection) => {
    const program = getProgram(connection, wallet);
    if (!program) throw new Error("Wallet not connected.");
    return rpcWithBlockhashRetry(() => send(program));
  });
}

export function listingPda(seller: PublicKey, mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), seller.toBuffer(), mint.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function vaultAta(mint: PublicKey, listing: PublicKey) {
  return getAssociatedTokenAddressSync(mint, listing, true);
}

export function sellerAta(mint: PublicKey, seller: PublicKey) {
  return getAssociatedTokenAddressSync(mint, seller);
}

/** Same derivation as sellerAta — buy_nft's buyer_ata is init_if_needed, so this address need not exist yet. */
export function buyerAta(mint: PublicKey, buyer: PublicKey) {
  return getAssociatedTokenAddressSync(mint, buyer);
}

export function friendlyError(err: any): string {
  const msg = errorText(err);
  if (msg.includes("InvalidPrice")) return "Price must be greater than zero.";
  if (msg.includes("InvalidNft")) return "This mint isn't a 0-decimal NFT you hold, or the vault is empty.";
  if (msg.includes("ListingInactive")) return "This listing is no longer open.";
  if (msg.includes("Unauthorized") || msg.includes("ConstraintSeeds") || msg.includes("ConstraintHasOne")) {
    return "Only the listing's seller can do this.";
  }
  if (msg.includes("AccountNotInitialized")) return "Listing not found (already closed or never created).";
  if (msg.includes("already in use")) return "You already have an active listing for this mint.";
  if (/blockhash not found|block height exceeded|has expired/i.test(msg)) {
    return "The transaction's blockhash expired — usually because approving in Phantom took a bit too long, or the public Devnet RPC is slow. It automatically retries with a fresh blockhash; if you still see this, just retry, or optionally set VITE_SOLANA_RPC to a dedicated Devnet RPC and restart the frontend.";
  }
  if (/429|too many requests/i.test(msg)) {
    return "Devnet RPC rate-limited (429) after public-endpoint failover. Retry in a moment, or optionally set VITE_SOLANA_RPC and restart the frontend.";
  }
  return msg;
}
