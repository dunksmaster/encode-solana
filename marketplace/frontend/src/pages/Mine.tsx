import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { CATALOG } from "../lib/catalog";
import { friendlyError, getProgram } from "../lib/program";
import { withRpcFailover } from "../lib/rpc";

type MyListing = {
  pda: PublicKey;
  mint: PublicKey;
  priceSol: string;
};

export default function Mine() {
  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const [listings, setListings] = useState<MyListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!connected) {
    return <div className="empty">Connect a wallet to see your listings.</div>;
  }

  return (
    <div>
      <div className="card">
        <div className="kv">
          <span>Wallet</span>
          <span>{publicKey?.toBase58()}</span>
        </div>
      </div>

      {error && <div className="empty">Could not load listings: {error}</div>}
      {listings && listings.length === 0 && !error && (
        <div className="empty">No listings created by this wallet.</div>
      )}
      {listings && listings.length > 0 && (
        <div className="grid">
          {listings.map((l) => {
            const entry = CATALOG.find((c) => c.mint === l.mint.toBase58());
            return (
              <Link
                key={l.pda.toBase58()}
                to={"/listing/" + l.pda.toBase58()}
                className="card listing-card"
                style={{ textDecoration: "none" }}
              >
                <div className="media">no image (stub)</div>
                <div className="name">{entry?.name ?? l.mint.toBase58().slice(0, 8) + "…"}</div>
                <div className="price">{l.priceSol} SOL</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
