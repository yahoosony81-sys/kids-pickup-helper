import { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import { subscribeToPostgresChanges } from "../core";
import { getRequestsGroupChannel, getPickupRequestChannel, getMyRequestsChannel } from "../channels";
import { PickupRequestPayload } from "../types";
import { Database } from "@/database.types";

/**
 * PRD Rule: pickup_requests | INSERT | N/A (Global or Group)
 * 제공자: 새로운 요청 등록 즉시 반영
 */
export const subscribeToNewPickupRequests = (
    handler: (payload: RealtimePostgresChangesPayload<PickupRequestPayload>) => void,
    groupId: string = "global",
    client?: SupabaseClient<Database>
) => {
    const channelName = getRequestsGroupChannel(groupId);

    return subscribeToPostgresChanges<PickupRequestPayload>(
        channelName,
        {
            event: "INSERT",
            schema: "public",
            table: "pickup_requests",
        },
        handler,
        client
    );
};

/**
 * PRD Rule: pickup_requests | UPDATE | progress_stage 변경
 * 특정 요청의 상태 변경 구독
 */
export const subscribeToPickupRequestStatus = (
    requestId: string,
    handler: (payload: RealtimePostgresChangesPayload<PickupRequestPayload>) => void,
    client?: SupabaseClient<Database>
) => {
    const channelName = getPickupRequestChannel(requestId);

    return subscribeToPostgresChanges<PickupRequestPayload>(
        channelName,
        {
            event: "UPDATE",
            schema: "public",
            table: "pickup_requests",
            filter: `id=eq.${requestId}`,
        },
        handler,
        client
    );
};

/**
 * 내 픽업 요청들의 상태 변경 구독
 */
export const subscribeToMyPickupRequests = (
    profileId: string,
    handler: (payload: RealtimePostgresChangesPayload<PickupRequestPayload>) => void,
    client?: SupabaseClient<Database>
) => {
    const channelName = getMyRequestsChannel(profileId);
    return subscribeToPostgresChanges<PickupRequestPayload>(
        channelName,
        {
            event: "UPDATE",
            schema: "public",
            table: "pickup_requests",
            filter: `requester_profile_id=eq.${profileId}`,
        },
        handler,
        client
    );
};
