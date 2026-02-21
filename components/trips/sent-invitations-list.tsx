"use client";

import { useEffect, useState, useCallback } from "react";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { useRealtimeSubscription, subscribeToTripInvitations, InvitationPayload } from "@/lib/realtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Mail } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Database } from "@/database.types";

type Invitation = Database['public']['Tables']['invitations']['Row'] & {
    pickup_request?: {
        id: string;
        pickup_time: string;
        origin_text: string;
        destination_text: string;
    } | null;
};

interface SentInvitationsListProps {
    tripId: string;
    initialInvitations: Invitation[];
}

const invitationStatusConfig: Record<
    string,
    { label: string; className: string }
> = {
    PENDING: {
        label: "대기 중",
        className: "bg-yellow-100 text-yellow-800",
    },
    ACCEPTED: {
        label: "매칭됨", // 사용자 요청 반영: "수락됨" -> "매칭됨"
        className: "bg-green-100 text-green-800",
    },
    REJECTED: {
        label: "거절됨",
        className: "bg-gray-100 text-gray-800",
    },
    EXPIRED: {
        label: "만료됨",
        className: "bg-red-100 text-red-800",
    },
};

export function SentInvitationsList({
    tripId,
    initialInvitations,
}: SentInvitationsListProps) {
    const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
    const supabase = useClerkSupabaseClient();

    // 초기 데이터가 변경되면 상태 업데이트 (Server Action 재호출 시 반영)
    useEffect(() => {
        setInvitations(initialInvitations);
    }, [initialInvitations]);

    // Realtime 구독 (PRD Rule: 특정 Trip의 초대 상태 변경 감지)
    useRealtimeSubscription<InvitationPayload>(
        useCallback(
            (handler, client) => subscribeToTripInvitations(tripId, handler, client),
            [tripId]
        ),
        {
            client: supabase,
            onUpdate: (payload) => {
                const updated = payload.new as InvitationPayload;
                setInvitations((prev) =>
                    prev.map((inv) =>
                        inv.id === updated.id
                            ? { ...inv, ...updated }
                            : inv
                    )
                );
            },
            onInsert: (payload) => {
                // 신규 초대의 경우 pickup_request 정보가 payload에 없으므로 
                // 전체를 새로고침(page.tsx의 router.refresh())에 의존하거나, 
                // 여기서 optimistic으로 처리하기보다 서버 동기화를 지향함.
                // 다만 UI에 즉시 나타나게 하려면 추가 데이터 로직이 필요할 수 있음.
            }
        }
    );

    if (invitations.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6 text-center py-12">
                    <p className="text-muted-foreground mb-4">
                        아직 보낸 초대가 없습니다.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        위에서 요청자에게 초대를 보내면 여기에 표시됩니다.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {invitations.map((invitation) => {
                const statusInfo =
                    invitationStatusConfig[invitation.status] ||
                    invitationStatusConfig["PENDING"];
                const pickupRequest = invitation.pickup_request;

                return (
                    <Card key={invitation.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {pickupRequest?.pickup_time
                                            ? formatDateTime(pickupRequest.pickup_time)
                                            : "시간 정보 없음"}
                                    </CardTitle>
                                    <CardDescription className="mt-2 space-y-1">
                                        {pickupRequest && (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>출발지: {pickupRequest.origin_text}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>목적지: {pickupRequest.destination_text}</span>
                                                </div>
                                            </>
                                        )}
                                        {invitation.status === "PENDING" && invitation.expires_at && (
                                            <div className="flex items-center gap-2 mt-2 text-xs">
                                                <span className="text-muted-foreground">
                                                    만료 시간: {formatDateTime(invitation.expires_at)}
                                                </span>
                                            </div>
                                        )}
                                        {(invitation.status === "ACCEPTED" ||
                                            invitation.status === "REJECTED") &&
                                            invitation.responded_at && (
                                                <div className="flex items-center gap-2 mt-2 text-xs">
                                                    <span className="text-muted-foreground">
                                                        응답 시간: {formatDateTime(invitation.responded_at)}
                                                    </span>
                                                </div>
                                            )}
                                        {invitation.status === "EXPIRED" && invitation.expires_at && (
                                            <div className="flex items-center gap-2 mt-2 text-xs">
                                                <span className="text-muted-foreground">
                                                    만료 시간: {formatDateTime(invitation.expires_at)}
                                                </span>
                                            </div>
                                        )}
                                    </CardDescription>
                                </div>
                                <span
                                    className={`px-2 py-1 rounded-md text-xs font-medium ${statusInfo.className}`}
                                >
                                    {statusInfo.label}
                                </span>
                            </div>
                        </CardHeader>
                    </Card>
                );
            })}
        </div>
    );
}
