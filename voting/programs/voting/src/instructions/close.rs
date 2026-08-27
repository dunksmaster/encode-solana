use anchor_lang::prelude::*;

use crate::{error::VotingError, state::{Proposal, ProposalState}};

#[derive(Accounts)]
pub struct CloseProposal<'info> {
    pub creator: Signer<'info>,
    #[account(
        mut,
        has_one = creator @ VotingError::Unauthorized
    )]
    pub proposal: Account<'info, Proposal>,
}

pub fn handle_close(ctx: Context<CloseProposal>) -> Result<()> {
    require!(ctx.accounts.proposal.state == ProposalState::Active, VotingError::NotActive);
    ctx.accounts.proposal.state = ProposalState::Closed;
    Ok(())
}
