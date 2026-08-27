use anchor_lang::prelude::*;

use crate::{constants::*, error::VotingError, state::{Proposal, ProposalState}};

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [PROPOSAL_SEED, creator.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_proposal(ctx: Context<CreateProposal>, id: u64, title: String) -> Result<()> {
    require!(!title.is_empty() && title.len() <= 64, VotingError::InvalidTitle);
    let proposal = &mut ctx.accounts.proposal;
    proposal.creator = ctx.accounts.creator.key();
    proposal.id = id;
    proposal.title = title;
    proposal.state = ProposalState::Draft;
    proposal.yes_votes = 0;
    proposal.no_votes = 0;
    proposal.bump = ctx.bumps.proposal;
    Ok(())
}
