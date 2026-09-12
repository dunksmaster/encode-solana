import { NavLink } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import DevnetBadge from "./DevnetBadge";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/list", label: "List" },
  { to: "/mine", label: "Mine" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <div className="shell-header">
        <div className="brand">
          <h1>Encode Marketplace</h1>
          <span className="sub">Week 6 · Option 2 · fixed-price NFT desk</span>
        </div>
        <div className="header-actions">
          <DevnetBadge />
          <WalletMultiButton />
        </div>
      </div>
      <nav className="nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
