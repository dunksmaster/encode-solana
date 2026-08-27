use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::VotingError,
    state::{Proposal, ProposalState, VoteRecord},
};

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [VOTE_SEED, proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    pub system_program: Program<'info, System>,
}

pub fn handle_vote(ctx: Context<Vote>, yes: bool) -> Result<()> {
    match ctx.accounts.proposal.state {
        ProposalState::Draft => return err!(VotingError::VoteInDraft),
        ProposalState::Closed => return err!(VotingError::VoteInClosed),
        ProposalState::Active => {}
    }

    let record = &mut ctx.accounts.vote_record;
    record.voter = ctx.accounts.voter.key();
    record.proposal = ctx.accounts.proposal.key();
    record.voted_yes = yes;
    record.bump = ctx.bumps.vote_record;

    if yes {
        ctx.accounts.proposal.yes_votes += 1;
    } else {
        ctx.accounts.proposal.no_votes += 1;
    }
    Ok(())
}
