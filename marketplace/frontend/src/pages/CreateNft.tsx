import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { friendlyError } from "../lib/program";
import { mintTestNft } from "../lib/mintNft";
import { readAndResizeImage, setLocalMeta } from "../lib/nftMeta";

type Status = { kind: "ok" | "err" | "pending"; text: string } | null;

export default function CreateNft() {
  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [mintedAddress, setMintedAddress] = useState<string | null>(null);

  const canSubmit = connected && name.trim().length > 0 && !!imagePreview && !busy;

  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.");
      return;
    }
    try {
      const dataUrl = await readAndResizeImage(file);
      setImagePreview(dataUrl);
      setImageError(null);
    } catch (err: any) {
      setImageError(err?.message ?? "Could not read that image.");
    }
  }

  async function submit() {
    if (!publicKey || !imagePreview) return;
    setBusy(true);
    setMintedAddress(null);
    setStatus({ kind: "pending", text: "Minting… waiting for wallet / confirmation" });
    try {
      const { mint, signature } = await mintTestNft(wallet);
      setLocalMeta(mint, { name: name.trim(), image: imagePreview });
      setMintedAddress(mint);
      setStatus({
        kind: "ok",
        text: signature ? "Minted: " + signature.slice(0, 12) + "…" : "Minted (confirmation was slow, but it landed on-chain).",
      });
    } catch (err) {
      setStatus({ kind: "err", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create an NFT</h3>
        <p className="sub">
          This mints a real, brand-new Devnet NFT — a 0-decimal SPL token with a supply of 1,
          sent straight to your wallet. The program only checks that on-chain; it has no
          metadata account. So the name and image you set here are remembered in{" "}
          <strong>this browser only</strong>, to show up consistently across this app — they
          won't appear in Phantom or Solscan.
        </p>

        {!connected && <div className="hint-box">Connect your wallet above to create an NFT.</div>}

        <label>Name</label>
        <input
          type="text"
          placeholder="e.g. My Devnet Gem #1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!connected || busy}
          maxLength={64}
        />

        <label style={{ marginTop: "0.9rem" }}>Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={onImageChange}
          disabled={!connected || busy}
        />
        {imageError && (
          <p className="sub" style={{ color: "var(--danger)" }}>{imageError}</p>
        )}
        {imagePreview && (
          <div className="create-preview">
            <img src={imagePreview} alt="Preview" />
          </div>
        )}
      </div>

      <div className="card">
        <button className="primary" disabled={!canSubmit} onClick={submit}>
          {busy ? "Minting…" : "Mint NFT"}
        </button>
        {status && <div className={"status " + status.kind}>{status.text}</div>}

        {mintedAddress && (
          <div className="hint-box" style={{ marginTop: "0.75rem" }}>
            Minted <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{mintedAddress}</span> to
            your wallet.{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/list?mint=" + mintedAddress);
              }}
            >
              List it for sale now →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
