
import { createDevnetUmi } from './umi.js';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchDigitalAsset, findMetadataPda, verifyCollectionV1 } from '@metaplex-foundation/mpl-token-metadata';

const umi = createDevnetUmi();
const mint = publicKey('FUrWYw3tUHdtNDWDA7zUR1dAXM4k7uboRBN1Qix53aB4');
const collectionMint = publicKey('F23dujTCazyiuTq8MnrMVZ657Xvr8F6uTA6BE95E8s6o');
const asset = await fetchDigitalAsset(umi, mint);
console.log(JSON.stringify({
  name: asset.metadata.name,
  collection: asset.metadata.collection,
  uri: asset.metadata.uri,
}, null, 2));

const metadata = findMetadataPda(umi, { mint });
console.log('Trying verify now...');
await verifyCollectionV1(umi, {
  metadata,
  collectionMint,
  authority: umi.identity,
}).sendAndConfirm(umi, { confirm: { commitment: 'finalized' } });
const asset2 = await fetchDigitalAsset(umi, mint);
console.log('After verify:', JSON.stringify(asset2.metadata.collection, null, 2));
