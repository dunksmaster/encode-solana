const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");

const MINT = "9EH8icESGWuNnNhCkpEN4z237ZnBWJChBQ784v2VgUAJ";
const MAIN_ATA = "2QTwJxScdnypJUCWDkVz5cLhcAsyQ6Q18duU2dao2oM2";
const SECOND_ATA = "HTdHJLbGrYMFDkW5gqK2X7vkBiMaNhprBPFZDFq3DZn3";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const TOKEN_CLASSIC = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

async function show(connection, label, address) {
  const pk = new PublicKey(address);
  const parsed = await connection.getParsedAccountInfo(pk, "confirmed");
  if (!parsed.value) throw new Error(label + " not found: " + address);
  const owner = parsed.value.owner.toBase58();
  const data = parsed.value.data;
  console.log("\n=== " + label + " ===");
  console.log("address", address);
  console.log("owner program", owner);
  console.log("owner is Token-2022?", owner === TOKEN_2022);
  console.log("owner is classic SPL?", owner === TOKEN_CLASSIC);
  if (data && typeof data === "object" && "parsed" in data) {
    console.log(JSON.stringify(data.parsed, null, 2));
  } else {
    console.log("raw data length", Buffer.from(data).length);
  }
}

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  await show(connection, "Token-2022 mint", MINT);
  await show(connection, "main ATA", MAIN_ATA);
  await show(connection, "second ATA (fee withheld here)", SECOND_ATA);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
