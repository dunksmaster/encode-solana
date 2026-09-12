import * as anchor from "@anchor-lang/core";
import { Program, AnchorError, BN } from "@anchor-lang/core";
import { Marketplace } from "../target/types/marketplace";
import { assert } from "chai";
import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, label = "rpc"): Promise<T> {
  let last: unknown;
  for (let i = 0; i < 8; i++) {
    try {
      return await fn();
    } catch (e: any) {
      last = e;
      const msg = String(e?.message ?? e);
      if (
        !msg.includes("429") &&
        !msg.includes("Too Many") &&
        !msg.includes("fetch failed")
      ) {
        throw e;
      }
      const wait = 2000 * (i + 1);
      console.log("retry " + label + " after " + wait + "ms");
      await sleep(wait);
    }
  }
  throw last;
}

function listingPda(
  program: Program<Marketplace>,
  seller: PublicKey,
  mint: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), seller.toBuffer(), mint.toBuffer()],
    program.programId
  );
}

async function fund(provider: anchor.AnchorProvider, to: PublicKey) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: to,
      lamports: 2 * LAMPORTS_PER_SOL,
    })
  );
  await withRetry(() => provider.sendAndConfirm(tx), "fund");
}

async function expectFail(fn: () => Promise<unknown>, code: string) {
  try {
    await fn();
    assert.fail("expected transaction to fail");
  } catch (err: any) {
    const msg =
      err instanceof AnchorError ? err.error.errorCode.code : String(err);
    assert.include(msg, code, "expected " + code + ", got " + msg);
  }
}

async function ensureAta(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false
) {
  const ata = getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve);
  const info = await withRetry(
    () => provider.connection.getAccountInfo(ata),
    "ataInfo"
  );
  if (!info) {
    const ix = createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      ata,
      owner,
      mint
    );
    await withRetry(
      () => provider.sendAndConfirm(new Transaction().add(ix)),
      "createAta"
    );
  }
  return ata;
}

