import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@anchor-lang/core";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { CATALOG } from "../lib/catalog";
import { resolveEntry } from "../lib/nftMeta";
import {
  listingPda,
  sellerAta,
  vaultAta,
  friendlyError,
  rpcSendWithFailover,
  RPC_SEND_OPTS,
} from "../lib/program";
import { isFailoverError, withRpcFailover } from "../lib/rpc";

type Status = { kind: "ok" | "err" | "pending"; text: string } | null;
type OwnedMap = Record<string, boolean>;

function parseMintAddress(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

export default function ListCreate() {
  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const [searchParams] = useSearchParams();
  const [catalogMint, setCatalogMint] = useState(CATALOG[0]?.mint ?? "");
  const [paste, setPaste] = useState(() => searchParams.get("mint") ?? "");
  const [price, setPrice] = useState("0.10");
  const [owned, setOwned] = useState<OwnedMap | null>(null);
  const [checkingOwnership, setCheckingOwnership] = useState(false);
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
        setOwned(null);
        setCheckingOwnership(false);
        return;
      }
      setCheckingOwnership(true);
      const mints = new Set(CATALOG.map((entry) => entry.mint));
      if (mint) mints.add(mint);
      try {
        const result = await withRpcFailover(async (rpc) => {
          const next: OwnedMap = {};
          for (const candidate of mints) {
            try {
              const ata = sellerAta(new PublicKey(candidate), publicKey);
              const acct = await getAccount(rpc, ata);
              next[candidate] = acct.amount >= 1n;
            } catch (err) {
              if (isFailoverError(err)) throw err;
              next[candidate] = false;
            }
          }
          return next;
        });
        if (!cancelled) setOwned(result);
      } catch {
        if (!cancelled) setOwned({});
      } finally {
        if (!cancelled) setCheckingOwnership(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [publicKey, mint]);

  // Once we know what the wallet actually holds, jump the catalog picker to
  // an owned entry instead of leaving it stuck on one it doesn't own.
  useEffect(() => {
    if (!owned) return;
    if (pasteActive) return;
    if (owned[catalogMint]) return;
    const firstOwned = CATALOG.find((entry) => owned[entry.mint]);
    if (firstOwned) setCatalogMint(firstOwned.mint);
  }, [owned, pasteActive, catalogMint]);

  const ownedCatalogEntries = useMemo(
    () => CATALOG.filter((entry) => owned?.[entry.mint]),
    [owned]
  );
  const hasOwnershipData = owned !== null;
  const ownsNothingInCatalog = hasOwnershipData && !checkingOwnership && ownedCatalogEntries.length === 0;
  const ownsSelected = !!owned?.[mint];
  const canSubmit = connected && !pasteInvalid && ownsSelected && Number(price) > 0 && !busy;
  const pastedEntry = pasteActive && !pasteInvalid ? resolveEntry(mint, CATALOG) : null;

  async function submit() {
    if (!publicKey) return;
    if (pasteInvalid) {
      setStatus({ kind: "err", text: "That doesn't look like a valid Devnet mint address." });
      return;
    }
    if (!ownsSelected) {
      setStatus({
        kind: "err",
        text: "This wallet doesn't hold that NFT yet, so Phantom would reject the listing. Pick one marked \"in your wallet\", or paste the address of an NFT you actually own.",
      });
      return;
    }
    setBusy(true);
    setStatus({ kind: "pending", text: "Listing… waiting for wallet / confirmation" });
    try {
      const mintKey = new PublicKey(mint);
      const listing = listingPda(publicKey, mintKey);
      const vault = vaultAta(mintKey, listing);
      const priceLamports = Math.round(Number(price) * LAMPORTS_PER_SOL);

      const sig = await rpcSendWithFailover(wallet, (program) =>
        program.methods
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
          .rpc(RPC_SEND_OPTS)
      );

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
          You can only list an NFT that's actually sitting in your connected wallet — the
          program checks your token account on-chain before it accepts a listing. Pick one
          below, or paste the mint address of any Devnet NFT you hold.
        </p>

        {!connected && (
          <div className="hint-box">Connect your wallet above to see which NFTs you can list.</div>
        )}

        {connected && !pasteActive && (
          <>
            <label>Your wallet's NFTs</label>
            <select
              value={catalogMint}
              onChange={(e) => setCatalogMint(e.target.value)}
              disabled={checkingOwnership && !hasOwnershipData}
              style={{
                width: "100%",
                padding: "0.55rem 0.7rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "#0f0819",
                color: "var(--text)",
                marginBottom: "0.5rem",
              }}
            >
              {CATALOG.map((entry) => {
                const isOwned = owned?.[entry.mint];
                const label = !hasOwnershipData
                  ? entry.name
                  : isOwned
                  ? `${entry.name} — in your wallet`
                  : `${entry.name} — not in your wallet`;
                return (
                  <option key={entry.mint} value={entry.mint}>
                    {label}
                  </option>
                );
              })}
            </select>

            {checkingOwnership && (
              <p className="sub" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span className="spinner-dot" aria-hidden="true" /> Checking your wallet for these NFTs…
              </p>
            )}

            {ownsNothingInCatalog && (
              <div className="hint-box hint-box-warn">
                None of the demo NFTs above are in this wallet. That's expected if you're using
                your own wallet rather than the seeded demo one — paste the mint address of any
                Devnet NFT you actually hold instead.
              </div>
            )}
          </>
        )}

        <label style={{ marginTop: connected ? "0.9rem" : 0 }}>
          Or paste a mint address you own
        </label>
        <input
          type="text"
          placeholder="Base58 mint address, e.g. 2SkyZ… — must be an NFT in this wallet"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          disabled={!connected}
          spellCheck={false}
          autoComplete="off"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
        {pasteActive && !pasteInvalid && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: "0.4rem 0" }}>
            {pastedEntry?.image && (
              <img
                src={pastedEntry.image}
                alt={pastedEntry.name}
                style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)" }}
              />
            )}
            <p className="sub" style={{ margin: 0 }}>
              {pastedEntry && pastedEntry.name !== mint.slice(0, 8) + "…" ? pastedEntry.name + " — " : ""}
              Using the pasted address instead of the dropdown above.{" "}
              {hasOwnershipData && !checkingOwnership && (ownsSelected ? "Good — this wallet holds it." : "This wallet doesn't hold it yet.")}
            </p>
          </div>
        )}
        {pasteInvalid && (
          <p className="sub" style={{ color: "var(--danger)" }}>
            That doesn't look like a valid Devnet mint address.
          </p>
        )}
        {connected && !pasteInvalid && hasOwnershipData && !checkingOwnership && !ownsSelected && !ownsNothingInCatalog && (
          <p className="sub" style={{ color: "var(--danger)" }}>
            This wallet doesn't hold that NFT — pick one marked "in your wallet" instead.
          </p>
        )}

        <label style={{ marginTop: "0.9rem" }}>Price (SOL)</label>
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
          <span>Listing</span>
          <span>{mint || "—"}</span>
          <span>Price</span>
          <span>{price} SOL</span>
        </div>
        <button className="primary" disabled={!canSubmit} style={{ marginTop: "0.75rem" }} onClick={submit}>
          {busy ? "Listing…" : checkingOwnership ? "Checking wallet…" : "List NFT"}
        </button>
        {status && <div className={"status " + status.kind}>{status.text}</div>}
      </div>
    </div>
  );
}
