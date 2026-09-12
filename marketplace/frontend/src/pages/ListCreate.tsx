import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@anchor-lang/core";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { CATALOG } from "../lib/catalog";
import { getProgram, listingPda, sellerAta, vaultAta, friendlyError } from "../lib/program";

type Status = { kind: "ok" | "err" | "pending"; text: string } | null;

export default function ListCreate() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const [mint, setMint] = useState(CATALOG[0]?.mint ?? "");
  const [price, setPrice] = useState("0.10");
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // Real ownership check: does the connected wallet hold 1 of each catalog mint?
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!publicKey) {
        setOwned({});
        return;
      }
      const result: Record<string, boolean> = {};
      for (const entry of CATALOG) {
        try {
          const ata = sellerAta(new PublicKey(entry.mint), publicKey);
          const acct = await getAccount(connection, ata);
          result[entry.mint] = acct.amount >= 1n;
        } catch {
          result[entry.mint] = false;
        }
      }
      if (!cancelled) setOwned(result);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  const ownsSelected = !!owned[mint];
  const canSubmit = connected && ownsSelected && Number(price) > 0 && !busy;

  async function submit() {
    if (!publicKey) return;
    const program = getProgram(connection, wallet);
    if (!program) return;

    setBusy(true);
    setStatus({ kind: "pending", text: "Listing… waiting for wallet / confirmation" });
    try {
      const mintKey = new PublicKey(mint);
      const listing = listingPda(publicKey, mintKey);
      const vault = vaultAta(mintKey, listing);
      const priceLamports = Math.round(Number(price) * LAMPORTS_PER_SOL);

      const sig = await program.methods
        .listNft(new BN(priceLamports))
        .accounts({
          seller: publicKey,
          mint: mintKey,
          sellerAta: sellerAta(mintKey, publicKey),
          listing,
          vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStatus({ kind: "ok", text: "Listed: " + sig.slice(0, 12) + "…" });
    } catch (err) {
      setStatus({ kind: "err", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>List an NFT</h3>
        {!connected && <p className="sub">Connect a wallet to list an NFT you own.</p>}

        <label>Mint (Exercise 10 catalog)</label>
        <select
          value={mint}
          onChange={(e) => setMint(e.target.value)}
          disabled={!connected}
          style={{
            width: "100%",
            padding: "0.55rem 0.7rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "#0f0819",
            color: "var(--text)",
            marginBottom: "0.75rem",
          }}
        >
          {CATALOG.map((entry) => (
            <option key={entry.mint} value={entry.mint}>
              {entry.name} — {entry.mint.slice(0, 8)}…{owned[entry.mint] === false ? " (not owned)" : ""}
            </option>
          ))}
        </select>
        {connected && !ownsSelected && (
          <p className="sub" style={{ color: "var(--danger)" }}>
            This wallet doesn't hold that mint — list will be rejected on-chain (InvalidNft).
          </p>
        )}

        <label>Price (SOL)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={!connected}
        />
      </div>

      <div className="card">
        <div className="kv">
          <span>Seller</span>
          <span>{publicKey?.toBase58() ?? "—"}</span>
          <span>Mint</span>
          <span>{mint}</span>
          <span>Price</span>
          <span>{price} SOL</span>
        </div>
        <button className="primary" disabled={!canSubmit} style={{ marginTop: "0.75rem" }} onClick={submit}>
          {busy ? "Listing…" : "List NFT"}
        </button>
        {status && <div className={"status " + status.kind}>{status.text}</div>}
      </div>
    </div>
  );
}