describe("marketplace", function () {
  this.timeout(400_000);
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.marketplace as Program<Marketplace>;
  const connection = provider.connection;
  const payer = provider.wallet as anchor.Wallet;

  const seller = Keypair.generate();
  const buyer = Keypair.generate();
  const stranger = Keypair.generate();

  const price = new BN(10_000_000); // 0.01 SOL

  before(async () => {
    await fund(provider, seller.publicKey);
    await fund(provider, buyer.publicKey);
    await fund(provider, stranger.publicKey);
    console.log("program", program.programId.toBase58());
    console.log("seller", seller.publicKey.toBase58());
    console.log("buyer", buyer.publicKey.toBase58());
  });

  async function createNft(owner: PublicKey) {
    const mint = await withRetry(
      () => createMint(connection, payer.payer, payer.publicKey, null, 0),
      "createMint"
    );
    const ata = await ensureAta(provider, mint, owner);
    await withRetry(
      () => mintTo(connection, payer.payer, mint, ata, payer.publicKey, 1),
      "mintTo"
    );
    return { mint, ata };
  }

  async function doList(mint: PublicKey, sellerAta: PublicKey) {
    const [listing, bump] = listingPda(program, seller.publicKey, mint);
    const vault = getAssociatedTokenAddressSync(mint, listing, true);
    await withRetry(
      () =>
        program.methods
          .listNft(price)
          .accounts({
            seller: seller.publicKey,
            mint,
            sellerAta,
            listing,
            vault,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([seller])
          .rpc(),
      "listNft"
    );
    return { listing, vault, bump };
  }

  async function doBuy(
    mint: PublicKey,
    listing: PublicKey,
    vault: PublicKey,
    buyerAta: PublicKey
  ) {
    await withRetry(
      () =>
        program.methods
          .buyNft()
          .accounts({
            buyer: buyer.publicKey,
            seller: seller.publicKey,
            mint,
            listing,
            vault,
            buyerAta,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc(),
      "buyNft"
    );
  }

  async function doCancel(mint: PublicKey, listing: PublicKey, vault: PublicKey) {
    const sellerAta = getAssociatedTokenAddressSync(mint, seller.publicKey);
    await withRetry(
      () =>
        program.methods
          .cancelListing()
          .accounts({
            seller: seller.publicKey,
            mint,
            listing,
            sellerAta,
            vault,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([seller])
          .rpc(),
      "cancelListing"
    );
  }

  it("List then Buy: buyer gets NFT, seller gets SOL, vault closes", async () => {
    const { mint, ata: sellerAta } = await createNft(seller.publicKey);
    const buyerAta = await ensureAta(provider, mint, buyer.publicKey);

    const { listing, vault, bump } = await doList(mint, sellerAta);

    const vaultBefore = await withRetry(() => getAccount(connection, vault), "vault");
    assert.equal(vaultBefore.amount.toString(), "1");
    assert.ok(vaultBefore.owner.equals(listing), "vault authority must be listing PDA");

    const acct = await withRetry(() => program.account.listing.fetch(listing), "listing");
    assert.ok(acct.seller.equals(seller.publicKey));
    assert.ok(acct.mint.equals(mint));
    assert.equal(acct.price.toString(), price.toString());
    assert.equal(acct.bump, bump);
    assert.isTrue(acct.isActive);

    const sellerAtaAfterList = await withRetry(
      () => getAccount(connection, sellerAta),
      "sellerAta"
    );
    assert.equal(sellerAtaAfterList.amount.toString(), "0");

    const sellerLamportsBefore = await connection.getBalance(seller.publicKey);
    const buyerLamportsBefore = await connection.getBalance(buyer.publicKey);
    const buyerAtaBefore = await withRetry(
      () => getAccount(connection, buyerAta),
      "buyerAta"
    );

    await doBuy(mint, listing, vault, buyerAta);

    const buyerAtaAfter = await withRetry(
      () => getAccount(connection, buyerAta),
      "buyerAta2"
    );
    assert.equal(
      (buyerAtaAfter.amount - buyerAtaBefore.amount).toString(),
      "1"
    );

    const sellerLamportsAfter = await connection.getBalance(seller.publicKey);
    const buyerLamportsAfter = await connection.getBalance(buyer.publicKey);
    assert.equal(
      buyerLamportsBefore - buyerLamportsAfter,
      price.toNumber(),
      "buyer must pay exact listed lamports (fee payer is the provider)"
    );
    assert.isAtLeast(
      sellerLamportsAfter - sellerLamportsBefore,
      price.toNumber(),
      "seller must receive at least the listed price (plus rent returns)"
    );

    assert.isNull(await withRetry(() => connection.getAccountInfo(vault), "vaultClosed"));
    await expectFail(() => program.account.listing.fetch(listing), "Account does not exist");
  });

  it("Buy with no pre-existing buyer ATA: buyer_ata is created in the same tx", async () => {
    const { mint, ata: sellerAta } = await createNft(seller.publicKey);
    const { listing, vault } = await doList(mint, sellerAta);

    // Deliberately do NOT call ensureAta() first — buyer has never held this mint.
    const buyerAta = getAssociatedTokenAddressSync(mint, buyer.publicKey);
    const preInfo = await withRetry(
      () => connection.getAccountInfo(buyerAta),
      "buyerAtaMissing"
    );
    assert.isNull(preInfo, "test setup: buyer_ata must not exist yet");

    await doBuy(mint, listing, vault, buyerAta);

    const buyerAtaAfter = await withRetry(
      () => getAccount(connection, buyerAta),
      "buyerAtaCreated"
    );
    assert.equal(buyerAtaAfter.amount.toString(), "1");
    assert.ok(buyerAtaAfter.owner.equals(buyer.publicKey));
  });

  it("List then Cancel: seller recovers NFT, listing closes", async () => {
    const { mint, ata: sellerAta } = await createNft(seller.publicKey);
    const { listing, vault } = await doList(mint, sellerAta);

    const sellerAtaBefore = await withRetry(
      () => getAccount(connection, sellerAta),
      "sellerAta"
    );
    assert.equal(sellerAtaBefore.amount.toString(), "0");

    await doCancel(mint, listing, vault);

    const sellerAtaAfter = await withRetry(
      () => getAccount(connection, sellerAta),
      "sellerAta2"
    );
    assert.equal(sellerAtaAfter.amount.toString(), "1");
    assert.isNull(await withRetry(() => connection.getAccountInfo(vault), "vault2"));
    await expectFail(() => program.account.listing.fetch(listing), "Account does not exist");
  });

  it("Double-buy fails", async () => {
    const { mint, ata: sellerAta } = await createNft(seller.publicKey);
    const buyerAta = await ensureAta(provider, mint, buyer.publicKey);
    const { listing, vault } = await doList(mint, sellerAta);
    await doBuy(mint, listing, vault, buyerAta);
    await expectFail(() => doBuy(mint, listing, vault, buyerAta), "AccountNotInitialized");
  });

  it("Buy after cancel fails", async () => {
    const { mint, ata: sellerAta } = await createNft(seller.publicKey);
    const buyerAta = await ensureAta(provider, mint, buyer.publicKey);
    const { listing, vault } = await doList(mint, sellerAta);
    await doCancel(mint, listing, vault);
    await expectFail(() => doBuy(mint, listing, vault, buyerAta), "AccountNotInitialized");
  });

  it("non-seller cancel fails", async () => {
    const { mint, ata: sellerAta } = await createNft(seller.publicKey);
    const { listing, vault } = await doList(mint, sellerAta);
    const strangerAta = await ensureAta(provider, mint, stranger.publicKey);

    await expectFail(
      () =>
        program.methods
          .cancelListing()
          .accounts({
            seller: stranger.publicKey,
            mint,
            listing,
            sellerAta: strangerAta,
            vault,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([stranger])
          .rpc(),
      "ConstraintSeeds"
    );

    const stillOpen = await withRetry(
      () => program.account.listing.fetch(listing),
      "listingStillOpen"
    );
    assert.isTrue(stillOpen.isActive);
    const vaultStill = await withRetry(() => getAccount(connection, vault), "vaultStill");
    assert.equal(vaultStill.amount.toString(), "1");

    await doCancel(mint, listing, vault);
  });

  it("wrong mint from buyer fails", async () => {
    const { mint, ata: sellerAta } = await createNft(seller.publicKey);
    const wrong = await createNft(seller.publicKey);
    const buyerAta = await ensureAta(provider, mint, buyer.publicKey);
    const { listing, vault } = await doList(mint, sellerAta);

    await expectFail(
      () =>
        program.methods
          .buyNft()
          .accounts({
            buyer: buyer.publicKey,
            seller: seller.publicKey,
            mint: wrong.mint,
            listing,
            vault,
            buyerAta,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc(),
      "ConstraintTokenMint"
    );

    const stillOpen = await withRetry(
      () => program.account.listing.fetch(listing),
      "listingWrongMint"
    );
    assert.isTrue(stillOpen.isActive);

    await doCancel(mint, listing, vault);
  });
});
