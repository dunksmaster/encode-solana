import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateSigner,
  percentAmount,
} from '@metaplex-foundation/umi';
import {
  createNft,
  verifyCollectionV1,
  findMetadataPda,
  findMasterEditionPda,
  fetchDigitalAsset,
} from '@metaplex-foundation/mpl-token-metadata';
import { createDevnetUmi } from './umi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const META_DIR = resolve(ROOT, 'metadata');
const CONFIG_PATH = resolve(ROOT, 'config', 'collection.devnet.json');

type Attr = { trait_type: string; value: string };
type MetaJson = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Attr[];
};

function loadMeta(file: string): MetaJson {
  return JSON.parse(readFileSync(resolve(META_DIR, file), 'utf8')) as MetaJson;
}

/** Devnet Irys uploads are not on arweave.net; use the Irys gateway. */
function toPublicUri(uri: string): string {
  const m = uri.match(/^(?:https?:\/\/)?(?:www\.)?arweave\.net\/(.+)$/i);
  if (m) return `https://gateway.irys.xyz/${m[1]}`;
  return uri;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function uploadMeta(
  umi: ReturnType<typeof createDevnetUmi>,
  meta: MetaJson,
  label: string
): Promise<string> {
  console.log(`Uploading metadata for ${label} via Irys (devnet)...`);
  const rawUri = await umi.uploader.uploadJson(meta);
  const uri = toPublicUri(rawUri);
  console.log(`  URI: ${uri}`);
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${uri}`);
  const fetched = (await res.json()) as MetaJson;
  if (!fetched?.name || !fetched?.image) {
    throw new Error(`Uploaded JSON missing name/image for ${label}`);
  }
  return uri;
}

async function confirmFinalized(
  umi: ReturnType<typeof createDevnetUmi>,
  mintStr: string
) {
  for (let i = 0; i < 20; i++) {
    try {
      await fetchDigitalAsset(umi, mintStr as never);
      // Prefer waiting a bit for RPC to settle before verify on public devnet
      if (i >= 2) return;
    } catch {
      // not ready
    }
    await sleep(1500);
  }
}

async function verifyWithRetry(
  umi: ReturnType<typeof createDevnetUmi>,
  mintPk: ReturnType<typeof generateSigner>['publicKey'],
  collectionMintPk: ReturnType<typeof generateSigner>['publicKey']
) {
  const metadata = findMetadataPda(umi, { mint: mintPk });
  const collectionMetadata = findMetadataPda(umi, { mint: collectionMintPk });
  const collectionMasterEdition = findMasterEditionPda(umi, {
    mint: collectionMintPk,
  });

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      // Ensure member metadata is readable and has collection set
      const asset = await fetchDigitalAsset(umi, mintPk);
      const coll = asset.metadata.collection;
      if (coll.__option !== 'Some') {
        throw new Error('collection field not set on member metadata yet');
      }
      await verifyCollectionV1(umi, {
        metadata,
        collectionMint: collectionMintPk,
        collectionMetadata,
        collectionMasterEdition,
        authority: umi.identity,
      }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });
      return;
    } catch (e) {
      lastErr = e;
      console.warn(`  verify attempt ${attempt} failed: ${(e as Error).message?.slice(0, 120)}`);
      await sleep(2000 * attempt);
    }
  }
  throw lastErr;
}

async function main() {
  const umi = createDevnetUmi();
  console.log('Signer:', umi.identity.publicKey.toString());
  console.log('Cluster: devnet');

  const collectionMeta = loadMeta('collection.json');
  const memberFiles = ['member-1.json', 'member-2.json', 'member-3.json'];
  const memberMetas = memberFiles.map(loadMeta);

  const collectionUri = await uploadMeta(umi, collectionMeta, 'collection');
  const memberUris: string[] = [];
  for (let i = 0; i < memberMetas.length; i++) {
    memberUris.push(await uploadMeta(umi, memberMetas[i], `member-${i + 1}`));
  }

  const collectionMint = generateSigner(umi);
  console.log('\nCreating collection NFT...');
  await createNft(umi, {
    mint: collectionMint,
    name: collectionMeta.name,
    symbol: collectionMeta.symbol,
    uri: collectionUri,
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
  }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });
  console.log('Collection mint:', collectionMint.publicKey.toString());
  await confirmFinalized(umi, collectionMint.publicKey.toString());

  type MemberOut = {
    name: string;
    mint: string;
    uri: string;
    verified: boolean;
  };
  const members: MemberOut[] = [];
  const memberMints: ReturnType<typeof generateSigner>[] = [];

  // Create all members first (devnet verify-right-after-create is flaky)
  for (let i = 0; i < memberMetas.length; i++) {
    const meta = memberMetas[i];
    const mint = generateSigner(umi);
    memberMints.push(mint);
    console.log(`\nCreating member NFT #${i + 1}: ${meta.name}...`);
    await createNft(umi, {
      mint,
      name: meta.name,
      symbol: meta.symbol,
      uri: memberUris[i],
      sellerFeeBasisPoints: percentAmount(0),
      collection: {
        key: collectionMint.publicKey,
        verified: false,
      },
    }).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });
    console.log(`Member #${i + 1} mint: ${mint.publicKey.toString()}`);
  }

  console.log('\nVerifying collection membership...');
  await sleep(3000);
  for (let i = 0; i < memberMints.length; i++) {
    const mint = memberMints[i];
    console.log(`Verifying member #${i + 1}...`);
    await verifyWithRetry(umi, mint.publicKey, collectionMint.publicKey);
    const asset = await fetchDigitalAsset(umi, mint.publicKey);
    const coll = asset.metadata.collection;
    const verified =
      coll.__option === 'Some' &&
      coll.value.verified === true &&
      coll.value.key.toString() === collectionMint.publicKey.toString();
    console.log(`  verified=${verified}`);
    members.push({
      name: memberMetas[i].name,
      mint: mint.publicKey.toString(),
      uri: memberUris[i],
      verified,
    });
  }

  const config = {
    cluster: 'devnet',
    rpc: 'https://api.devnet.solana.com',
    collection: {
      name: collectionMeta.name,
      mint: collectionMint.publicKey.toString(),
      uri: collectionUri,
    },
    members,
    explorerBase: 'https://explorer.solana.com',
    createdAt: new Date().toISOString(),
  };

  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log('\nSaved config:', CONFIG_PATH);
  console.log(JSON.stringify(config, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
