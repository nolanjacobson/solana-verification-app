use anchor_lang::prelude::*;
use anchor_lang::accounts::account_loader::AccountLoader;
use std::str::FromStr;

declare_id!("EFCNdFXKnbcoHZJEQpmKrePsCYYPeMhPoAuAtaoPNy92");

pub const ANCHOR_DISCRIMINATOR: usize = 8;
pub const PUBKEY_SIZE: usize = 32;
pub const STRING_PREFIX_SIZE: usize = 4;
pub const BUMP_SIZE: usize = 1;

#[program]
pub mod newkycproject {
    use super::*;

    pub fn add_state(
        ctx: Context<AddState>,
        is_verified: u8,
        transaction_hash: [u8; 32],
        grade: u8
    ) -> Result<()> {
        let expected_program_owner =
        Pubkey::from_str("FVS8JXE4CGdNfMAmkYCCJeMGErdjNJX71c1iNfGcZomT")
            .map_err(|_| ProgramError::InvalidArgument)?;
        require_keys_eq!(ctx.accounts.program_owner.key(), expected_program_owner);

        msg!("user Intro Account Created");
        msg!("isVerified: {}", is_verified);

        let mut user_info = ctx.accounts.user_info.load_init()?;
        user_info.user = ctx.accounts.user.key();
        user_info.is_verified = is_verified;
        user_info.certicate_hash = transaction_hash;
        user_info.grade = grade;
        user_info.bump = ctx.bumps.user_info; // Directly access the bump


        // Log the serialized data for verification
        msg!("Serialized user: {:?}", user_info.user);
        msg!("Serialized is_verified: {}", user_info.is_verified);
        msg!("Serialized transaction_hash: {:?}", user_info.certicate_hash);
        msg!("Serialized grade: {}", user_info.grade);
        msg!("Serialized bump: {}", user_info.bump);

        Ok(())
    }

    pub fn update_state(
        ctx: Context<UpdateState>,
        is_verified: u8,
        transaction_hash: [u8; 32],
        grade: u8
    ) -> Result<()> {
        let expected_program_owner =
        Pubkey::from_str("FVS8JXE4CGdNfMAmkYCCJeMGErdjNJX71c1iNfGcZomT")
            .map_err(|_| ProgramError::InvalidArgument)?;
        require_keys_eq!(ctx.accounts.program_owner.key(), expected_program_owner);

        msg!("Updating user Intro Account");
        msg!("is_verified: {}", is_verified);
        // msg!("mtid: {}", mtid);

        let mut user_info = ctx.accounts.user_info.load_mut()?;
        user_info.user = ctx.accounts.user.key();
        user_info.is_verified = is_verified;
        user_info.certicate_hash = transaction_hash;
        user_info.grade = grade;

        Ok(())
    }

    pub fn close(_ctx: Context<Close>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(is_verified: u8, certificate_hash: [u8; 32], grade: u8)]
pub struct AddState<'info> {
    #[account(
        init,
        seeds = [user.key().as_ref()],
        bump,
        payer = program_owner,
        space = 8 + UserInfo::INIT_SPACE,
    )]
    pub user_info: AccountLoader<'info, UserInfo>,
    /// CHECK: This is not dangerous because we are only checking the key
    pub user: AccountInfo<'info>, // Ensure this is not marked as a Signer
    #[account(mut)]
    pub program_owner: Signer<'info>, // This should be the only signer
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(is_verified: u8, certificate_hash: [u8; 32], grade: u8)]
pub struct UpdateState<'info> {
    #[account(
        mut,
        seeds = [user.key().as_ref()],
        bump = user_info.load()?.bump,
        realloc = 8 + UserInfo::INIT_SPACE,
        realloc::payer = program_owner,  // Changed from user to program_owner
        realloc::zero = false,
    )]
    pub user_info: AccountLoader<'info, UserInfo>,
    /// CHECK: This is not dangerous because we are only checking the key
    pub user: AccountInfo<'info>,  // Removed mut
    /// CHECK: This is not dangerous because we are only checking the key
    #[account(mut)]
    pub program_owner: Signer<'info>,  // Changed to Signer and added mut
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(
        mut, 
        seeds = [user.key().as_ref()], 
        bump = user_info.load()?.bump, 
        close = user
    )]
    user_info: AccountLoader<'info, UserInfo>,
    #[account(mut)]
    user: Signer<'info>,
}

#[account(zero_copy)]
#[repr(C)]
#[derive(Default)]
pub struct UserInfo {
    pub user: Pubkey,          // 32 bytes
    pub is_verified: u8,       // 1 byte
    pub certicate_hash: [u8; 32], // 32 bytes
    pub grade: u8,             // 1 byte (changed from char)
    pub bump: u8,              // 1 byte
}

impl UserInfo {
    pub const INIT_SPACE: usize = 32 + 1 + 32 + 1 + 1; // Total: 67 bytes (updated)
}