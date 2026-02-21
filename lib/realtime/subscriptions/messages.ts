import { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import { subscribeToPostgresChanges } from "../core";
import { getMessageChannel } from "../channels";
import { MessagePayload } from "../types";
import { Database } from "@/database.types";

/**
 * PRD Rule: messages:room-{invite_id}
 */
export const subscribeToMessages = (
    inviteId: string,
    handler: (payload: RealtimePostgresChangesPayload<MessagePayload>) => void,
    client?: SupabaseClient<Database>
) => {
    const channelName = getMessageChannel(inviteId);

    return subscribeToPostgresChanges<MessagePayload>(
        channelName,
        {
            event: "INSERT",
            schema: "public",
            table: "pickup_messages",
            filter: `invite_id=eq.${inviteId}`,
        },
        handler,
        client
    );
};
