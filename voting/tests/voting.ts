import * as anchor from "@anchor-lang/core";
import { Program, AnchorError } from "@anchor-lang/core";
import { Voting } from "../target/types/voting";
import { assert } from "chai";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";

function proposalPda(program: Program<Voting>, creator: anchor.web3.PublicKey, id: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(id));
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), creator.toBuffer(), buf],
    program.programId
  )[0];
}

function votePda(program: Program<Voting>, proposal: anchor.web3.PublicKey, voter: anchor.web3.PublicKey) {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), proposal.toBuffer(), voter.toBuffer()],
    program.programId
  )[0];
}

async function fund(provider: anchor.AnchorProvider, to: anchor.web3.PublicKey) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: to,
      lamports: 150000000,
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

describe("voting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.voting as Program<Voting>;
  const creator = provider.wallet.publicKey;
  const stranger = Keypair.generate();
  const happyId = 1;

  before(async () => {
    await fund(provider, stranger.publicKey);
  });

  it("creates a proposal in Draft", async () => {
    const proposal = proposalPda(program, creator, happyId);
    await program.methods
      .createProposal(new anchor.BN(happyId), "Ship the frontend")
      .accounts({ creator, proposal, systemProgram: SystemProgram.programId })
      .rpc();
    const account = await program.account.proposal.fetch(proposal);
    assert.equal(account.title, "Ship the frontend");
    assert.deepEqual(account.state, { draft: {} });
    assert.ok(account.creator.equals(creator));
  });

  it("rejects a vote in Draft", async () => {
    const proposal = proposalPda(program, creator, happyId);
    await expectFail(
      () =>
        program.methods
          .vote(true)
          .accounts({
            voter: creator,
            proposal,
            voteRecord: votePda(program, proposal, creator),
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
      "VoteInDraft"
    );
  });

  it("rejects activate from a non-creator", async () => {
    const proposal = proposalPda(program, creator, happyId);
    await expectFail(
      () =>
        program.methods
          .activate()
          .accounts({ creator: stranger.publicKey, proposal })
          .signers([stranger])
          .rpc(),
      "Unauthorized"
    );
  });

  it("activates, accepts one vote, rejects a duplicate", async () => {
    const proposal = proposalPda(program, creator, happyId);
    await program.methods.activate().accounts({ creator, proposal }).rpc();

    await program.methods
      .vote(true)
      .accounts({
        voter: creator,
        proposal,
        voteRecord: votePda(program, proposal, creator),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const after = await program.account.proposal.fetch(proposal);
    assert.deepEqual(after.state, { active: {} });
    assert.equal(after.yesVotes.toNumber(), 1);

    await expectFail(
      () =>
        program.methods
          .vote(false)
          .accounts({
            voter: creator,
            proposal,
            voteRecord: votePda(program, proposal, creator),
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
      "already in use"
    );
  });

  it("rejects close from a non-creator, then closes and rejects later votes", async () => {
    const proposal = proposalPda(program, creator, happyId);
    await expectFail(
      () =>
        program.methods
          .close()
          .accounts({ creator: stranger.publicKey, proposal })
          .signers([stranger])
          .rpc(),
      "Unauthorized"
    );

    await program.methods.close().accounts({ creator, proposal }).rpc();
    const closed = await program.account.proposal.fetch(proposal);
    assert.deepEqual(closed.state, { closed: {} });

    const other = Keypair.generate();
    await fund(provider, other.publicKey);

    await expectFail(
      () =>
        program.methods
          .vote(true)
          .accounts({
            voter: other.publicKey,
            proposal,
            voteRecord: votePda(program, proposal, other.publicKey),
            systemProgram: SystemProgram.programId,
          })
          .signers([other])
          .rpc(),
      "VoteInClosed"
    );
  });
});
