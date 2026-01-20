-- Drop the unique index that prevents requesters from receiving multiple pending invitations
-- This allows parents (requesters) to receive multiple invitations from different providers
-- so they can review profiles and choose the best option

DROP INDEX IF EXISTS idx_invitations_unique_pending_requester;
