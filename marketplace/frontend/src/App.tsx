import { useMemo } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import Shell from "./components/Shell";
import Home from "./pages/Home";
import ListCreate from "./pages/ListCreate";
import ListingDetail from "./pages/ListingDetail";
import Mine from "./pages/Mine";

function resolveEndpoint(): string {
  try {
    const override = import.meta.env.VITE_SOLANA_RPC;
    if (typeof override === "string" && override.trim()) {
      return override.trim();
    }
    // Ankr and Omniatech public Devnet endpoints fail getLatestBlockhash
    // (auth / 521). OnFinality's public Devnet RPC returns blockhashes.
    return "https://solana-devnet.api.onfinality.io/public";
  } catch {
    return clusterApiUrl("devnet");
  }
}

export default function App() {
  const endpoint = useMemo(() => resolveEndpoint(), []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const Conn = ConnectionProvider as any;
  const Wall = WalletProvider as any;
  const Modal = WalletModalProvider as any;

  return (
    <Conn endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <Wall wallets={wallets} autoConnect>
        <Modal>
          <BrowserRouter>
            <Shell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/list" element={<ListCreate />} />
                <Route path="/listing/:id" element={<ListingDetail />} />
                <Route path="/mine" element={<Mine />} />
              </Routes>
            </Shell>
          </BrowserRouter>
        </Modal>
      </Wall>
    </Conn>
  );
}
