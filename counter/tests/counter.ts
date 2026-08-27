import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Counter } from "../target/types/counter";
import { assert } from "chai";

describe("counter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.counter as Program<Counter>;
  const user = provider.wallet.publicKey;

  const [counterPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), user.toBuffer()],
    program.programId
  );

  it("initializes a per-user counter PDA", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({ user })
      .rpc();
    console.log("initialize", tx);

    const account = await program.account.counter.fetch(counterPda);
    assert.equal(account.count.toNumber(), 0);
    assert.ok(account.authority.equals(user));
  });

  it("increments only that user PDA", async () => {
    const tx = await program.methods
      .increment()
      .accounts({ authority: user })
      .rpc();
    console.log("increment", tx);

    const account = await program.account.counter.fetch(counterPda);
    assert.equal(account.count.toNumber(), 1);
  });
});
