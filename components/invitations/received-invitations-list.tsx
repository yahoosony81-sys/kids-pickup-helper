"use client";

import { useState, useEffect, useCallback } from "react";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { InvitationCard } from "@/components/invitations/invitation-card";
import { useRealtimeSubscription, subscribeToRequesterInvitations, InvitationPayload } from "@/lib/realtime";
import { useRouter } from "next/navigation";

interface ReceivedInvitationsListProps {
    requestId: string;
    initialInvitations: any[]; // 프로필 정보가 포함된 확장된 초대 데이터
    currentUserId: string;
    pickupRequestStatus: string;
}

export function ReceivedInvitationsList({
    requestId,
    initialInvitations,
    currentUserId,
    pickupRequestStatus,
}: ReceivedInvitationsListProps) {
    const [invitations, setInvitations] = useState<any[]>(initialInvitations);
    const supabase = useClerkSupabaseClient();
    const router = useRouter();

    // props가 변경되면 로컬 상태 동기화 (router.refresh() 대응)
    useEffect(() => {
        console.log("🔄 [ReceivedInvitationsList] Props updated:", initialInvitations.length);
        setInvitations(initialInvitations);
    }, [initialInvitations]);

    // Realtime 구독 (PRD Rule: invitations | INSERT | requester_id=me)
    useRealtimeSubscription<InvitationPayload>(
        useCallback(
            (handler, client) => subscribeToRequesterInvitations(currentUserId, handler, client),
            [currentUserId]
        ),
        {
            client: supabase,
            onInsert: (payload) => {
                const newInv = payload.new as InvitationPayload;
                console.log("📨 [Realtime] 새 초대 감지됨:", {
                    invId: newInv.id,
                    targetRequestId: requestId,
                    receivedRequestId: newInv.pickup_request_id
                });

                // 현재 내 요청에 대한 초대인지 확인
                if (newInv.pickup_request_id === requestId) {
                    console.log("✅ [Realtime] 현재 요청에 대한 초대이므로 UI 갱신 시도 (router.refresh)");
                    router.refresh();
                } else {
                    console.log("ℹ️ [Realtime] 다른 요청에 대한 초대임 (무시)");
                }
            },
            onUpdate: (payload) => {
                const updatedInv = payload.new as InvitationPayload;
                console.log("📝 [Realtime] 초대 상태 변경 감지:", {
                    invId: updatedInv.id,
                    status: updatedInv.status
                });

                if (updatedInv.pickup_request_id === requestId) {
                    setInvitations(prev => prev.map(inv =>
                        inv.id === updatedInv.id ? { ...inv, status: updatedInv.status } : inv
                    ));
                }
            }
        }
    );

    const filteredInvitations = invitations.filter(
        (inv) => inv.status !== "EXPIRED" && pickupRequestStatus !== "EXPIRED"
    );

    if (filteredInvitations.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>아직 받은 초대가 없습니다.</p>
                <p className="text-sm mt-2">
                    픽업 제공자가 초대를 보내면 여기에 표시됩니다.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {filteredInvitations.map((invitation) => (
                <InvitationCard
                    key={invitation.id}
                    invitation={{
                        id: invitation.id,
                        status: invitation.status as "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED",
                        provider: invitation.provider,
                        created_at: invitation.created_at,
                        expires_at: invitation.expires_at,
                    }}
                    requestId={requestId}
                />
            ))}
        </div>
    );
}
