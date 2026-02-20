"use client";

import { useEffect, useState } from "react";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
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

    // Realtime 구독
    useEffect(() => {
        console.log(`🔄 [SentInvitationsList] Realtime 구독 시작 (Trip ID: ${tripId})`);

        const channel = supabase
            .channel(`trip-invitations:${tripId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "invitations",
                    filter: `trip_id=eq.${tripId}`,
                },
                (payload) => {
                    console.log("✅ [Realtime] 초대 상태 변경 감지:", payload);

                    if (payload.eventType === "INSERT") {
                        // INSERT는 page.tsx에서 router.refresh()로 처리되므로 여기서는 무시하거나,
                        // 필요한 경우 추가 로직 구현 (단, pickup_request 정보가 없어서 바로 추가하기 어려움)
                        // 여기서는 상태 변경(UPDATE)에 집중
                    } else if (payload.eventType === "UPDATE") {
                        setInvitations((prev) =>
                            prev.map((inv) =>
                                inv.id === payload.new.id
                                    ? { ...inv, ...payload.new }
                                    : inv
                            )
                        );
                    }
                }
            )
            .subscribe((status) => {
                console.log(`📡 [Realtime] 구독 상태: ${status}`);
            });

        return () => {
            console.log("🔌 [SentInvitationsList] Realtime 구독 해제");
            supabase.removeChannel(channel);
        };
    }, [tripId, supabase]);

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
