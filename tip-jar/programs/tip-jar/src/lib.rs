use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program::{invoke, invoke_signed},
    system_instruction,
};

declare_id!("F3ToLTqLcoBazVckKkNgy24D4BfiREQftff93cyn9BLE");

#[program]
pub mod tip_jar {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        require!(ctx.accounts.vault.lamports() == 0, TipJarError::AlreadyInitialized);

        let rent = Rent::get()?.minimum_balance(0);
        invoke(
            &system_instruction::transfer(ctx.accounts.owner.key, ctx.accounts.vault.key, rent),
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, TipJarError::InvalidAmount);
        invoke(
            &system_instruction::transfer(ctx.accounts.depositor.key, ctx.accounts.vault.key, amount),
            &[
                ctx.accounts.depositor.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, TipJarError::InvalidAmount);

        let rent = Rent::get()?.minimum_balance(0);
        let available = ctx
            .accounts
            .vault
            .lamports()
            .checked_sub(rent)
            .ok_or(TipJarError::InsufficientFunds)?;
        require!(available >= amount, TipJarError::InsufficientFunds);

        let bump = ctx.bumps.vault;
        let owner_key = ctx.accounts.owner.key();
        invoke_signed(
            &system_instruction::transfer(ctx.accounts.vault.key, ctx.accounts.owner.key, amount),
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[b"vault", owner_key.as_ref(), &[bump]]],
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: SOL vault PDA, system-owned, derived from the owner
    #[account(mut, seeds = [b"vault", owner.key().as_ref()], bump)]
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    /// CHECK: used only as a seed so anyone can tip this owner
    pub owner: UncheckedAccount<'info>,
    /// CHECK: SOL vault PDA, system-owned, derived from the owner
    #[account(mut, seeds = [b"vault", owner.key().as_ref()], bump)]
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: SOL vault PDA, system-owned, derived from the owner
    #[account(mut, seeds = [b"vault", owner.key().as_ref()], bump)]
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum TipJarError {
    #[msg("Vault already initialized")]
    AlreadyInitialized,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Not enough SOL in the vault above rent")]
    InsufficientFunds,
}
