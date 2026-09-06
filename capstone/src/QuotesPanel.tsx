import { FRESHNESS_MAX_AGE_SECONDS } from "./quotes/config";
import { formatUsd, type QuoteSnapshot } from "./quotes/quote";

type Props = {
  snapshot: QuoteSnapshot | null;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
};

export function QuotesPanel({ snapshot, error, loading, onRefresh }: Props) {
  const pyth = snapshot?.pyth;
  const fresh = pyth?.fresh ?? false;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>Price quotes</h3>
        <button className="secondary" disabled={loading} onClick={onRefresh}>
          {loading ? "Refreshing…" : "Refresh quotes"}
        </button>
      </div>
      <p className="sub" style={{ marginBottom: "0.75rem" }}>
        Pyth SOL/USD (mainnet push account) vs Jupiter SOL→USDC. Quote only — no swap.
      </p>
      {error && <div className="status err">{error}</div>}
      {pyth && (
        <div className="kv">
          <span>Pyth SOL/USD</span>
          <span>
            ${formatUsd(pyth.price)} +/- ${formatUsd(pyth.conf)}
          </span>
          <span>Age</span>
          <span>{pyth.ageSeconds}s ago</span>
          <span>Freshness</span>
          <span>
            <span className={"badge " + (fresh ? "fresh" : "stale")}>
              {fresh ? "Fresh" : "Stale"}
            </span>{" "}
            ≤{FRESHNESS_MAX_AGE_SECONDS}s
          </span>
          <span>Source</span>
          <span>{pyth.source}</span>
        </div>
      )}
      {snapshot && (
        <div className="kv" style={{ marginTop: "0.85rem" }}>
          <span>Jupiter SOL/USDC</span>
          <span>${formatUsd(snapshot.jupiter.impliedPrice)} (for 1 SOL)</span>
          <span>Impact</span>
          <span>{snapshot.jupiter.priceImpactPct ?? "—"}%</span>
          <span>Spread vs Pyth</span>
          <span>
            {Math.abs(snapshot.spreadPct).toFixed(3)}% (
            {snapshot.spreadBps >= 0 ? "+" : ""}
            {snapshot.spreadBps.toFixed(1)} bps)
          </span>
        </div>
      )}
      {pyth && !fresh && (
        <p className="warn">
          Oracle stale ({pyth.ageSeconds}s &gt; {FRESHNESS_MAX_AGE_SECONDS}s). Take is disabled until a fresh Pyth update.
        </p>
      )}
    </div>
  );
}
