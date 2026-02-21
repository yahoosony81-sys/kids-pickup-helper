import { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import { subscribeToPostgresChanges } from "../core";
import { getTripChannel } from "../channels";
import { TripPayload } from "../types";
import { Database } from "@/database.types";

/**
 * PRD Rule: trips | UPDATE | accepted_count / status 변경
 * 상단 요약 패널, 인원 수 표시 화면 즉시 갱신
 */
export const subscribeToTripChanges = (
    tripId: string,
    handler: (payload: RealtimePostgresChangesPayload<TripPayload>) => void,
    client?: SupabaseClient<Database>
) => {
    const channelName = getTripChannel(tripId);

    return subscribeToPostgresChanges<TripPayload>(
        channelName,
        {
            event: "UPDATE",
            schema: "public",
            table: "trips",
            filter: `id=eq.${tripId}`,
        },
        handler,
        client
    );
};

/**
 * 내 픽업 제공(Trips)의 상태 변경 구독
 */
export const subscribeToMyTrips = (
    profileId: string,
    handler: (payload: RealtimePostgresChangesPayload<TripPayload>) => void,
    client?: SupabaseClient<Database>
) => {
    return subscribeToPostgresChanges<TripPayload>(
        `my-trips-${profileId}`,
        {
            event: "UPDATE",
            schema: "public",
            table: "trips",
            filter: `provider_profile_id=eq.${profileId}`,
        },
        handler,
        client
    );
};
