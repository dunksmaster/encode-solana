import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import tokens from "./config/tokens.devnet.json";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()],
    ATA_PROGRAM
  );
  return ata;
}

function readU64LE(data: Buffer, offset: number): bigint {
  return data.readBigUInt64LE(offset);
}

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const mint = new PublicKey(tokens.tokens.token1.mint);
  const wallets = [
    { name: "main", address: new PublicKey(tokens.wallets.main) },
    { name: "second", address: new PublicKey(tokens.wallets.second) },
  ];

  const mintInfo = await connection.getAccountInfo(mint);
  if (!mintInfo) throw new Error("mint account not found");
  const decimals = mintInfo.data[44];
  const supply = readU64LE(Buffer.from(mintInfo.data), 36);
  const divisor = 10 ** decimals;

  console.log("cluster", tokens.cluster);
  console.log("mint", mint.toBase58());
  console.log("decimals from mint", decimals);
  console.log("supply", Number(supply) / divisor);

  for (const wallet of wallets) {
    const ata = getAssociatedTokenAddress(mint, wallet.address);
    const info = await connection.getAccountInfo(ata);
    if (!info) throw new Error("token account not found: " + ata.toBase58());
    const raw = readU64LE(Buffer.from(info.data), 64);
    console.log(wallet.name, {
      wallet: wallet.address.toBase58(),
      ata: ata.toBase58(),
      raw: raw.toString(),
      ui: Number(raw) / divisor,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
