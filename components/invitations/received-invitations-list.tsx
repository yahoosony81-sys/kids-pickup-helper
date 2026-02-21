"use client";

import { useState, useEffect, useCallback } from "react";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { InvitationCard } from "@/components/invitations/invitation-card";
import { useRealtimeSubscription, subscribeToRequestInvitations, InvitationPayload } from "@/lib/realtime";
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
        setInvitations(initialInvitations);
    }, [initialInvitations]);

    // Realtime 구독 (PRD Rule: invitations | INSERT | pickup_request_id=me)
    useRealtimeSubscription<InvitationPayload>(
        useCallback(
            (handler, client) => subscribeToRequestInvitations(requestId, currentUserId, handler, client),
            [requestId, currentUserId]
        ),
        {
            client: supabase,
            onInsert: (payload) => {
                const newInv = payload.new as InvitationPayload;
                console.log("📨 [Realtime] 새 초대 도착:", newInv);
                // 새 초대가 오면 상세 정보(제공자 프로필 등)를 포함해 다시 읽어오기 위해 refresh 시도
                router.refresh();
            },
            onUpdate: (payload) => {
                const updatedInv = payload.new as InvitationPayload;
                // 상태 변경(수락/거절 등) 시 즉시 반영
                setInvitations(prev => prev.map(inv =>
                    inv.id === updatedInv.id ? { ...inv, status: updatedInv.status } : inv
                ));
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
