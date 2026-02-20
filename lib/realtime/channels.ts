/**
 * Returns the channel name for a specific chat room.
 * Format: messages:room:{roomId}
 */
export const getMessageChannel = (roomId: string): string => `messages:room:${roomId}`;

/**
 * Returns the channel name for tracking a ride's status.
 * Format: ride-status:{rideId}
 */
export const getRideStatusChannel = (rideId: string): string => `ride-status:${rideId}`;

/**
 * Returns the channel name for a user's invitations.
 * Format: invitations:user:{userId}
 */
export const getInvitationChannel = (userId: string): string => `invitations:user:${userId}`;
