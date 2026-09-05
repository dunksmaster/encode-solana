import { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@anchor-lang/core";
import idl from "./voting.json";

const PROGRAM_ID = new PublicKey("Gbfuc9mEzKx2oY5HycvF17HGMmMHEeXrvnKvdMiexWYv");
const CREATOR = new PublicKey("5kyuXhe2qeRGvANAATZAG9n9nRZM4iyc768mcxrqcDDG");

type ProposalView = {
  title: string;
  state: string;
  yesVotes: number;
  noVotes: number;
  creator: string;
  address: string;
};

function proposalPda(creator: PublicKey, id: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(id));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), creator.toBuffer(), buf],
    PROGRAM_ID
  )[0];
}

function votePda(proposal: PublicKey, voter: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), proposal.toBuffer(), voter.toBuffer()],
    PROGRAM_ID
  )[0];
}

function stateLabel(state: any): string {
  if (!state) return "unknown";
  if (state.draft !== undefined) return "Draft";
  if (state.active !== undefined) return "Active";
  if (state.closed !== undefined) return "Closed";
  return JSON.stringify(state);
}

function friendlyError(err: any): string {
  const msg =
    err?.error?.errorMessage ||
    err?.error?.errorCode?.code ||
    err?.message ||
    String(err);
  if (msg.includes("VoteInDraft")) return "Voting is only allowed after the proposal is Active.";
  if (msg.includes("VoteInClosed")) return "This proposal is Closed. No more votes.";
  if (msg.includes("Unauthorized")) return "Only the creator can activate or close.";
  if (msg.includes("already in use")) return "You already voted on this proposal.";
  if (msg.includes("AccountDoesNotExist") || msg.includes("AccountNotInitialized")) {
    return "Proposal account not found. Create it first.";
  }
  return msg;
}

function VotingPanel() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [proposalId, setProposalId] = useState(2);
  const [title, setTitle] = useState("Ship the frontend");
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err" | "pending"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const creator = useMemo(() => {
    return wallet.publicKey ?? CREATOR;
  }, [wallet.publicKey]);

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
    return new Program(idl as any, provider);
  }, [connection, wallet]);

  const refresh = useCallback(async () => {
    if (!program) {
      setProposal(null);
      return;
    }
    const pda = proposalPda(creator, proposalId);
    try {
      const account: any = await (program.account as any).proposal.fetch(pda);
      setProposal({
        title: account.title,
        state: stateLabel(account.state),
        yesVotes: Number(account.yesVotes),
        noVotes: Number(account.noVotes),
        creator: account.creator.toBase58(),
        address: pda.toBase58(),
      });
    } catch {
      setProposal(null);
    }
  }, [program, creator, proposalId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(true);
    setStatus({ kind: "pending", text: label + "… waiting for wallet / confirmation" });
    try {
      const sig = await fn();
      setStatus({ kind: "ok", text: "Confirmed: " + sig.slice(0, 12) + "…" });
      await refresh();
    } catch (err) {
      setStatus({ kind: "err", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  const isCreator =
    !!wallet.publicKey && proposal?.creator === wallet.publicKey.toBase58();
  const canCreate = !!wallet.publicKey && !proposal;
  const canActivate = isCreator && proposal?.state === "Draft";
  const canVote = !!wallet.publicKey && proposal?.state === "Active";
  const canClose = isCreator && proposal?.state === "Active";

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Encode Voting</h1>
          <div className="sub">Week 4 Ex 7 · React + Phantom · devnet</div>
        </div>
        <WalletMultiButton />
      </div>

      <div className="card">
        <label>Proposal id</label>
        <div className="row">
          <input
            type="number"
            min={1}
            value={proposalId}
            onChange={(e) => setProposalId(Number(e.target.value) || 1)}
            style={{ maxWidth: 120 }}
          />
          <button className="secondary" disabled={!wallet.connected || busy} onClick={() => refresh()}>
            Refresh
          </button>
        </div>
        <p className="sub" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
          Program <span className="badge">{PROGRAM_ID.toBase58().slice(0, 8)}…</span>
          {" "}PDA seeds: proposal + creator + id
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>On-chain proposal</h3>
        {!wallet.connected && <p className="sub">Connect Phantom to read and send txs.</p>}
        {wallet.connected && !proposal && (
          <p className="sub">No proposal for id {proposalId} under your wallet. Create one below.</p>
        )}
        {proposal && (
          <div className="kv">
            <span>Title</span><span>{proposal.title}</span>
            <span>State</span><span className="badge">{proposal.state}</span>
            <span>Yes / No</span><span>{proposal.yesVotes} / {proposal.noVotes}</span>
            <span>Creator</span><span style={{ wordBreak: "break-all" }}>{proposal.creator}</span>
            <span>Address</span><span style={{ wordBreak: "break-all" }}>{proposal.address}</span>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Actions</h3>
        {canCreate && (
          <div style={{ marginBottom: "0.75rem" }}>
            <label>Title for new proposal</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        )}
        <div className="row">
          {canCreate && (
            <button
              className="action"
              disabled={busy || !title.trim()}
              onClick={() =>
                run("Creating proposal", async () => {
                  const pda = proposalPda(wallet.publicKey!, proposalId);
                  return program!.methods
                    .createProposal(new BN(proposalId), title.trim())
                    .accounts({
                      creator: wallet.publicKey!,
                      proposal: pda,
                      systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                })
              }
            >
              Create (Draft)
            </button>
          )}
          {canActivate && (
            <button
              className="action"
              disabled={busy}
              onClick={() =>
                run("Activating", async () => {
                  const pda = proposalPda(wallet.publicKey!, proposalId);
                  return program!.methods.activate().accounts({ creator: wallet.publicKey!, proposal: pda }).rpc();
                })
              }
            >
              Activate
            </button>
          )}
          {canVote && (
            <>
              <button
                className="action"
                disabled={busy}
                onClick={() =>
                  run("Voting yes", async () => {
                    const pda = proposalPda(creator, proposalId);
                    return program!.methods
                      .vote(true)
                      .accounts({
                        voter: wallet.publicKey!,
                        proposal: pda,
                        voteRecord: votePda(pda, wallet.publicKey!),
                        systemProgram: SystemProgram.programId,
                      })
                      .rpc();
                  })
                }
              >
                Vote Yes
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  run("Voting no", async () => {
                    const pda = proposalPda(creator, proposalId);
                    return program!.methods
                      .vote(false)
                      .accounts({
                        voter: wallet.publicKey!,
                        proposal: pda,
                        voteRecord: votePda(pda, wallet.publicKey!),
                        systemProgram: SystemProgram.programId,
                      })
                      .rpc();
                  })
                }
              >
                Vote No
              </button>
            </>
          )}
          {canClose && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                run("Closing", async () => {
                  const pda = proposalPda(wallet.publicKey!, proposalId);
                  return program!.methods.close().accounts({ creator: wallet.publicKey!, proposal: pda }).rpc();
                })
              }
            >
              Close
            </button>
          )}
        </div>
        {status && <div className={"status " + status.kind}>{status.text}</div>}
      </div>
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
          <VotingPanel />
        </Modal>
      </Wall>
    </Conn>
  );
}
