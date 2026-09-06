/**
 * Escrow client for program 4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr (devnet).
 * Account maps match escrow/programs/escrow/src/lib.rs and escrow/tests/escrow.ts.
 */
import { BN, Program, type AnchorProvider } from "@anchor-lang/core";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "./escrow.json";

export const ESCROW_PROGRAM_ID = new PublicKey(
  "4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr",
);

export const EXAMPLE_MINT_A = "APZWUxbqLkVxBomyKW4K11jFLj7jqrAakGndRiQqPXZc";

export type EscrowView = {
  maker: string;
  mintA: string;
  mintB: string;
  depositAmount: string;
  receiveAmount: string;
  id: string;
  bump: number;
  address: string;
  vault: string;
};

export function escrowPda(maker: PublicKey, id: bigint | number | string): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(id));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), maker.toBuffer(), buf],
    ESCROW_PROGRAM_ID,
  );
}

export function vaultAta(mintA: PublicKey, escrow: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mintA, escrow, true);
}

export function createEscrowProgram(provider: AnchorProvider): Program {
  return new Program(idl as any, provider);
}

/** Accounts for `make` — see Make<'info> in lib.rs. */
export function makeAccounts(args: {
  maker: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  id: bigint | number | string;
}) {
  const [escrow] = escrowPda(args.maker, args.id);
  const makerAtaA = getAssociatedTokenAddressSync(args.mintA, args.maker);
  const vault = vaultAta(args.mintA, escrow);
  return {
    maker: args.maker,
    mintA: args.mintA,
    mintB: args.mintB,
    makerAtaA,
    escrow,
    vault,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
}

/** Accounts for `take` — see Take<'info> in lib.rs. */
export function takeAccounts(args: {
  taker: PublicKey;
  maker: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  id: bigint | number | string;
}) {
  const [escrow] = escrowPda(args.maker, args.id);
  const vault = vaultAta(args.mintA, escrow);
  return {
    taker: args.taker,
    maker: args.maker,
    escrow,
    mintA: args.mintA,
    mintB: args.mintB,
    vault,
    takerAtaA: getAssociatedTokenAddressSync(args.mintA, args.taker),
    takerAtaB: getAssociatedTokenAddressSync(args.mintB, args.taker),
    makerAtaB: getAssociatedTokenAddressSync(args.mintB, args.maker),
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
}

/** Accounts for `cancel` — see Cancel<'info> in lib.rs. */
export function cancelAccounts(args: {
  maker: PublicKey;
  mintA: PublicKey;
  id: bigint | number | string;
}) {
  const [escrow] = escrowPda(args.maker, args.id);
  return {
    maker: args.maker,
    escrow,
    mintA: args.mintA,
    makerAtaA: getAssociatedTokenAddressSync(args.mintA, args.maker),
    vault: vaultAta(args.mintA, escrow),
    tokenProgram: TOKEN_PROGRAM_ID,
  };
}

export function toBn(value: string | number | bigint): BN {
  return new BN(value.toString());
}

export function parseEscrowAccount(address: PublicKey, account: any): EscrowView {
  const mintA = account.mintA as PublicKey;
  return {
    maker: account.maker.toBase58(),
    mintA: mintA.toBase58(),
    mintB: account.mintB.toBase58(),
    depositAmount: account.depositAmount.toString(),
    receiveAmount: account.receiveAmount.toString(),
    id: account.id.toString(),
    bump: account.bump,
    address: address.toBase58(),
    vault: vaultAta(mintA, address).toBase58(),
  };
}

/**
 * TODO (after official brief, 7 Sep 2026):
 * - init_if_needed for taker_ata_a / maker_ata_b so Take does not require pre-created ATAs
 * - optional receive-amount check against the live Jupiter implied price
 * - Explorer proof links after the first live Make / Take / Cancel on this desk
 */
export const CLIENT_TODOS = [
  "ATAs must exist before Take (program has no init_if_needed)",
  "Only Tokenkeg mints — do not pass Token-2022 addresses",
] as const;
