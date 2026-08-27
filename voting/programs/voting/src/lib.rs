pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Gbfuc9mEzKx2oY5HycvF17HGMmMHEeXrvnKvdMiexWYv");

#[program]
pub mod voting {
    use super::*;

    pub fn create_proposal(ctx: Context<CreateProposal>, id: u64, title: String) -> Result<()> {
        crate::instructions::create_proposal::handle_create_proposal(ctx, id, title)
    }

    pub fn activate(ctx: Context<Activate>) -> Result<()> {
        crate::instructions::activate::handle_activate(ctx)
    }

    pub fn vote(ctx: Context<Vote>, yes: bool) -> Result<()> {
        crate::instructions::vote::handle_vote(ctx, yes)
    }

    pub fn close(ctx: Context<CloseProposal>) -> Result<()> {
        crate::instructions::close::handle_close(ctx)
    }
}
