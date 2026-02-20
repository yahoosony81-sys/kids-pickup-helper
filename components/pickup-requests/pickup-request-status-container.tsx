/**
 * @file components/pickup-requests/pickup-request-status-container.tsx
 * @description 픽업 요청 상태 실시간 업데이트 Container (Client Component)
 * 
 * 주요 기능:
 * 1. Supabase Realtime으로 pickup_requests 상태 구독
 * 2. progress_stage 실시간 업데이트 (STARTED → PICKED_UP → ARRIVED)
 * 3. 상태 배지, 진행 타임라인, 메시지 버튼, 취소 버튼 렌더링
 * 
 * 핵심 구현 로직:
 * - Server Component에서 초기 데이터를 props로 받음
 * - Client Component에서 useState로 상태 관리
 * - useEffect로 Realtime 구독 (컴포넌트 마운트 시)
 * - DB 변경 감지 시 setState로 즉시 UI 업데이트
 * - 컴포넌트 언마운트 시 구독 해제
 * 
 * @dependencies
 * - @supabase/supabase-js: Realtime 구독
 * - useState, useEffect: 상태 관리 및 사이드 이펙트
 */

'use client';

import { useState, useEffect } from 'react';
import { useClerkSupabaseClient } from '@/lib/supabase/clerk-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { MessageSquare, X, AlertCircle } from 'lucide-react';
import { CancelRequestButton } from '@/components/pickup-requests/cancel-request-button';
import { PickupProgressTimeline } from '@/components/my/pickup-progress-timeline';
import type { Database } from '@/database.types';

type PickupRequest = Database['public']['Tables']['pickup_requests']['Row'];

// 상태별 배지 스타일
const statusConfig: Record<
    string,
    { label: string; className: string }
> = {
    REQUESTED: { label: '요청됨', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    MATCHED: { label: '매칭됨', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    CANCEL_REQUESTED: { label: '취소 요청됨', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
    IN_PROGRESS: { label: '진행중', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    ARRIVED: { label: '도착', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    COMPLETED: { label: '완료', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    CANCELLED: { label: '취소됨', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    EXPIRED: { label: '픽업시간 지남', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

interface PickupRequestStatusContainerProps {
    initialRequest: PickupRequest;
    requestId: string;
    tripId: string | null;
    acceptedInvitationId: string | null;
    unreadCount: number;
}

export function PickupRequestStatusContainer({
    initialRequest,
    requestId,
    tripId,
    acceptedInvitationId,
    unreadCount: initialUnreadCount,
}: PickupRequestStatusContainerProps) {
    // 상태 관리
    const [request, setRequest] = useState<PickupRequest>(initialRequest);
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = useClerkSupabaseClient();

    // Realtime 구독
    useEffect(() => {
        console.log('🔄 [PickupRequestStatusContainer] Realtime 구독 시작', { requestId });

        const channel = supabase
            .channel(`pickup_request:${requestId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'pickup_requests',
                    filter: `id=eq.${requestId}`,
                },
                (payload) => {
                    console.log('✅ [Realtime] pickup_requests 업데이트 수신:', payload.new);
                    const newRequest = payload.new as PickupRequest;
                    console.log('🔄 [Realtime] 변경된 progress_stage:', newRequest.progress_stage);
                    setRequest(newRequest);
                    setError(null);
                }
            )
            .subscribe((status) => {
                console.log('📡 [Realtime] 구독 상태:', status);
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                    setError(null);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ [Realtime] 채널 에러');
                    setIsConnected(false);
                    setError('실시간 연결이 끊어졌습니다. 새로고침이 필요할 수 있습니다.');
                } else if (status === 'TIMED_OUT') {
                    console.error('❌ [Realtime] 연결 시간 초과');
                    setIsConnected(false);
                    setError('연결 시간이 초과되었습니다.');
                } else if (status === 'CLOSED') {
                    setIsConnected(false);
                }
            });

        return () => {
            console.log('🔌 [PickupRequestStatusContainer] Realtime 구독 해제');
            supabase.removeChannel(channel);
        };
    }, [requestId, supabase]);

    // 상태 정보
    const statusInfo = statusConfig[request.status] || {
        label: request.status,
        className: 'bg-gray-100 text-gray-800',
    };
    const isExpired = request.status === 'EXPIRED';

    // 진행 상태 표시 여부
    const showProgress =
        !isExpired &&
        request.status !== 'CANCELLED' &&
        (request.status === 'MATCHED' ||
            request.status === 'IN_PROGRESS' ||
            request.status === 'COMPLETED');

    return (
        <>
            {/* 연결 상태 표시 */}
            {error && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                {error}
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                재연결을 시도하고 있습니다. 페이지를 새로고침하면 최신 상태를 확인할 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 실시간 연결 상태 표시 (개발 모드) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 text-xs text-muted-foreground">
                    Realtime: {isConnected ? '🟢 연결됨' : '🔴 연결 안 됨'}
                </div>
            )}

            {/* 상태 배지 (헤더에 표시되므로 여기서는 생략 가능) */}

            {/* 메시지 버튼 */}
            {acceptedInvitationId && tripId && !isExpired && (
                <div className="mb-6">
                    <Button asChild variant="outline" className="w-full relative">
                        <Link href={`/trips/${tripId}/messages/${acceptedInvitationId}`}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            메시지 작성
                            {unreadCount > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="ml-2 h-5 min-w-5 px-1.5 text-xs"
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Badge>
                            )}
                        </Link>
                    </Button>
                </div>
            )}

            {/* 진행 상태 표시 */}
            {showProgress && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-xl">픽업 진행 상태</CardTitle>
                        <CardDescription className="mt-1">
                            픽업 서비스의 현재 진행 상황입니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PickupProgressTimeline
                            progressStage={request.progress_stage}
                            tripId={tripId || undefined}
                            originLat={request.origin_lat}
                            originLng={request.origin_lng}
                            originText={request.origin_text}
                            destinationLat={request.destination_lat}
                            destinationLng={request.destination_lng}
                            destinationText={request.destination_text}
                        />
                    </CardContent>
                </Card>
            )}

            {/* 취소 버튼 */}
            {!isExpired && (
                <div className="mb-6">
                    {/* 취소 가능한 경우 (REQUESTED, MATCHED) 취소 페이지로 이동 */}
                    {(request.status === 'REQUESTED' || request.status === 'MATCHED') && (
                        <Button asChild variant="destructive" className="w-full">
                            <Link href={`/pickup-requests/${request.id}/cancel`}>
                                <X className="mr-2 h-4 w-4" />
                                취소하기
                            </Link>
                        </Button>
                    )}
                    {/* 기존 취소 요청 버튼 (CANCEL_REQUESTED 상태용) */}
                    {request.status !== 'REQUESTED' && request.status !== 'MATCHED' && (
                        <CancelRequestButton
                            pickupRequestId={request.id}
                            status={request.status}
                            pickupTime={request.pickup_time}
                        />
                    )}
                </div>
            )}
        </>
    );
}
