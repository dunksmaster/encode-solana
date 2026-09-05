import * as anchor from "@anchor-lang/core";
import { Program, AnchorError, BN } from "@anchor-lang/core";
import { Escrow } from "../target/types/escrow";
import { assert } from "chai";
import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, label = "rpc"): Promise<T> {
  let last: unknown;
  for (let i = 0; i < 8; i++) {
    try {
      return await fn();
    } catch (e: any) {
      last = e;
      const msg = String(e?.message ?? e);
      if (!msg.includes("429") && !msg.includes("Too Many") && !msg.includes("fetch failed")) {
        throw e;
      }
      const wait = 2000 * (i + 1);
      console.log("retry " + label + " after " + wait + "ms");
      await sleep(wait);
    }
  }
  throw last;
}

function escrowPda(program: Program<Escrow>, maker: PublicKey, id: BN) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(id.toString()));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), maker.toBuffer(), buf],
    program.programId
  );
}

async function fund(provider: anchor.AnchorProvider, to: PublicKey) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: to,
      lamports: 200_000_000,
    })
  );
  await withRetry(() => provider.sendAndConfirm(tx), "fund");
  await sleep(1200);
}

async function expectFail(fn: () => Promise<unknown>, code: string) {
  try {
    await fn();
    assert.fail("expected transaction to fail");
  } catch (err: any) {
    const msg =
      err instanceof AnchorError ? err.error.errorCode.code : String(err);
    assert.include(msg, code, "expected " + code + ", got " + msg);
  }
}

async function ensureAta(provider: anchor.AnchorProvider, mint: PublicKey, owner: PublicKey) {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  const info = await withRetry(() => provider.connection.getAccountInfo(ata), "ataInfo");
  if (!info) {
    const ix = createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      ata,
      owner,
      mint
    );
    await withRetry(() => provider.sendAndConfirm(new Transaction().add(ix)), "createAta");
    await sleep(800);
  }
  return ata;
}

