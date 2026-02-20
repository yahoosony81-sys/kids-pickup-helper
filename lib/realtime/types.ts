// Basic payload types for Realtime events

export interface MessagePayload {
    [key: string]: any; // TODO: Define specific message fields (id, content, sender_id, created_at, etc.)
}

export interface RideStatusPayload {
    [key: string]: any; // TODO: Define specific ride status fields (status, vehicle_location, etc.)
}

export interface InvitationPayload {
    [key: string]: any; // TODO: Define specific invitation fields (id, status, type, etc.)
}
