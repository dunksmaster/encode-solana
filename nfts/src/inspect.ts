
import { createDevnetUmi } from './umi.js';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchDigitalAsset, findMetadataPda, findMasterEditionPda } from '@metaplex-foundation/mpl-token-metadata';

const umi = createDevnetUmi();
const collectionMint = publicKey('F23dujTCazyiuTq8MnrMVZ657Xvr8F6uTA6BE95E8s6o');
const asset = await fetchDigitalAsset(umi, collectionMint);
console.log(JSON.stringify({
  name: asset.metadata.name,
  collectionDetails: asset.metadata.collectionDetails,
  collection: asset.metadata.collection,
  tokenStandard: asset.metadata.tokenStandard,
  mint: asset.publicKey,
  edition: asset.edition ? { isOriginal: asset.edition.isOriginal, publicKey: asset.edition.publicKey } : null,
  metadataPda: findMetadataPda(umi, { mint: collectionMint }),
  masterEditionPda: findMasterEditionPda(umi, { mint: collectionMint }),
}, null, 2));
