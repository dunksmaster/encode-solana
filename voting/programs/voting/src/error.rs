use anchor_lang::prelude::*;

#[error_code]
pub enum VotingError {
    #[msg("Only the creator can activate or close this proposal")]
    Unauthorized,
    #[msg("Proposal is not in Draft")]
    NotDraft,
    #[msg("Proposal is not Active")]
    NotActive,
    #[msg("Proposal is already Closed")]
    AlreadyClosed,
    #[msg("Cannot vote while the proposal is in Draft")]
    VoteInDraft,
    #[msg("Cannot vote after the proposal is Closed")]
    VoteInClosed,
    #[msg("This wallet already voted on this proposal")]
    DuplicateVote,
    #[msg("Title must be 1 to 64 characters")]
    InvalidTitle,
}
