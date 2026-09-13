import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { withRpcFailover } from "./rpc";
import { isBlockhashNotFound } from "./program";

/**
 * Mints a brand-new 0-decimal SPL token with supply 1, straight to the
 * connected wallet's own ATA. `list_nft`/`buy_nft` only require
 * `decimals == 0` and `amount >= 1` (see lib.rs) — no Metaplex Token
 * Metadata account is needed for this program to accept it.
 */
export async function mintTestNft(wallet: WalletContextState): Promise<{ mint: string; signature: string }> {
  return withRpcFailover(async (connection) => {
    if (!wallet.publicKey || !wallet.sendTransaction) {
      throw new Error("Wallet not connected.");
    }
    const payer = wallet.publicKey;
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    const ata = getAssociatedTokenAddressSync(mint, payer);
    const lamports = await getMinimumBalanceForRentExemptMint(connection);

    const attempts = 3;
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mint,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(mint, 0, payer, payer, TOKEN_PROGRAM_ID),
        createAssociatedTokenAccountInstruction(payer, ata, payer, mint),
        createMintToInstruction(mint, ata, payer, 1, [], TOKEN_PROGRAM_ID)
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer;
      tx.partialSign(mintKeypair);

      try {
        const signature = await wallet.sendTransaction(tx, connection);
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
        return { mint: mint.toBase58(), signature };
      } catch (err) {
        lastError = err;
        // Confirmation can time out even after the transaction actually landed
        // (Phantom approval took a while, blockhash aged out while we waited).
        // Check before treating this as a real failure or retrying — retrying a
        // landed createAccount for the same mint would fail with "already in use".
        const info = await connection.getAccountInfo(mint).catch(() => null);
        if (info) {
          return { mint: mint.toBase58(), signature: "" };
        }
        if (!isBlockhashNotFound(err) || i === attempts - 1) {
          throw err;
        }
        // Mint account was never created on-chain — safe to rebuild with a fresh blockhash and retry.
      }
    }
    throw lastError;
  });
}
