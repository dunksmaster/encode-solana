import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@anchor-lang/core";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { CATALOG } from "../lib/catalog";
import { getProgram, listingPda, sellerAta, vaultAta, friendlyError } from "../lib/program";

type Status = { kind: "ok" | "err" | "pending"; text: string } | null;

function parseMintAddress(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

export default function ListCreate() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const [catalogMint, setCatalogMint] = useState(CATALOG[0]?.mint ?? "");
  const [paste, setPaste] = useState("");
  const [price, setPrice] = useState("0.10");
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const trimmedPaste = paste.trim();
  const pasteActive = trimmedPaste.length > 0;
  const pastedKey = pasteActive ? parseMintAddress(trimmedPaste) : null;
  const pasteInvalid = pasteActive && pastedKey === null;
  const mint = pastedKey ? pastedKey.toBase58() : catalogMint;

  // Real ownership check: does the connected wallet hold 1 of the catalog
  // mints plus whatever mint is currently chosen (catalog or pasted)?
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!publicKey) {
        setOwned({});
        return;
      }
      const mints = new Set(CATALOG.map((entry) => entry.mint));
      if (mint) mints.add(mint);
      const result: Record<string, boolean> = {};
      for (const candidate of mints) {
        try {
          const ata = sellerAta(new PublicKey(candidate), publicKey);
          const acct = await getAccount(connection, ata);
          result[candidate] = acct.amount >= 1n;
        } catch {
          result[candidate] = false;
        }
      }
      if (!cancelled) setOwned(result);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, mint]);

  const ownsSelected = !!owned[mint];
  const canSubmit = connected && !pasteInvalid && ownsSelected && Number(price) > 0 && !busy;

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
        <p className="sub">
          Connect a wallet, then pick an Exercise 10 catalog mint <em>or paste any
          Devnet mint address this wallet owns</em> (seeded / test mints are fine).
          The program accepts any mint your ATA holds — the catalog is convenience
          only.
        </p>

        <label>Mint (Exercise 10 catalog)</label>
        <select
          value={catalogMint}
          onChange={(e) => setCatalogMint(e.target.value)}
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

        <label>Or paste mint address</label>
        <input
          type="text"
          placeholder="Base58 PublicKey — any mint this wallet owns"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          disabled={!connected}
          spellCheck={false}
          autoComplete="off"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
        {pasteActive && !pasteInvalid && (
          <p className="sub">Using pasted mint (overrides the catalog select).</p>
        )}
        {pasteInvalid && (
          <p className="sub" style={{ color: "var(--danger)" }}>
            Not a valid base58 PublicKey.
          </p>
        )}
        {connected && !pasteInvalid && !ownsSelected && (
          <p className="sub" style={{ color: "var(--danger)" }}>
            This wallet doesn't hold that mint — list will be rejected on-chain (InvalidNft).
          </p>
        )}

        <label style={{ marginTop: "0.75rem" }}>Price (SOL)</label>
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
          <span>{mint || "—"}</span>
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
