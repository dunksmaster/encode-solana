use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer},
};

declare_id!("DqBMwxFR31d8M9QqNkFjhAXq8JAND4Gy5r1KTu2S5Zi2");

#[program]
pub mod marketplace {
    use super::*;

    pub fn list_nft(ctx: Context<ListNft>, price_lamports: u64) -> Result<()> {
        require!(price_lamports > 0, MarketplaceError::InvalidPrice);
        require!(ctx.accounts.mint.decimals == 0, MarketplaceError::InvalidNft);
        require!(ctx.accounts.seller_ata.amount >= 1, MarketplaceError::InvalidNft);

        let bump = ctx.bumps.listing;
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.mint = ctx.accounts.mint.key();
        listing.price = price_lamports;
        listing.bump = bump;
        listing.is_active = true;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.seller_ata.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            1,
        )?;

        Ok(())
    }

    pub fn buy_nft(ctx: Context<BuyNft>) -> Result<()> {
        require!(ctx.accounts.listing.is_active, MarketplaceError::ListingInactive);
        require!(ctx.accounts.vault.amount == 1, MarketplaceError::InvalidNft);
        require!(ctx.accounts.mint.decimals == 0, MarketplaceError::InvalidNft);

        // Owned copies before any CPI (account data may remap after invoke).
        let seller_key = ctx.accounts.listing.seller;
        let mint_key = ctx.accounts.listing.mint;
        let bump_seed = [ctx.accounts.listing.bump];
        let price = ctx.accounts.listing.price;

        let seeds: &[&[u8]] = &[
            b"listing",
            seller_key.as_ref(),
            mint_key.as_ref(),
            bump_seed.as_ref(),
        ];
        let signer = &[seeds];

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
            ),
            price,
        )?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.buyer_ata.to_account_info(),
                    authority: ctx.accounts.listing.to_account_info(),
                },
                signer,
            ),
            1,
        )?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            CloseAccount {
                account: ctx.accounts.vault.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            signer,
        ))?;

        Ok(())
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        require!(ctx.accounts.listing.is_active, MarketplaceError::ListingInactive);
        require_keys_eq!(
            ctx.accounts.listing.seller,
            ctx.accounts.seller.key(),
            MarketplaceError::Unauthorized
        );
        require!(ctx.accounts.vault.amount == 1, MarketplaceError::InvalidNft);

        let seller_key = ctx.accounts.listing.seller;
        let mint_key = ctx.accounts.listing.mint;
        let bump_seed = [ctx.accounts.listing.bump];

        let seeds: &[&[u8]] = &[
            b"listing",
            seller_key.as_ref(),
            mint_key.as_ref(),
            bump_seed.as_ref(),
        ];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.seller_ata.to_account_info(),
                    authority: ctx.accounts.listing.to_account_info(),
                },
                signer,
            ),
            1,
        )?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            CloseAccount {
                account: ctx.accounts.vault.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            signer,
        ))?;

        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub price: u64,
    pub bump: u8,
    pub is_active: bool,
}

#[derive(Accounts)]
pub struct ListNft<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    pub mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", seller.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub listing: Box<Account<'info, Listing>>,

    #[account(
        init,
        payer = seller,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyNft<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: receives listed SOL and rent; constrained by listing.seller
    #[account(mut, address = listing.seller)]
    pub seller: UncheckedAccount<'info>,

    pub mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        close = seller,
        seeds = [b"listing", listing.seller.as_ref(), listing.mint.as_ref()],
        bump = listing.bump,
        has_one = seller,
        has_one = mint,
        constraint = listing.is_active @ MarketplaceError::ListingInactive,
    )]
    pub listing: Box<Account<'info, Listing>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_ata: Box<Account<'info, TokenAccount>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    pub mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        close = seller,
        seeds = [b"listing", seller.key().as_ref(), mint.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
        has_one = mint,
        constraint = listing.is_active @ MarketplaceError::ListingInactive,
    )]
    pub listing: Box<Account<'info, Listing>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum MarketplaceError {
    #[msg("Price must be greater than zero lamports")]
    InvalidPrice,
    #[msg("Mint must be a 0-decimal NFT with amount 1")]
    InvalidNft,
    #[msg("Listing is not active")]
    ListingInactive,
    #[msg("Only the listing seller can cancel")]
    Unauthorized,
}
