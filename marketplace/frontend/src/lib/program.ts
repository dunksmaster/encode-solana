import { AnchorProvider, Program } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import idl from "../idl/marketplace.json";

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
  const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
  return new Program(idl as any, provider);
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
  const msg =
    err?.error?.errorMessage ||
    err?.error?.errorCode?.code ||
    err?.message ||
    String(err);
  if (msg.includes("InvalidPrice")) return "Price must be greater than zero.";
  if (msg.includes("InvalidNft")) return "This mint isn't a 0-decimal NFT you hold, or the vault is empty.";
  if (msg.includes("ListingInactive")) return "This listing is no longer open.";
  if (msg.includes("Unauthorized") || msg.includes("ConstraintSeeds") || msg.includes("ConstraintHasOne")) {
    return "Only the listing's seller can do this.";
  }
  if (msg.includes("AccountNotInitialized")) return "Listing not found (already closed or never created).";
  if (msg.includes("already in use")) return "You already have an active listing for this mint.";
  return msg;
}
