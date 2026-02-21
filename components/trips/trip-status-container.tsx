"use client";

import { useState, useCallback } from "react";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, Clock, Calendar, AlertCircle } from "lucide-react";
import { useRealtimeSubscription, subscribeToTripChanges, TripPayload } from "@/lib/realtime";
import { formatDateTime } from "@/lib/utils";
import type { Database } from "@/database.types";

type Trip = Database['public']['Tables']['trips']['Row'];

const statusConfig: Record<string, { label: string; className: string }> = {
    OPEN: { label: "오픈", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    IN_PROGRESS: { label: "진행중", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    ARRIVED: { label: "도착", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    COMPLETED: { label: "완료", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    CANCELLED: { label: "취소됨", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    EXPIRED: { label: "기간 만료", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
};

type TripWithCount = Trip & { accepted_count?: number };

interface TripStatusContainerProps {
    initialTrip: Trip;
    tripId: string;
    participantCount: number;
}

export function TripStatusContainer({
    initialTrip,
    tripId,
    participantCount: initialParticipantCount,
}: TripStatusContainerProps) {
    const [trip, setTrip] = useState<TripWithCount>(initialTrip);
    const [error, setError] = useState<string | null>(null);
    const supabase = useClerkSupabaseClient();

    // Realtime 구독 (PRD Rule: trips | UPDATE | accepted_count / status 변경)
    const { status: subStatus } = useRealtimeSubscription<TripPayload>(
        useCallback(
            (handler, client) => subscribeToTripChanges(tripId, handler, client),
            [tripId]
        ),
        {
            client: supabase,
            onUpdate: (payload) => {
                const updated = payload.new as TripWithCount;
                console.log("✅ [Realtime] trip 업데이트 수신:", updated);
                setTrip(prev => ({ ...prev, ...updated }));
                setError(null);
            },
            onError: () => setError("실시간 연결에 문제가 발생했습니다."),
        }
    );

    const statusInfo = statusConfig[trip.status] || {
        label: trip.status,
        className: "bg-gray-100 text-gray-800",
    };

    const currentAcceptedCount = trip.accepted_count ?? initialParticipantCount;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl">픽업제공 상세</CardTitle>
                        <CardDescription className="mt-1">
                            픽업제공 #{trip.id.slice(0, 8)}
                        </CardDescription>
                    </div>
                    <span className={`px-3 py-1 rounded-md text-sm font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">수용 인원:</span>
                            <span className="font-medium">
                                {currentAcceptedCount} / {trip.capacity}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            {trip.is_locked ? (
                                <>
                                    <Lock className="h-4 w-4 text-yellow-600" />
                                    <span className="text-yellow-600 font-medium">LOCK됨</span>
                                </>
                            ) : (
                                <>
                                    <Lock className="h-4 w-4 text-green-600" />
                                    <span className="text-green-600 font-medium">UNLOCK</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {trip.start_at && (
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">출발 시간:</span>
                        <span className="font-medium">{formatDateTime(trip.start_at)}</span>
                    </div>
                )}

                {trip.arrived_at && (
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">도착 시간:</span>
                        <span className="font-medium">{formatDateTime(trip.arrived_at)}</span>
                    </div>
                )}

                {error && (
                    <div className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
