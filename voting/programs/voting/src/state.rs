use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ProposalState {
    Draft,
    Active,
    Closed,
}

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub creator: Pubkey,
    pub id: u64,
    #[max_len(64)]
    pub title: String,
    pub state: ProposalState,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub voted_yes: bool,
    pub bump: u8,
}
