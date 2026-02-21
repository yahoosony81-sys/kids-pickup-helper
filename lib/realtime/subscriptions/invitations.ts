import { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import { subscribeToPostgresChanges } from "../core";
import { getInvitationChannel } from "../channels";
import { InvitationPayload } from "../types";
import { Database } from "@/database.types";

/**
 * PRD Rule: invitations | INSERT | requester_id=me
 * 요청자: 새 초대 수신 알림 및 목록 표시용
 */
export const subscribeToRequesterInvitations = (
    userId: string,
    handler: (payload: RealtimePostgresChangesPayload<InvitationPayload>) => void,
    client?: SupabaseClient<Database>
) => {
    const channelName = getInvitationChannel(userId);

    return subscribeToPostgresChanges<InvitationPayload>(
        channelName,
        {
            event: "*",
            schema: "public",
            table: "invitations",
            filter: `requester_profile_id=eq.${userId}`,
        },
        handler,
        client
    );
};

/**
 * PRD Rule: invitations | INSERT/UPDATE | provider_id=me
 * 제공자: 보낸 초대 목록 실시간 반영
 */
export const subscribeToProviderInvitations = (
    userId: string,
    handler: (payload: RealtimePostgresChangesPayload<InvitationPayload>) => void,
    client?: SupabaseClient<Database>
) => {
    const channelName = getInvitationChannel(userId);

    return subscribeToPostgresChanges<InvitationPayload>(
        channelName,
        {
            event: "*", // INSERT, UPDATE 모두 감시
            schema: "public",
            table: "invitations",
            filter: `provider_profile_id=eq.${userId}`,
        },
        handler,
        client
    );
};

/**
 * 특정 Trip에 포함된 초대의 상태 변경 구독
 * (인원 수 변화 감지 등 공통 용도)
 */
export const subscribeToTripInvitations = (
    tripId: string,
    handler: (payload: RealtimePostgresChangesPayload<InvitationPayload>) => void,
    client?: SupabaseClient<Database>
) => {
    return subscribeToPostgresChanges<InvitationPayload>(
        `trip-invitations-${tripId}`,
        {
            event: "UPDATE",
            schema: "public",
            table: "invitations",
            filter: `trip_id=eq.${tripId}`,
        },
        handler,
        client
    );
};
