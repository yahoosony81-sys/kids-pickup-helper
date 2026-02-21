import { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import { subscribeToPostgresChanges } from "../core";
import { getInvitationChannel } from "../channels";
import { InvitationPayload } from "../types";
import { Database } from "@/database.types";

/**
 * 특정 요청(pickup_request)에 대한 초대 INSERT를 구독하는 유틸
 * PRD Rule 기반: invitations | INSERT | pickup_request_id=eq.{requestId}
 */
export const subscribeToRequestInvitations = (
    requestId: string,
    requesterId: string,
    handler: (payload: RealtimePostgresChangesPayload<InvitationPayload>) => void,
    client?: SupabaseClient<Database>
) => {
    // 채널 명명 규칙은 사용자 기준을 따르되 (de-duplication을 위해), 필터로 특정 요청을 좁힘
    const channelName = getInvitationChannel(requesterId);

    return subscribeToPostgresChanges<InvitationPayload>(
        channelName,
        {
            event: "INSERT",
            schema: "public",
            table: "invitations",
            filter: `pickup_request_id=eq.${requestId}`,
        },
        handler,
        client
    );
};
