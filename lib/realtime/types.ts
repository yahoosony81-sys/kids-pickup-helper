import { Database } from "@/database.types";

export type MessagePayload = Database["public"]["Tables"]["pickup_messages"]["Row"];
export type TripPayload = Database["public"]["Tables"]["trips"]["Row"];
export type InvitationPayload = Database["public"]["Tables"]["invitations"]["Row"];
export type PickupRequestPayload = Database["public"]["Tables"]["pickup_requests"]["Row"];
