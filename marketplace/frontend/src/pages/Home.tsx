import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import ListingCard from "../components/ListingCard";
import { CATALOG } from "../lib/catalog";
import { friendlyError, getProgram } from "../lib/program";
import { withRpcFailover } from "../lib/rpc";

type OpenListing = {
  pda: PublicKey;
  seller: PublicKey;
  mint: PublicKey;
  priceSol: string;
};

export default function Home() {
  const wallet = useWallet();
  const [listings, setListings] = useState<OpenListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!wallet.publicKey || !wallet.signTransaction) {
        setListings(null);
        return;
      }
      try {
        const all = await withRpcFailover(async (connection) => {
          const program = getProgram(connection, wallet);
          if (!program) throw new Error("Wallet not connected.");
          return (program.account as any).listing.all();
        });
        if (cancelled) return;
        setListings(
          all.map((entry: any) => ({
            pda: entry.publicKey,
            seller: entry.account.seller,
            mint: entry.account.mint,
            priceSol: (Number(entry.account.price) / 1e9).toString(),
          }))
        );
        setError(null);
      } catch (err: any) {
        if (!cancelled) setError(friendlyError(err));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [wallet.connected, wallet.publicKey]);

  return (
    <div>
      <div className="card">
        <p className="sub" style={{ margin: 0 }}>
          {!wallet.connected
            ? "Connect a wallet to load open listings from the program."
            : error
            ? "Could not load listings: " + error
            : "Browsing open listings on Devnet."}
        </p>
      </div>

      {!wallet.connected && (
        <div className="empty">Connect a wallet to browse live listings.</div>
      )}

      {wallet.connected && listings && listings.length === 0 && (
        <div className="empty">No open listings.</div>
      )}

      {wallet.connected && listings && listings.length > 0 && (
        <div className="grid">
          {listings.map((l) => {
            const entry = CATALOG.find((c) => c.mint === l.mint.toBase58()) ?? {
              mint: l.mint.toBase58(),
              name: l.mint.toBase58().slice(0, 8) + "…",
            };
            return (
              <ListingCard
                key={l.pda.toBase58()}
                id={l.pda.toBase58()}
                entry={entry}
                priceSol={l.priceSol}
                seller={l.seller.toBase58()}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
