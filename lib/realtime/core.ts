import { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../supabase/client';
import { Database } from '@/database.types';

export interface SubscriptionResult {
    channel: RealtimeChannel;
    unsubscribe: () => Promise<'ok' | 'timed out' | 'error'>;
}

/**
 * createClientRealtime
 * 기본 supabase 클라이언트를 반환하거나 전달받은 클라이언트를 그대로 반환합니다.
 * (Clerk 연동 클라이언트 등을 통합 관리하기 위함)
 */
export const createClientRealtime = (
    client: SupabaseClient<Database> = defaultSupabase as any
): SupabaseClient<Database> => {
    return client;
};

/**
 * subscribeToChannel
 * 특정 테이블의 변화를 감지하는 채널을 생성하고 구독합니다.
 * PRD 요구사항에 따라 1개 채널 당 1개의 subscribe를 권장하므로 channelName을 명시적으로 관리합니다.
 */
export const subscribeToChannel = <T extends Record<string, any>>(
    channelName: string,
    options: {
        event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
        table: string;
        filter?: string;
        schema?: string;
    },
    handler: (payload: RealtimePostgresChangesPayload<T>) => void,
    client: SupabaseClient<Database> = defaultSupabase as any
): SubscriptionResult => {
    const supabase = createClientRealtime(client);
    const channel = supabase.channel(channelName);

    const filterBase = {
        event: options.event,
        schema: options.schema || 'public',
        table: options.table,
        filter: options.filter,
    };

    channel.on('postgres_changes' as any, filterBase as any, handler);
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Subscribed to ${channelName}`);
        }
    });

    return {
        channel,
        unsubscribe: () => channel.unsubscribe(),
    };
};

/**
 * Legacy: For backward compatibility with existing code
 */
export const subscribeToPostgresChanges = subscribeToChannel;
export const createChannel = (name: string, client?: any) => createClientRealtime(client).channel(name);
