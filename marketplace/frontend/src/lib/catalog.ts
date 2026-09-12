/**
 * Exercise 10 demo catalog (constitution FR-008). Stub metadata only —
 * real name/image are read from Metaplex/Irys once list/buy wiring lands.
 */
export type CatalogEntry = {
  mint: string;
  name: string;
};

export const COLLECTION = "DFqN7fj7pXJkdD7vEBTC8YU6CqDcC1b4YpoV6EUtGjUd";

export const CATALOG: CatalogEntry[] = [
  { mint: "9MJyuTGDjdTmFGueYCJMtuBrMYu4JRHMCEhLrke4XfrQ", name: "Encode Member #1" },
  { mint: "YA936cqURpMGpZLNsWp9492B3DUwTUhFQ4hynEfKjUJ", name: "Encode Member #2" },
  { mint: "3t7ao1ar14m8gU7n7EECfwgRWwoMEKLa3S8XNtCdMAEp", name: "Encode Member #3" },
];
