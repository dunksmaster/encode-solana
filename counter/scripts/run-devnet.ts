import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Counter } from "../target/types/counter";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.counter as Program<Counter>;
  const user = provider.wallet.publicKey;

  const [counterPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), user.toBuffer()],
    program.programId
  );

  console.log("wallet", user.toBase58());
  console.log("program", program.programId.toBase58());
  console.log("counter PDA", counterPda.toBase58(), "bump", bump);

  const existing = await provider.connection.getAccountInfo(counterPda);
  if (!existing) {
    const tx = await program.methods.initialize().accounts({ user }).rpc();
    console.log("initialize tx", tx);
    console.log(
      "explorer",
      `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    );
  } else {
    console.log("PDA already exists, skipping initialize");
  }

  const inc = await program.methods.increment().accounts({ authority: user }).rpc();
  console.log("increment tx", inc);
  console.log(
    "explorer",
    `https://explorer.solana.com/tx/${inc}?cluster=devnet`
  );

  const account = await program.account.counter.fetch(counterPda);
  console.log("count", account.count.toString());
  console.log("authority", account.authority.toBase58());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
