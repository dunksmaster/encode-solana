import * as anchor from "@anchor-lang/core";
import { Program, AnchorError } from "@anchor-lang/core";
import { TipJar } from "../target/types/tip_jar";
import { assert } from "chai";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";

const TIP = 50000000;

function vaultPda(program: Program<TipJar>, owner: any) {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    program.programId
  )[0];
}

async function fund(provider: any, to: any) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: to,
      lamports: 200000000,
    })
  );
  await provider.sendAndConfirm(tx);
}

async function expectFail(fn: () => Promise<unknown>, code: string) {
  try {
    await fn();
    assert.fail("expected transaction to fail");
  } catch (err: any) {
    const msg = err instanceof AnchorError ? err.error.errorCode.code : String(err);
    assert.include(msg, code, "expected " + code + ", got " + msg);
  }
}

describe("tip-jar", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = (anchor.workspace as any).tipJar as Program<TipJar>;
  const owner = provider.wallet.publicKey;
  const tipper = Keypair.generate();
  const stranger = Keypair.generate();

  before(async () => {
    await fund(provider, tipper.publicKey);
    await fund(provider, stranger.publicKey);
  });

  it("initializes a vault with invoke", async () => {
    const vault = vaultPda(program, owner);
    await program.methods
      .initialize()
      .accounts({ owner, vault, systemProgram: SystemProgram.programId })
      .rpc();
    const info = await provider.connection.getAccountInfo(vault);
    assert.ok(info);
    assert.ok(info.lamports > 0);
    assert.equal(info.owner.toBase58(), SystemProgram.programId.toBase58());
  });

  it("rejects a second initialize", async () => {
    const vault = vaultPda(program, owner);
    await expectFail(
      () => program.methods.initialize().accounts({ owner, vault, systemProgram: SystemProgram.programId }).rpc(),
      "AlreadyInitialized"
    );
  });

  it("accepts a deposit via invoke", async () => {
    const vault = vaultPda(program, owner);
    const before = await provider.connection.getBalance(vault);
    await program.methods
      .deposit(new anchor.BN(TIP))
      .accounts({ depositor: tipper.publicKey, owner, vault, systemProgram: SystemProgram.programId })
      .signers([tipper])
      .rpc();
    const after = await provider.connection.getBalance(vault);
    assert.equal(after - before, TIP);
  });

  it("rejects a zero deposit", async () => {
    const vault = vaultPda(program, owner);
    await expectFail(
      () => program.methods.deposit(new anchor.BN(0)).accounts({ depositor: tipper.publicKey, owner, vault, systemProgram: SystemProgram.programId }).signers([tipper]).rpc(),
      "InvalidAmount"
    );
  });

  it("rejects withdraw from a stranger", async () => {
    const vault = vaultPda(program, owner);
    await expectFail(
      () => program.methods.withdraw(new anchor.BN(TIP)).accounts({ owner: stranger.publicKey, vault, systemProgram: SystemProgram.programId }).signers([stranger]).rpc(),
      "ConstraintSeeds"
    );
  });

  it("lets the owner withdraw via invoke_signed and keeps rent", async () => {
    const vault = vaultPda(program, owner);
    const ownerBefore = await provider.connection.getBalance(owner);
    await program.methods.withdraw(new anchor.BN(TIP)).accounts({ owner, vault, systemProgram: SystemProgram.programId }).rpc();
    const vaultAfter = await provider.connection.getBalance(vault);
    const ownerAfter = await provider.connection.getBalance(owner);
    assert.ok(vaultAfter > 0);
    assert.ok(ownerAfter > ownerBefore);
  });

  it("rejects a withdraw that would drop the vault below rent", async () => {
    const vault = vaultPda(program, owner);
    const leftover = await provider.connection.getBalance(vault);
    await expectFail(
      () => program.methods.withdraw(new anchor.BN(leftover)).accounts({ owner, vault, systemProgram: SystemProgram.programId }).rpc(),
      "InsufficientFunds"
    );
  });
});
