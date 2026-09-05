use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer},
};

declare_id!("4oeN2qh93F6VFKrrQZ3R89HxRDwsyid26Jxyyq44KHTr");

#[program]
pub mod escrow {
    use super::*;

    pub fn make(
        ctx: Context<Make>,
        id: u64,
        deposit_amount: u64,
        receive_amount: u64,
    ) -> Result<()> {
        require!(deposit_amount > 0 && receive_amount > 0, EscrowError::InvalidAmount);

        let bump = ctx.bumps.escrow;
        let escrow = &mut ctx.accounts.escrow;
        escrow.maker = ctx.accounts.maker.key();
        escrow.mint_a = ctx.accounts.mint_a.key();
        escrow.mint_b = ctx.accounts.mint_b.key();
        escrow.deposit_amount = deposit_amount;
        escrow.receive_amount = receive_amount;
        escrow.id = id;
        escrow.bump = bump;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.maker_ata_a.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.maker.to_account_info(),
                },
            ),
            deposit_amount,
        )?;

        Ok(())
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        // Owned copies before any CPI (account data may remap after invoke).
        let maker_key = ctx.accounts.escrow.maker;
        let id_bytes = ctx.accounts.escrow.id.to_le_bytes();
        let bump_seed = [ctx.accounts.escrow.bump];
        let deposit_amount = ctx.accounts.escrow.deposit_amount;
        let receive_amount = ctx.accounts.escrow.receive_amount;

        let seeds: &[&[u8]] = &[
            b"escrow",
            maker_key.as_ref(),
            id_bytes.as_ref(),
            bump_seed.as_ref(),
        ];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.taker_ata_b.to_account_info(),
                    to: ctx.accounts.maker_ata_b.to_account_info(),
                    authority: ctx.accounts.taker.to_account_info(),
                },
            ),
            receive_amount,
        )?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.taker_ata_a.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer,
            ),
            deposit_amount,
        )?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            CloseAccount {
                account: ctx.accounts.vault.to_account_info(),
                destination: ctx.accounts.maker.to_account_info(),
                authority: ctx.accounts.escrow.to_account_info(),
            },
            signer,
        ))?;

        Ok(())
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.escrow.maker,
            ctx.accounts.maker.key(),
            EscrowError::Unauthorized
        );

        let maker_key = ctx.accounts.escrow.maker;
        let id_bytes = ctx.accounts.escrow.id.to_le_bytes();
        let bump_seed = [ctx.accounts.escrow.bump];
        let deposit_amount = ctx.accounts.escrow.deposit_amount;

        let seeds: &[&[u8]] = &[
            b"escrow",
            maker_key.as_ref(),
            id_bytes.as_ref(),
            bump_seed.as_ref(),
        ];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.maker_ata_a.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer,
            ),
            deposit_amount,
        )?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            CloseAccount {
                account: ctx.accounts.vault.to_account_info(),
                destination: ctx.accounts.maker.to_account_info(),
                authority: ctx.accounts.escrow.to_account_info(),
            },
            signer,
        ))?;

        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub maker: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub deposit_amount: u64,
    pub receive_amount: u64,
    pub id: u64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct Make<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    pub mint_a: Box<Account<'info, Mint>>,
    pub mint_b: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = maker,
    )]
    pub maker_ata_a: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = maker,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", maker.key().as_ref(), &id.to_le_bytes()],
        bump,
    )]
    pub escrow: Box<Account<'info, Escrow>>,

    #[account(
        init,
        payer = maker,
        associated_token::mint = mint_a,
        associated_token::authority = escrow,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Take<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    /// CHECK: receives mint_b and vault rent; constrained by escrow.maker / has_one
    #[account(mut, address = escrow.maker)]
    pub maker: UncheckedAccount<'info>,

    #[account(
        mut,
        close = maker,
        seeds = [b"escrow", escrow.maker.as_ref(), &escrow.id.to_le_bytes()],
        bump = escrow.bump,
        has_one = mint_a,
        has_one = mint_b,
        has_one = maker,
    )]
    pub escrow: Box<Account<'info, Escrow>>,

    pub mint_a: Box<Account<'info, Mint>>,
    pub mint_b: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = escrow,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = taker,
    )]
    pub taker_ata_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = taker,
    )]
    pub taker_ata_b: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = maker,
    )]
    pub maker_ata_b: Box<Account<'info, TokenAccount>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        mut,
        close = maker,
        seeds = [b"escrow", maker.key().as_ref(), &escrow.id.to_le_bytes()],
        bump = escrow.bump,
        has_one = maker,
        has_one = mint_a,
    )]
    pub escrow: Box<Account<'info, Escrow>>,

    pub mint_a: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = maker,
    )]
    pub maker_ata_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = escrow,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum EscrowError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid amount")]
    InvalidAmount,
}
