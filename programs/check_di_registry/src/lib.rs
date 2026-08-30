use anchor_lang::prelude::*;

declare_id!("9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi");

pub const GENESIS_HASH: [u8; 32] = [0; 32];

#[program]
pub mod check_di_registry {
    use super::*;

    pub fn initialize_batch(
        ctx: Context<InitializeBatch>,
        batch_hash: [u8; 32],
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let registry = &mut ctx.accounts.registry;

        registry.authority = ctx.accounts.authority.key();
        registry.batch_hash = batch_hash;
        registry.last_event_hash = GENESIS_HASH;
        registry.event_count = 0;
        registry.status = RegistryStatus::Active;
        registry.created_at = now;
        registry.updated_at = now;
        registry.bump = ctx.bumps.registry;

        emit!(BatchInitialized {
            registry: registry.key(),
            authority: registry.authority,
            batch_hash,
            created_at: now,
        });

        Ok(())
    }

    pub fn append_event(
        ctx: Context<AppendEvent>,
        event_hash: [u8; 32],
        previous_event_hash: [u8; 32],
        organization_hash: [u8; 32],
        version: u32,
        occurred_at: i64,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let registry = &mut ctx.accounts.registry;

        require!(
            registry.status == RegistryStatus::Active,
            RegistryError::BatchNotActive
        );
        require!(version > 0, RegistryError::InvalidVersion);
        require!(
            registry.last_event_hash == previous_event_hash,
            RegistryError::PreviousHashMismatch
        );
        require!(
            event_hash != GENESIS_HASH,
            RegistryError::InvalidEventHash
        );

        let event = &mut ctx.accounts.event;
        event.registry = registry.key();
        event.authority = ctx.accounts.authority.key();
        event.organization = ctx.accounts.organization.key();
        event.event_hash = event_hash;
        event.previous_event_hash = previous_event_hash;
        event.organization_hash = organization_hash;
        event.version = version;
        event.status = RegistryStatus::Active;
        event.occurred_at = occurred_at;
        event.anchored_at = now;
        event.bump = ctx.bumps.event;

        registry.last_event_hash = event_hash;
        registry.event_count = registry
            .event_count
            .checked_add(1)
            .ok_or(RegistryError::EventCountOverflow)?;
        registry.updated_at = now;

        emit!(EventAnchored {
            registry: registry.key(),
            event: event.key(),
            event_hash,
            previous_event_hash,
            organization: event.organization,
            organization_hash,
            version,
            occurred_at,
            anchored_at: now,
        });

        Ok(())
    }

    pub fn set_event_status(
        ctx: Context<SetEventStatus>,
        new_status: RegistryStatus,
    ) -> Result<()> {
        require!(
            new_status == RegistryStatus::Revoked || new_status == RegistryStatus::Superseded,
            RegistryError::InvalidStatusTransition
        );

        let event = &mut ctx.accounts.event;
        require!(
            event.status == RegistryStatus::Active,
            RegistryError::EventNotActive
        );

        event.status = new_status;
        let changed_at = Clock::get()?.unix_timestamp;

        emit!(EventStatusChanged {
            registry: event.registry,
            event: event.key(),
            event_hash: event.event_hash,
            status: new_status,
            changed_at,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(batch_hash: [u8; 32])]
pub struct InitializeBatch<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + BatchRegistry::INIT_SPACE,
        seeds = [b"batch", authority.key().as_ref(), batch_hash.as_ref()],
        bump
    )]
    pub registry: Account<'info, BatchRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(event_hash: [u8; 32])]
pub struct AppendEvent<'info> {
    #[account(
        mut,
        has_one = authority @ RegistryError::UnauthorizedAuthority
    )]
    pub registry: Account<'info, BatchRegistry>,

    #[account(
        init,
        payer = authority,
        space = 8 + EventProof::INIT_SPACE,
        seeds = [b"event", registry.key().as_ref(), event_hash.as_ref()],
        bump
    )]
    pub event: Account<'info, EventProof>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub organization: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetEventStatus<'info> {
    #[account(has_one = authority @ RegistryError::UnauthorizedAuthority)]
    pub registry: Account<'info, BatchRegistry>,

    #[account(
        mut,
        constraint = event.registry == registry.key() @ RegistryError::EventRegistryMismatch,
        constraint = event.authority == authority.key() @ RegistryError::UnauthorizedAuthority
    )]
    pub event: Account<'info, EventProof>,

    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct BatchRegistry {
    pub authority: Pubkey,
    pub batch_hash: [u8; 32],
    pub last_event_hash: [u8; 32],
    pub event_count: u32,
    pub status: RegistryStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EventProof {
    pub registry: Pubkey,
    pub authority: Pubkey,
    pub organization: Pubkey,
    pub event_hash: [u8; 32],
    pub previous_event_hash: [u8; 32],
    pub organization_hash: [u8; 32],
    pub version: u32,
    pub status: RegistryStatus,
    pub occurred_at: i64,
    pub anchored_at: i64,
    pub bump: u8,
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Copy,
    Debug,
    InitSpace,
    PartialEq,
    Eq,
)]
pub enum RegistryStatus {
    Active,
    Revoked,
    Superseded,
}

#[event]
pub struct BatchInitialized {
    pub registry: Pubkey,
    pub authority: Pubkey,
    pub batch_hash: [u8; 32],
    pub created_at: i64,
}

#[event]
pub struct EventAnchored {
    pub registry: Pubkey,
    pub event: Pubkey,
    pub organization: Pubkey,
    pub event_hash: [u8; 32],
    pub previous_event_hash: [u8; 32],
    pub organization_hash: [u8; 32],
    pub version: u32,
    pub occurred_at: i64,
    pub anchored_at: i64,
}

#[event]
pub struct EventStatusChanged {
    pub registry: Pubkey,
    pub event: Pubkey,
    pub event_hash: [u8; 32],
    pub status: RegistryStatus,
    pub changed_at: i64,
}

#[error_code]
pub enum RegistryError {
    #[msg("Batch registry is not active")]
    BatchNotActive,
    #[msg("Previous event hash does not match the registry head")]
    PreviousHashMismatch,
    #[msg("Event hash cannot be the genesis zero hash")]
    InvalidEventHash,
    #[msg("Version must be greater than zero")]
    InvalidVersion,
    #[msg("Event count overflow")]
    EventCountOverflow,
    #[msg("Only active events can change lifecycle status")]
    EventNotActive,
    #[msg("Event status can only transition to revoked or superseded")]
    InvalidStatusTransition,
    #[msg("Authority does not control this registry")]
    UnauthorizedAuthority,
    #[msg("Event belongs to a different batch registry")]
    EventRegistryMismatch,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn genesis_hash_is_zeroed() {
        assert_eq!(GENESIS_HASH, [0; 32]);
    }

    #[test]
    fn terminal_event_statuses_are_distinct() {
        assert_ne!(RegistryStatus::Revoked, RegistryStatus::Superseded);
        assert_ne!(RegistryStatus::Active, RegistryStatus::Revoked);
    }
}
