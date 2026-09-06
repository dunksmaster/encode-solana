/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_MAINNET_RPC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
