use anchor_lang::prelude::*;

use crate::{error::VotingError, state::{Proposal, ProposalState}};

#[derive(Accounts)]
pub struct Activate<'info> {
    pub creator: Signer<'info>,
    #[account(
        mut,
        has_one = creator @ VotingError::Unauthorized
    )]
    pub proposal: Account<'info, Proposal>,
}

pub fn handle_activate(ctx: Context<Activate>) -> Result<()> {
    require!(ctx.accounts.proposal.state == ProposalState::Draft, VotingError::NotDraft);
    ctx.accounts.proposal.state = ProposalState::Active;
    Ok(())
}
