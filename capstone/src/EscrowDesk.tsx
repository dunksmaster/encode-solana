import { useCallback, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import {
  CLIENT_TODOS,
  ESCROW_PROGRAM_ID,
  EXAMPLE_MINT_A,
  cancelAccounts,
  createEscrowProgram,
  escrowPda,
  makeAccounts,
  parseEscrowAccount,
  takeAccounts,
  toBn,
  type EscrowView,
} from "./escrow/client";
import { staleTakeReason, type PythQuote } from "./quotes/quote";

type Status = { kind: "ok" | "err" | "pending"; text: string };

function friendlyError(err: unknown): string {
  const anyErr = err as any;
  const msg =
    anyErr?.error?.errorMessage ||
    anyErr?.error?.errorCode?.code ||
    anyErr?.message ||
    String(err);
  if (msg.includes("InvalidAmount")) return "Deposit and receive amounts must be greater than zero.";
  if (msg.includes("Unauthorized")) return "Only the maker can cancel this escrow.";
  if (msg.includes("already in use")) return "That escrow id already exists for this maker.";
  if (msg.includes("AccountDoesNotExist") || msg.includes("AccountNotInitialized") || msg.includes("Account does not exist")) {
    return "Escrow account not found. Make it first, or it was already taken/cancelled.";
  }
  return msg;
}

type Props = {
  pyth: PythQuote | null;
};

export function EscrowDesk({ pyth }: Props) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [makerStr, setMakerStr] = useState("");
  const [id, setId] = useState("1");
  const [mintA, setMintA] = useState(EXAMPLE_MINT_A);
  const [mintB, setMintB] = useState("");
  const [deposit, setDeposit] = useState("1000000");
  const [receive, setReceive] = useState("500000");
  const [offer, setOffer] = useState<EscrowView | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
    return createEscrowProgram(provider);
  }, [connection, wallet]);

  const takeBlockedReason = staleTakeReason(pyth);

  const refresh = useCallback(async () => {
    if (!program) {
      setOffer(null);
      return;
    }
    try {
      const maker = new PublicKey(makerStr || wallet.publicKey!.toBase58());
      const [pda] = escrowPda(maker, id);
      const account: any = await (program.account as any).escrow.fetch(pda);
      setOffer(parseEscrowAccount(pda, account));
    } catch {
      setOffer(null);
    }
  }, [program, makerStr, wallet.publicKey, id]);

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(true);
    setStatus({ kind: "pending", text: label + "… waiting for wallet / confirmation" });
    try {
      const sig = await fn();
      setStatus({
        kind: "ok",
        text: "Confirmed: " + sig.slice(0, 12) + "…  https://explorer.solana.com/tx/" + sig + "?cluster=devnet",
      });
      await refresh();
    } catch (err) {
      setStatus({ kind: "err", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  const connected = !!wallet.publicKey;

  return (
    <>
      <div className="card">
        <h3>On-chain escrow</h3>
        <p className="sub" style={{ marginBottom: "0.75rem" }}>
          Program <span className="badge">{ESCROW_PROGRAM_ID.toBase58().slice(0, 8)}…</span>{" "}
          PDA seeds: escrow + maker + id (u64 LE)
        </p>
        {!connected && <p className="sub">Connect Phantom on <strong>devnet</strong> to read and send txs.</p>}
        <div className="grid-2">
          <div>
            <label>Maker (empty = your wallet)</label>
            <input
              value={makerStr}
              onChange={(e) => setMakerStr(e.target.value.trim())}
              placeholder={wallet.publicKey?.toBase58() ?? "Maker pubkey"}
            />
          </div>
          <div>
            <label>Escrow id</label>
            <input type="number" min={1} value={id} onChange={(e) => setId(e.target.value || "1")} />
          </div>
        </div>
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <button className="secondary" disabled={!connected || busy} onClick={() => refresh()}>
            Fetch offer
          </button>
        </div>
        {connected && !offer && (
          <p className="sub" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
            No escrow for this maker + id. Create one with Make.
          </p>
        )}
        {offer && (
          <div className="kv" style={{ marginTop: "0.85rem" }}>
            <span>Address</span><span className="mono">{offer.address}</span>
            <span>Vault ATA</span><span className="mono">{offer.vault}</span>
            <span>Maker</span><span className="mono">{offer.maker}</span>
            <span>Mint A → B</span>
            <span className="mono">{offer.mintA} → {offer.mintB}</span>
            <span>Deposit / receive</span>
            <span>{offer.depositAmount} / {offer.receiveAmount} (base units)</span>
            <span>Bump</span><span>{offer.bump}</span>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Make</h3>
        <p className="sub" style={{ marginBottom: "0.75rem" }}>
          Locks deposit of mint A into a vault ATA owned by the escrow PDA. Tokenkeg only.
        </p>
        <div className="grid-2">
          <div>
            <label>Mint A (deposit)</label>
            <input value={mintA} onChange={(e) => setMintA(e.target.value.trim())} />
          </div>
          <div>
            <label>Mint B (receive)</label>
            <input
              value={mintB}
              onChange={(e) => setMintB(e.target.value.trim())}
              placeholder="Tokenkeg mint the taker must pay"
            />
          </div>
          <div>
            <label>Deposit amount (base units)</label>
            <input value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </div>
          <div>
            <label>Receive amount (base units)</label>
            <input value={receive} onChange={(e) => setReceive(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <button
            className="action"
            disabled={!connected || busy || !mintA || !mintB}
            onClick={() =>
              run("Making escrow", async () => {
                const accounts = makeAccounts({
                  maker: wallet.publicKey!,
                  mintA: new PublicKey(mintA),
                  mintB: new PublicKey(mintB),
                  id,
                });
                return program!.methods
                  .make(toBn(id), toBn(deposit), toBn(receive))
                  .accounts(accounts)
                  .rpc();
              })
            }
          >
            Make offer
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Take / Cancel</h3>
        <div className="row">
          <button
            className="action"
            disabled={!connected || busy || !!takeBlockedReason}
            title={takeBlockedReason ?? "Fill the offer as taker"}
            onClick={() =>
              run("Taking escrow", async () => {
                const maker = new PublicKey(offer?.maker || makerStr || wallet.publicKey!.toBase58());
                const a = new PublicKey(offer?.mintA || mintA);
                const b = new PublicKey(offer?.mintB || mintB);
                return program!.methods
                  .take()
                  .accounts(takeAccounts({ taker: wallet.publicKey!, maker, mintA: a, mintB: b, id }))
                  .rpc();
              })
            }
          >
            Take
          </button>
          <button
            className="secondary"
            disabled={!connected || busy}
            onClick={() =>
              run("Cancelling escrow", async () => {
                return program!.methods
                  .cancel()
                  .accounts(
                    cancelAccounts({
                      maker: wallet.publicKey!,
                      mintA: new PublicKey(offer?.mintA || mintA),
                      id,
                    }),
                  )
                  .rpc();
              })
            }
          >
            Cancel (maker)
          </button>
        </div>
        {takeBlockedReason && <p className="warn">{takeBlockedReason}</p>}
        <p className="sub" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
          {CLIENT_TODOS.join(" · ")}
        </p>
        {status && <div className={"status " + status.kind}>{status.text}</div>}
      </div>
    </>
  );
}
