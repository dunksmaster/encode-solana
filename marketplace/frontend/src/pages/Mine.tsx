import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { CATALOG } from "../lib/catalog";
import { resolveEntry } from "../lib/nftMeta";
import {
  friendlyError,
  getProgram,
  sellerAta,
  vaultAta,
  rpcSendWithFailover,
  RPC_SEND_OPTS,
} from "../lib/program";
import { isFailoverError, withRpcFailover } from "../lib/rpc";

type MyListing = {
  pda: PublicKey;
  mint: PublicKey;
  priceSol: string;
};

type RowStatus = { kind: "ok" | "err" | "pending"; text: string };

export default function Mine() {
  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const [listings, setListings] = useState<MyListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState<Record<string, boolean> | null>(null);
  const [checkingOwned, setCheckingOwned] = useState(false);
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const [busyPda, setBusyPda] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicKey || !wallet.signTransaction) {
      setListings(null);
      return;
    }
    try {
      const all = await withRpcFailover(async (connection) => {
        const program = getProgram(connection, wallet);
        if (!program) throw new Error("Wallet not connected.");
        return (program.account as any).listing.all();
      });
      const mine = all.filter((entry: any) => entry.account.seller.equals(publicKey));
      setListings(
        mine.map((entry: any) => ({
          pda: entry.publicKey,
          mint: entry.account.mint,
          priceSol: (Number(entry.account.price) / 1e9).toString(),
        }))
      );
      setError(null);
    } catch (err: any) {
      setError(friendlyError(err));
    }
  }, [connected, publicKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Which catalog NFTs does this wallet actually hold right now, listed or not?
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!publicKey) {
        setOwned(null);
        return;
      }
      setCheckingOwned(true);
      try {
        const result = await withRpcFailover(async (rpc) => {
          const next: Record<string, boolean> = {};
          for (const entry of CATALOG) {
            try {
              const ata = sellerAta(new PublicKey(entry.mint), publicKey);
              const acct = await getAccount(rpc, ata);
              next[entry.mint] = acct.amount >= 1n;
            } catch (err) {
              if (isFailoverError(err)) throw err;
              next[entry.mint] = false;
            }
          }
          return next;
        });
        if (!cancelled) setOwned(result);
      } catch {
        if (!cancelled) setOwned({});
      } finally {
        if (!cancelled) setCheckingOwned(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  const listedMints = useMemo(() => new Set((listings ?? []).map((l) => l.mint.toBase58())), [listings]);
  const unlistedOwned = useMemo(
    () => CATALOG.filter((entry) => owned?.[entry.mint] && !listedMints.has(entry.mint)),
    [owned, listedMints]
  );
  const ownsAnything = !!owned && Object.values(owned).some(Boolean);

  async function cancel(l: MyListing) {
    if (!publicKey) return;
    const key = l.pda.toBase58();
    setBusyPda(key);
    setRowStatus((prev) => ({ ...prev, [key]: { kind: "pending", text: "Cancelling… waiting for wallet / confirmation" } }));
    try {
      const sig = await rpcSendWithFailover(wallet, (program) =>
        program.methods
          .cancelListing()
          .accounts({
            seller: publicKey,
            mint: l.mint,
            listing: l.pda,
            sellerAta: sellerAta(l.mint, publicKey),
            vault: vaultAta(l.mint, l.pda),
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc(RPC_SEND_OPTS)
      );
      setRowStatus((prev) => ({ ...prev, [key]: { kind: "ok", text: "Cancelled: " + sig.slice(0, 12) + "…" } }));
      await load();
    } catch (err) {
      setRowStatus((prev) => ({ ...prev, [key]: { kind: "err", text: friendlyError(err) } }));
    } finally {
      setBusyPda(null);
    }
  }

  if (!connected) {
    return <div className="empty">Connect a wallet to see the NFTs you hold and the listings you've created.</div>;
  }

  const nothingAtAll =
    listings !== null && listings.length === 0 && owned !== null && !checkingOwned && unlistedOwned.length === 0;

  return (
    <div>
      <div className="card">
        <div className="kv">
          <span>Wallet</span>
          <span>{publicKey?.toBase58()}</span>
        </div>
      </div>

      {error && <div className="empty">Could not load your listings: {error}</div>}

      <div className="section-title">Your open listings</div>
      {listings === null && !error && <div className="empty">Loading…</div>}
      {listings && listings.length === 0 && (
        <div className="hint-box">
          You don't have any open listings right now. List one of the NFTs below, or head to{" "}
          <Link to="/list">List an NFT</Link>.
        </div>
      )}
      {listings && listings.length > 0 && (
        <div className="grid">
          {listings.map((l) => {
            const entry = resolveEntry(l.mint.toBase58(), CATALOG);
            const name = entry.name;
            const key = l.pda.toBase58();
            const rs = rowStatus[key];
            return (
              <div key={key} className="card listing-card">
                <Link to={"/listing/" + key} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="media">
                    {entry.image ? (
                      <img src={entry.image} alt={name} />
                    ) : (
                      <span className="monogram">{name.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="name">{name}</div>
                  <div className="price">{l.priceSol} SOL</div>
                </Link>
                <button
                  className="danger"
                  disabled={busyPda === key}
                  onClick={() => cancel(l)}
                >
                  {busyPda === key ? "Cancelling…" : "Cancel listing"}
                </button>
                {rs && <div className={"status " + rs.kind}>{rs.text}</div>}
              </div>
            );
          })}
        </div>
      )}

      <div className="section-title">NFTs in your wallet, not yet listed</div>
      {checkingOwned && (
        <p className="sub" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="spinner-dot" aria-hidden="true" /> Checking your wallet…
        </p>
      )}
      {!checkingOwned && unlistedOwned.length === 0 && (
        <div className="empty">
          {ownsAnything
            ? "Everything this wallet holds from the demo catalog is already listed."
            : "This wallet doesn't hold any of the demo catalog NFTs — paste a Devnet mint you own on the List page instead."}
        </div>
      )}
      {!checkingOwned && unlistedOwned.length > 0 && (
        <div className="grid">
          {unlistedOwned.map((entry) => (
            <Link key={entry.mint} to="/list" className="card listing-card unlisted" style={{ textDecoration: "none" }}>
              <div className="media">
                {entry.image ? (
                  <img src={entry.image} alt={entry.name} />
                ) : (
                  <span className="monogram">{entry.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="name">{entry.name}</div>
              <div className="cta-hint">Not listed — click to list it →</div>
            </Link>
          ))}
        </div>
      )}

      {nothingAtAll && (
        <div className="hint-box" style={{ marginTop: "0.5rem" }}>
          Nothing here yet for this wallet. This page shows only NFTs this connected wallet
          actually holds, and listings it created — if you're using a fresh wallet, paste a
          Devnet NFT you own on the <Link to="/list">List page</Link> to get started.
        </div>
      )}
    </div>
  );
}
