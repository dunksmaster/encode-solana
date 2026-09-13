import type { CatalogEntry } from "./catalog";

/**
 * This program stores no on-chain metadata (no Metaplex Token Metadata
 * account) — `list_nft`/`buy_nft` only check `decimals == 0` and
 * `amount >= 1`. So a wallet-minted NFT has no name/image anywhere on
 * chain. We keep that name/image in this browser's localStorage, keyed by
 * mint, so NFTs created via /create render consistently across this app's
 * own pages. It will NOT show up in Phantom/Solscan with this art — only
 * inside this app, on this browser.
 */

const KEY_PREFIX = "encode-marketplace:nft-meta:";

export type LocalNftMeta = {
  name: string;
  image?: string;
};

export function getLocalMeta(mint: string): LocalNftMeta | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + mint);
    if (!raw) return null;
    return JSON.parse(raw) as LocalNftMeta;
  } catch {
    return null;
  }
}

export function setLocalMeta(mint: string, meta: LocalNftMeta): void {
  try {
    localStorage.setItem(KEY_PREFIX + mint, JSON.stringify(meta));
  } catch {
    // Storage full or unavailable (private browsing) — non-critical, skip.
  }
}

/** Catalog entry if known, else this browser's locally-created metadata, else a bare address fallback. */
export function resolveEntry(mint: string, catalog: CatalogEntry[]): CatalogEntry {
  const fromCatalog = catalog.find((c) => c.mint === mint);
  if (fromCatalog) return fromCatalog;
  const local = getLocalMeta(mint);
  if (local) return { mint, name: local.name, image: local.image };
  return { mint, name: mint.slice(0, 8) + "…" };
}

/** Downscale + re-encode an uploaded image so it fits comfortably in localStorage. */
export function readAndResizeImage(file: File, maxDim = 640, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a readable image."));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable in this browser."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
