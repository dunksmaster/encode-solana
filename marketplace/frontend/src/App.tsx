import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import Shell from "./components/Shell";
import Home from "./pages/Home";
import CreateNft from "./pages/CreateNft";
import ListCreate from "./pages/ListCreate";
import ListingDetail from "./pages/ListingDetail";
import Mine from "./pages/Mine";
import {
  COMMITMENT,
  getCurrentEndpoint,
  pickWorkingEndpoint,
  subscribeEndpoint,
} from "./lib/rpc";

export default function App() {
  const [endpoint, setEndpoint] = useState(() => getCurrentEndpoint());
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const Conn = ConnectionProvider as any;
  const Wall = WalletProvider as any;
  const Modal = WalletModalProvider as any;

  useEffect(() => {
    const unsub = subscribeEndpoint(setEndpoint);
    void pickWorkingEndpoint();
    return unsub;
  }, []);

  return (
    <Conn endpoint={endpoint} config={{ commitment: COMMITMENT }}>
      <Wall wallets={wallets} autoConnect>
        <Modal>
          <BrowserRouter>
            <Shell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create" element={<CreateNft />} />
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
