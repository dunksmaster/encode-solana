# Encode Week 5 Ex 8 - Escrow STATUS

**Program ID:** 4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr
**Cluster:** devnet
**Anchor:** 1.1.2 (classic SPL Token / Tokenkeg)
**Result:** 6/6 passing (2026-09-02 ~01:20 CEST)

## Tests
1. Make then Take: Alice gets B, Bob gets A, vault closes
2. Make then Cancel: Alice gets A back, escrow closes
3. Double-take fails
4. Take after cancel fails
5. non-maker cancel fails
6. wrong mint from taker fails (ConstraintAssociated)

## Key paths
- programs/escrow/src/lib.rs - make / take / cancel
- programs/escrow/Cargo.toml - anchor-spl 1.1.2 + idl-build
- Anchor.toml - programs.devnet + ts-mocha script
- tests/escrow.ts - deck cases (no airdrop; fund via SystemProgram.transfer)
- package.json, tsconfig.json

## Notes
- Escrow PDA seeds: [b"escrow", maker, id.to_le_bytes()]
- Vault = ATA(mint_a) with authority = escrow PDA
- Take stack overflow fixed by Box accounts; PDA seeds copy maker/id/bump before CPI
