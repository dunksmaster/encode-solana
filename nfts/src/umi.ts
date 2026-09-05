import { readFileSync } from 'node:fs';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity } from '@metaplex-foundation/umi';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';

export const WALLET_PATH =
  process.env.SOLANA_KEYPAIR ||
  '/home/gigabyte/.config/solana/id.json';

export const RPC_URL = 'https://api.devnet.solana.com';

/** Create a Umi instance on Solana devnet with the local keypair signer. */
export function createDevnetUmi() {
  const umi = createUmi(RPC_URL)
    .use(mplTokenMetadata())
    .use(
      irysUploader({
        // Solana + Irys (formerly Bundlr) on devnet
        address: 'https://devnet.irys.xyz',
        providerUrl: RPC_URL,
      })
    );

  const secret = JSON.parse(readFileSync(WALLET_PATH, 'utf8')) as number[];
  const keypair = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(secret));
  umi.use(keypairIdentity(keypair));
  return umi;
}
