import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { subscribeToPostgresChanges } from "../core";
import { getMessageChannel } from "../channels";
import { Database } from "@/database.types";

export type MessagePayload = Database["public"]["Tables"]["pickup_messages"]["Row"];

export const subscribeToMessages = (
    roomId: string,
    handler: (payload: RealtimePostgresChangesPayload<MessagePayload>) => void
) => {
    const channelName = getMessageChannel(roomId);

    return subscribeToPostgresChanges<MessagePayload>(
        channelName,
        {
            event: "INSERT",
            schema: "public",
            table: "pickup_messages",
            filter: `invite_id=eq.${roomId}`,
        },
        handler
    );
};
