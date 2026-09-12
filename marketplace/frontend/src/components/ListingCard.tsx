import { Link } from "react-router-dom";
import type { CatalogEntry } from "../lib/catalog";

export default function ListingCard({
  id,
  entry,
  priceSol,
  seller,
}: {
  /** Listing PDA address (base58) — the route id, per data-model.md. */
  id: string;
  entry: CatalogEntry;
  priceSol: string;
  seller: string;
}) {
  return (
    <Link to={"/listing/" + id} className="card listing-card" style={{ textDecoration: "none" }}>
      <div className="media">no image (stub)</div>
      <div className="name">{entry.name}</div>
      <div className="price">{priceSol} SOL</div>
      <div className="seller">{seller}</div>
    </Link>
  );
}
