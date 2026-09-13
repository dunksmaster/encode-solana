import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { CATALOG } from "../lib/catalog";
import {
  getProgram,
  sellerAta,
  buyerAta,
  vaultAta,
  friendlyError,
  rpcWithBlockhashRetry,
  RPC_SEND_OPTS,
  type ListingAccount,
} from "../lib/program";

type Status = { kind: "ok" | "err" | "pending"; text: string } | null;

export default function ListingDetail() {
  const { id } = useParams();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { connected, publicKey } = wallet;

  const [listing, setListing] = useState<ListingAccount | null | "not-found">(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const load = useCallback(async () => {
    const program = getProgram(connection, wallet);
    if (!program || !id) {
      setListing(null);
      return;
    }
    try {
      const account = await (program.account as any).listing.fetch(new PublicKey(id));
      setListing(account);
    } catch {
      setListing("not-found");
    }
  }, [connection, wallet, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!connected) {
    return <div className="empty">Connect a wallet to view or act on this listing.</div>;
  }
  if (listing === null) {
    return <div className="empty">Loading…</div>;
  }
  if (listing === "not-found") {
    return <div className="empty">No open listing at {id} (never listed, bought, or cancelled).</div>;
  }

  const current: ListingAccount = listing;
  const entry = CATALOG.find((c) => c.mint === current.mint.toBase58()) ?? {
    mint: current.mint.toBase58(),
    name: current.mint.toBase58().slice(0, 8) + "…",
  };
  const isSeller = !!publicKey && current.seller.equals(publicKey);
  const priceSol = (Number(current.price) / 1e9).toString();

  async function cancel() {
    if (!publicKey || !id) return;
    const program = getProgram(connection, wallet);
    if (!program) return;

    setBusy(true);
    setStatus({ kind: "pending", text: "Cancelling… waiting for wallet / confirmation" });
    try {
      const listingKey = new PublicKey(id);
      const mintKey = current.mint;
      const sig = await rpcWithBlockhashRetry(() =>
        program.methods
          .cancelListing()
          .accounts({
            seller: publicKey,
            mint: mintKey,
            listing: listingKey,
            sellerAta: sellerAta(mintKey, publicKey),
            vault: vaultAta(mintKey, listingKey),
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc(RPC_SEND_OPTS)
      );
      setStatus({ kind: "ok", text: "Cancelled: " + sig.slice(0, 12) + "…" });
      await load();
    } catch (err) {
      setStatus({ kind: "err", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  async function buy() {
    if (!publicKey || !id) return;
    const program = getProgram(connection, wallet);
    if (!program) return;

    setBusy(true);
    setStatus({ kind: "pending", text: "Buying… waiting for wallet / confirmation" });
    try {
      const listingKey = new PublicKey(id);
      const mintKey = current.mint;
      const sig = await rpcWithBlockhashRetry(() =>
        program.methods
          .buyNft()
          .accounts({
            buyer: publicKey,
            seller: current.seller,
            mint: mintKey,
            listing: listingKey,
            vault: vaultAta(mintKey, listingKey),
            buyerAta: buyerAta(mintKey, publicKey),
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc(RPC_SEND_OPTS)
      );
      setStatus({ kind: "ok", text: "Bought: " + sig.slice(0, 12) + "…" });
      await load();
    } catch (err) {
      setStatus({ kind: "err", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card listing-card" style={{ maxWidth: 320 }}>
        <div className="media">no image (stub)</div>
        <div className="name">{entry.name}</div>
        <div className="price">{priceSol} SOL</div>
        <div className="seller">{current.seller.toBase58()}</div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Actions</h3>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button className="primary" disabled={isSeller || busy} onClick={buy}>
            {busy ? "Buying…" : "Buy"}
          </button>
          <button className="danger" disabled={!isSeller || busy} onClick={cancel}>
            {busy ? "Cancelling…" : "Cancel"}
          </button>
        </div>
        {status && <div className={"status " + status.kind}>{status.text}</div>}
      </div>
    </div>
  );
}
