import { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../supabase/client';
import { Database } from '@/database.types';

export interface SubscriptionResult {
    channel: RealtimeChannel;
    unsubscribe: () => Promise<'ok' | 'timed out' | 'error'>;
}

/**
 * Creates a new Realtime channel with the given name.
 */
export const createChannel = (
    name: string,
    client: SupabaseClient<Database> = defaultSupabase as any
): RealtimeChannel => {
    return client.channel(name);
};

/**
 * Helper to subscribe to Postgres changes on a specific channel.
 * Returns the channel instance and an unsubscribe function for cleanup.
 */
export const subscribeToPostgresChanges = <T extends Record<string, any>>(
    channelName: string,
    options: {
        event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
        schema: string;
        table: string;
        filter?: string;
    },
    handler: (payload: RealtimePostgresChangesPayload<T>) => void,
    client: SupabaseClient<Database> = defaultSupabase as any
): SubscriptionResult => {
    const channel = createChannel(channelName, client);

    const filterBase = {
        schema: options.schema,
        table: options.table,
        filter: options.filter,
    };

    switch (options.event) {
        case 'INSERT':
            channel.on('postgres_changes', { event: 'INSERT', ...filterBase }, handler);
            break;
        case 'UPDATE':
            channel.on('postgres_changes', { event: 'UPDATE', ...filterBase }, handler);
            break;
        case 'DELETE':
            channel.on('postgres_changes', { event: 'DELETE', ...filterBase }, handler);
            break;
        case '*':
            channel.on('postgres_changes', { event: '*', ...filterBase }, handler);
            break;
    }

    channel.subscribe();

    const unsubscribe = async () => {
        return channel.unsubscribe();
    };

    return { channel, unsubscribe };
};
