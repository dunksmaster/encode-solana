import { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { EscrowDesk } from "./EscrowDesk";
import { QuotesPanel } from "./QuotesPanel";
import { ESCROW_PROGRAM_ID } from "./escrow/client";
import { fetchQuoteSnapshot, type QuoteSnapshot } from "./quotes/quote";

function Desk() {
  const [snapshot, setSnapshot] = useState<QuoteSnapshot | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshQuotes = useCallback(async () => {
    setLoading(true);
    setQuoteError(null);
    try {
      setSnapshot(await fetchQuoteSnapshot());
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshQuotes();
  }, [refreshQuotes]);

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Quoted Escrow Desk</h1>
          <div className="sub">
            Week 6 capstone · Idea A · React + Phantom · devnet
          </div>
        </div>
        <WalletMultiButton />
      </div>
      <p className="sub">
        Escrow{" "}
        <a
          href={`https://explorer.solana.com/address/${ESCROW_PROGRAM_ID.toBase58()}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#93c5fd" }}
        >
          {ESCROW_PROGRAM_ID.toBase58()}
        </a>
      </p>
      <QuotesPanel
        snapshot={snapshot}
        error={quoteError}
        loading={loading}
        onRefresh={refreshQuotes}
      />
      <EscrowDesk pyth={snapshot?.pyth ?? null} />
    </div>
  );
}

export default function App() {
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const Conn = ConnectionProvider as any;
  const Wall = WalletProvider as any;
  const Modal = WalletModalProvider as any;

  return (
    <Conn endpoint={endpoint}>
      <Wall wallets={wallets} autoConnect>
        <Modal>
          <Desk />
        </Modal>
      </Wall>
    </Conn>
  );
}
