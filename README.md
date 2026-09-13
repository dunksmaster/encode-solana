# encode-solana

Dorian Kane — Encode Solana Developer Course (6 weeks). All programs on **Solana Devnet**.

Progress log: [WHERE-WE-ARE.md](WHERE-WE-ARE.md).

---

## Week 6 capstone — Option 2 NFT Marketplace (submit this)

**Graders do not need Superdesign / Figma / any design canvas.**  
The shippable UI is the React app under `marketplace/frontend/` (purple theme is already in the code).

### Run the desk (5 minutes)

```bash
cd marketplace/frontend
npm install
npm run dev
```

1. Open the URL Vite prints (usually `http://localhost:5173`).
2. Phantom → **Devnet**.
3. Connect a wallet with a little Devnet SOL.
4. List / Buy / Cancel against the **already deployed** program — no local validator, no Anchor build.

| | |
| --- | --- |
| Program (Devnet) | [`DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2`](https://explorer.solana.com/address/DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2?cluster=devnet) |
| Full runbook + Explorer txs | [marketplace/README.md](marketplace/README.md) |
| Submit checklist | [docs/capstone/CAPSTONE-SUBMIT-CHECKLIST.md](docs/capstone/CAPSTONE-SUBMIT-CHECKLIST.md) |

**Listing note:** the catalog shows Exercise 10 mints. You can only List a mint your wallet already owns on Devnet. If you own none, still review Explorer proofs in the marketplace README (real list / buy / cancel txs).

---

## Earlier weeks

See [WHERE-WE-ARE.md](WHERE-WE-ARE.md) for Week 1–5 program IDs (`hello-solana/`, `counter/`, `tokens/`, `voting/`, `tip-jar/`, `escrow/`, `defi-quotes/`, `nfts/`).
