import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { createDevnetUmi } from './umi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, '..', 'config', 'collection.devnet.json');

type Attr = { trait_type: string; value: string | number };
type OffChain = {
  name?: string;
  image?: string;
  attributes?: Attr[];
};

type Config = {
  collection: { name: string; mint: string; uri: string };
  members: { name: string; mint: string; uri: string; verified: boolean }[];
};

async function printAsset(
  umi: ReturnType<typeof createDevnetUmi>,
  label: string,
  mintStr: string,
  fallbackUri?: string
) {
  const mint = publicKey(mintStr);
  const asset = await fetchDigitalAsset(umi, mint);
  const onChainName = asset.metadata.name;
  const uri = asset.metadata.uri || fallbackUri || '';
  let off: OffChain = {};
  try {
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    off = (await res.json()) as OffChain;
  } catch (e) {
    console.warn(`  (failed to download URI ${uri}: ${(e as Error).message})`);
  }

  const name = off.name || onChainName;
  const image = off.image || '(none)';
  const attrs = off.attributes || [];

  console.log(`\n=== ${label} ===`);
  console.log(`Mint: ${mintStr}`);
  console.log(`Name: ${name}`);
  console.log(`Image: ${image}`);
  console.log(`URI: ${uri}`);
  const coll = asset.metadata.collection;
  if (coll.__option === 'Some') {
    console.log(
      `Collection: ${coll.value.key.toString()} verified=${coll.value.verified}`
    );
  } else {
    console.log('Collection: (none / is parent collection)');
  }
  console.log('Attributes:');
  if (attrs.length === 0) {
    console.log('  (none)');
  } else {
    for (const a of attrs) {
      console.log(`  - ${a.trait_type}: ${a.value}`);
    }
  }
}

async function main() {
  const umi = createDevnetUmi();
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Config;

  console.log('Fetching collection items from config:', CONFIG_PATH);
  console.log('Signer:', umi.identity.publicKey.toString());

  await printAsset(
    umi,
    'COLLECTION',
    config.collection.mint,
    config.collection.uri
  );

  for (let i = 0; i < config.members.length; i++) {
    const m = config.members[i];
    await printAsset(umi, `MEMBER #${i + 1}`, m.mint, m.uri);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
