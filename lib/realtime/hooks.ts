import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { SubscriptionResult } from './core';

export interface UseRealtimeSubscriptionOptions<T extends Record<string, any>> {
    onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
    onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
    onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
    onError?: (error: Error) => void;
    client?: SupabaseClient<Database>;
}

/**
 * 컴포넌트 생명주기에 맞춰 실시간 구독을 관리하는 커스텀 훅
 */
export function useRealtimeSubscription<T extends Record<string, any>>(
    subscribeFn: (
        handler: (payload: RealtimePostgresChangesPayload<T>) => void,
        client?: SupabaseClient<Database>
    ) => SubscriptionResult,
    options: UseRealtimeSubscriptionOptions<T> = {}
) {
    const [status, setStatus] = useState<'INITIAL' | 'SUBSCRIBED' | 'ERROR'>('INITIAL');

    // 이벤트 핸들러들을 ref로 관리하여 subscribeFn이 변경되지 않도록 함
    const handlersRef = useRef(options);
    handlersRef.current = options;

    useEffect(() => {
        const handler = (payload: RealtimePostgresChangesPayload<T>) => {
            console.log(`[Realtime Event] ${payload.table}:${payload.eventType}`, payload);

            switch (payload.eventType) {
                case 'INSERT':
                    handlersRef.current.onInsert?.(payload);
                    break;
                case 'UPDATE':
                    handlersRef.current.onUpdate?.(payload);
                    break;
                case 'DELETE':
                    handlersRef.current.onDelete?.(payload);
                    break;
            }
        };

        try {
            const { unsubscribe } = subscribeFn(handler, options.client);
            setStatus('SUBSCRIBED');

            return () => {
                unsubscribe().then(() => {
                    console.log('[Realtime] Unsubscribed successfully');
                });
            };
        } catch (err) {
            console.error('[Realtime Subscription Error]', err);
            setStatus('ERROR');
            options.onError?.(err as Error);
        }
    }, [subscribeFn, options.client]);

    return { status };
}