describe("escrow", function () {
  this.timeout(400_000);
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.escrow as Program<Escrow>;
  const connection = provider.connection;
  const alice = provider.wallet as anchor.Wallet;
  const bob = Keypair.generate();
  const stranger = Keypair.generate();

  let mintA: PublicKey;
  let mintB: PublicKey;
  let mintWrong: PublicKey;
  let aliceAtaA: PublicKey;
  let aliceAtaB: PublicKey;
  let bobAtaA: PublicKey;
  let bobAtaB: PublicKey;

  const depositAmount = new BN(1_000_000);
  const receiveAmount = new BN(500_000);
  const idBase = new BN(Date.now() % 1_000_000_000);
  const idTake = idBase.addn(1);
  const idCancel = idBase.addn(2);
  const idDoubleTake = idBase.addn(3);
  const idTakeAfterCancel = idBase.addn(4);
  const idNonMaker = idBase.addn(5);
  const idWrongMint = idBase.addn(6);

  before(async () => {
    await sleep(5000);
    await fund(provider, bob.publicKey);
    await fund(provider, stranger.publicKey);

    mintA = await withRetry(
      () => createMint(connection, alice.payer, alice.publicKey, null, 6),
      "mintA"
    );
    await sleep(1200);
    mintB = await withRetry(
      () => createMint(connection, alice.payer, alice.publicKey, null, 6),
      "mintB"
    );
    await sleep(1200);
    mintWrong = await withRetry(
      () => createMint(connection, alice.payer, alice.publicKey, null, 6),
      "mintWrong"
    );
    await sleep(1200);

    aliceAtaA = await ensureAta(provider, mintA, alice.publicKey);
    aliceAtaB = await ensureAta(provider, mintB, alice.publicKey);
    bobAtaA = await ensureAta(provider, mintA, bob.publicKey);
    bobAtaB = await ensureAta(provider, mintB, bob.publicKey);
    const bobWrongAta = await ensureAta(provider, mintWrong, bob.publicKey);

    await withRetry(
      () => mintTo(connection, alice.payer, mintA, aliceAtaA, alice.publicKey, 50_000_000),
      "mintToA"
    );
    await sleep(1200);
    await withRetry(
      () => mintTo(connection, alice.payer, mintB, bobAtaB, alice.publicKey, 50_000_000),
      "mintToB"
    );
    await sleep(1200);
    await withRetry(
      () => mintTo(connection, alice.payer, mintWrong, bobWrongAta, alice.publicKey, 50_000_000),
      "mintToWrong"
    );
    await sleep(1200);

    console.log("mintA", mintA.toBase58());
    console.log("mintB", mintB.toBase58());
    console.log("program", program.programId.toBase58());
  });

  async function doMake(id: BN) {
    await sleep(1500);
    const [escrow, bump] = escrowPda(program, alice.publicKey, id);
    const vault = getAssociatedTokenAddressSync(mintA, escrow, true);
    await withRetry(
      () =>
        program.methods
          .make(id, depositAmount, receiveAmount)
          .accounts({
            maker: alice.publicKey,
            mintA,
            mintB,
            makerAtaA: aliceAtaA,
            escrow,
            vault,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
      "make"
    );
    await sleep(1500);
    return { escrow, vault, bump };
  }

  async function doTake(escrow: PublicKey, vault: PublicKey) {
    await sleep(1500);
    await withRetry(
      () =>
        program.methods
          .take()
          .accounts({
            taker: bob.publicKey,
            maker: alice.publicKey,
            escrow,
            mintA,
            mintB,
            vault,
            takerAtaA: bobAtaA,
            takerAtaB: bobAtaB,
            makerAtaB: aliceAtaB,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([bob])
          .rpc(),
      "take"
    );
    await sleep(1500);
  }

  async function doCancel(escrow: PublicKey, vault: PublicKey) {
    await sleep(1500);
    await withRetry(
      () =>
        program.methods
          .cancel()
          .accounts({
            maker: alice.publicKey,
            escrow,
            mintA,
            makerAtaA: aliceAtaA,
            vault,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc(),
      "cancel"
    );
    await sleep(1500);
  }

  it("Make then Take: Alice gets B, Bob gets A, vault closes", async () => {
    const { escrow, vault, bump } = await doMake(idTake);

    const vaultBefore = await withRetry(() => getAccount(connection, vault), "vault");
    assert.equal(vaultBefore.amount.toString(), depositAmount.toString());
    assert.ok(vaultBefore.owner.equals(escrow), "vault authority must be escrow PDA");

    const acct = await withRetry(() => program.account.escrow.fetch(escrow), "escrow");
    assert.ok(acct.maker.equals(alice.publicKey));
    assert.equal(acct.bump, bump);

    const aliceBBefore = await withRetry(() => getAccount(connection, aliceAtaB), "aliceB");
    const bobABefore = await withRetry(() => getAccount(connection, bobAtaA), "bobA");

    await doTake(escrow, vault);

    const aliceBAfter = await withRetry(() => getAccount(connection, aliceAtaB), "aliceB2");
    const bobAAfter = await withRetry(() => getAccount(connection, bobAtaA), "bobA2");
    assert.equal((aliceBAfter.amount - aliceBBefore.amount).toString(), receiveAmount.toString());
    assert.equal((bobAAfter.amount - bobABefore.amount).toString(), depositAmount.toString());
    assert.isNull(await withRetry(() => connection.getAccountInfo(vault), "vaultClosed"));
    await expectFail(() => program.account.escrow.fetch(escrow), "Account does not exist");
  });

  it("Make then Cancel: Alice gets A back, escrow closes", async () => {
    const { escrow, vault } = await doMake(idCancel);
    const aliceABefore = await withRetry(() => getAccount(connection, aliceAtaA), "aliceA");
    await doCancel(escrow, vault);
    const aliceAAfter = await withRetry(() => getAccount(connection, aliceAtaA), "aliceA2");
    assert.equal((aliceAAfter.amount - aliceABefore.amount).toString(), depositAmount.toString());
    assert.isNull(await withRetry(() => connection.getAccountInfo(vault), "vault2"));
    await expectFail(() => program.account.escrow.fetch(escrow), "Account does not exist");
  });

  it("Double-take fails", async () => {
    const { escrow, vault } = await doMake(idDoubleTake);
    await doTake(escrow, vault);
    await expectFail(() => doTake(escrow, vault), "AccountNotInitialized");
  });

  it("Take after cancel fails", async () => {
    const { escrow, vault } = await doMake(idTakeAfterCancel);
    await doCancel(escrow, vault);
    await expectFail(() => doTake(escrow, vault), "AccountNotInitialized");
  });

  it("non-maker cancel fails", async () => {
    const { escrow, vault } = await doMake(idNonMaker);
    const strangerAtaA = await ensureAta(provider, mintA, stranger.publicKey);
    await expectFail(
      () =>
        program.methods
          .cancel()
          .accounts({
            maker: stranger.publicKey,
            escrow,
            mintA,
            makerAtaA: strangerAtaA,
            vault,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([stranger])
          .rpc(),
      "ConstraintSeeds"
    );
    await doCancel(escrow, vault);
  });

  it("wrong mint from taker fails", async () => {
    const { escrow, vault } = await doMake(idWrongMint);
    const bobWrongAta = getAssociatedTokenAddressSync(mintWrong, bob.publicKey);
    // ATA mint/authority constraints reject wrong mint (ConstraintAssociated is OK)
    await expectFail(
      () =>
        program.methods
          .take()
          .accounts({
            taker: bob.publicKey,
            maker: alice.publicKey,
            escrow,
            mintA,
            mintB,
            vault,
            takerAtaA: bobAtaA,
            takerAtaB: bobWrongAta,
            makerAtaB: aliceAtaB,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([bob])
          .rpc(),
      "ConstraintAssociated"
    );
    await doCancel(escrow, vault);
  });
});
