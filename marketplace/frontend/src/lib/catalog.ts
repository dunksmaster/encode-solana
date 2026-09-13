/**
 * Exercise 10 demo catalog (constitution FR-008). Name/image are local demo
 * art (not on-chain Metaplex/Irys metadata) so the desk doesn't look empty —
 * real metadata can replace `image` later without touching any other file.
 *
 * Default List-page UX only — first entry is the seeded Devnet test mint
 * the demo wallet owns. The on-chain program accepts any mint the seller's
 * ATA holds (amount >= 1). Graders can paste any Devnet mint they own;
 * InvalidNft is ownership, not "not in this catalog".
 */
import devnetTestImg from "../assets/nft/devnet-test.png";
import member1Img from "../assets/nft/member1.png";
import member2Img from "../assets/nft/member2.png";
import member3Img from "../assets/nft/member3.png";
import mysteryB8caImg from "../assets/nft/mystery-b8ca.png";
import mysteryHvtyImg from "../assets/nft/mystery-hvty.png";

export type CatalogEntry = {
  mint: string;
  name: string;
  image?: string;
};

export const COLLECTION = "DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd";

export const CATALOG: CatalogEntry[] = [
  { mint: "2SkyZmpZZ8D7RttFpM2zBNJV8N38es1p1ZPJSAeW7PVY", name: "Devnet test NFT (owned — list this)", image: devnetTestImg },
  { mint: "9MJyuTGDjdTmFGueYCJMtuBrMYu4JRHMCEhLrke4XfrQ", name: "Encode Member #1", image: member1Img },
  { mint: "YA936cqURpMGpZLNsWp9492B3DUwTUhFQ4hynEfKjUJ", name: "Encode Member #2", image: member2Img },
  { mint: "3t7ao1ar14m8gU7n7EECfwgRWwoMEKLa3S8XNtCdMAEp", name: "Encode Member #3", image: member3Img },
  { mint: "B8CA2sJHL8bHvLHtiUDoyL3BaQdKGvVmQxkiEBZdXyn8", name: "Encode Member #4", image: mysteryB8caImg },
  { mint: "HVtyG8AKV7HiLhsZhoN9VUb14nteJ2JHVHJkJMwVVkk5", name: "Encode Member #5", image: mysteryHvtyImg },
];
