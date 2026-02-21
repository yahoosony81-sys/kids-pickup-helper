"use client";

import { useState, useCallback } from "react";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Building2 } from "lucide-react";
import { InviteButton } from "@/components/invitations/invite-button";
import { useRealtimeSubscription, subscribeToNewPickupRequests, PickupRequestPayload } from "@/lib/realtime";
import { extractAreaFromAddress, detectDestinationType } from "@/lib/utils/address";

interface AvailablePickupRequestsListProps {
    tripId: string;
    isTripLocked: boolean;
    initialRequests: any[];
    tripScheduledStartAt: string | null;
}

const destinationTypeConfig: Record<
    string,
    { label: string; icon: typeof Building2; className: string }
> = {
    학원: { label: "학원", icon: Building2, className: "text-blue-600" },
    학교: { label: "학교", icon: Building2, className: "text-green-600" },
    집: { label: "집", icon: Building2, className: "text-orange-600" },
    기타: { label: "기타", icon: Building2, className: "text-gray-600" },
};

export function AvailablePickupRequestsList({
    tripId,
    isTripLocked,
    initialRequests,
    tripScheduledStartAt,
}: AvailablePickupRequestsListProps) {
    const [requests, setRequests] = useState<any[]>(initialRequests);
    const supabase = useClerkSupabaseClient();

    // 시간 포맷팅 헬퍼
    const formatTimeLabel = (pickupTime: string) => {
        const date = new Date(pickupTime);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return hours < 12
            ? `오전 ${hours === 0 ? 12 : hours}시${minutes > 0 ? ` ${minutes}분` : ""}`
            : `오후 ${hours === 12 ? 12 : hours - 12}시${minutes > 0 ? ` ${minutes}분` : ""}`;
    };

    // raw 데이터를 UI용 데이터로 변환
    const transformRequest = (raw: PickupRequestPayload) => {
        const originArea = extractAreaFromAddress(raw.origin_text);
        const destinationArea = extractAreaFromAddress(raw.destination_text);
        const destinationType = detectDestinationType(raw.destination_text);

        return {
            id: raw.id,
            pickup_time: formatTimeLabel(raw.pickup_time),
            pickup_time_raw: raw.pickup_time,
            origin_area: originArea,
            destination_area: destinationArea,
            destination_type: destinationType,
            hasPendingInvite: false, // 신규 요청은 초대가 없는 상태로 시작
            status: raw.status,
        };
    };

    // 날짜 일치 확인 로직
    const isDateMatch = (requestDateStr: string) => {
        if (!tripScheduledStartAt) return false;
        const tripDate = new Date(tripScheduledStartAt).toISOString().split("T")[0];
        const requestDate = new Date(requestDateStr).toISOString().split("T")[0];
        return tripDate === requestDate;
    };

    // Realtime 구독 (PRD Rule: pickup_requests | INSERT)
    useRealtimeSubscription<PickupRequestPayload>(
        useCallback(
            (handler, client) => subscribeToNewPickupRequests(handler, "global", client),
            []
        ),
        {
            client: supabase,
            onInsert: (payload) => {
                const raw = payload.new as PickupRequestPayload;
                if (raw.status === 'REQUESTED') {
                    setRequests(prev => [transformRequest(raw), ...prev]);
                }
            },
            onUpdate: (payload) => {
                const raw = payload.new as PickupRequestPayload;
                if (raw.status !== 'REQUESTED') {
                    setRequests(prev => prev.filter(r => r.id !== raw.id));
                } else {
                    setRequests(prev => prev.map(r => r.id === raw.id ? { ...r, ...transformRequest(raw) } : r));
                }
            }
        }
    );

    if (requests.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6 text-center py-12">
                    <p className="text-muted-foreground mb-4">현재 초대 가능한 요청자가 없습니다.</p>
                    <p className="text-sm text-muted-foreground">새로운 픽업 요청이 등록되면 여기에 표시됩니다.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <p className="text-sm text-muted-foreground">총 {requests.length}개의 요청이 있습니다.</p>
                <p className="text-xs text-muted-foreground mt-1">정확한 주소와 좌표는 초대 수락 후에만 공개됩니다.</p>
            </div>

            {requests.map((request) => {
                const destinationTypeInfo = destinationTypeConfig[request.destination_type] || destinationTypeConfig["기타"];
                const DestinationIcon = destinationTypeInfo.icon;
                const match = isDateMatch(request.pickup_time_raw || request.pickup_time);

                return (
                    <Card key={request.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {request.pickup_time}
                                    </CardTitle>
                                    <CardDescription className="mt-2 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-3 w-3" />
                                            <span>출발지: {request.origin_area}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DestinationIcon className={`h-3 w-3 ${destinationTypeInfo.className}`} />
                                            <span>목적지: {request.destination_area} ({destinationTypeInfo.label})</span>
                                        </div>
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <InviteButton
                                tripId={tripId}
                                pickupRequestId={request.id}
                                isTripLocked={isTripLocked}
                                hasPendingInvite={request.hasPendingInvite}
                                isDateMatch={match}
                            />
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
