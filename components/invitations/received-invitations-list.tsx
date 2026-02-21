"use client";

import { useState, useCallback } from "react";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { AlertCircle } from "lucide-react";
import { InvitationCard } from "@/components/invitations/invitation-card";
import { useRealtimeSubscription, subscribeToRequesterInvitations, InvitationPayload } from "@/lib/realtime";

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
                // 현재 요청에 대한 초대인지 확인
                if (newInv.pickup_request_id === requestId) {
                    console.log("📨 [Realtime] 새 초대 도착:", newInv);
                    // 실제 운영 시에는 여기서 프로필 데이터를 다시 불러오는 로직이 필요할 수 있음
                    // (INSERT 페이로드에는 프로필 조인 데이터가 없으므로)
                    // MVP에서는 일단 상태만이라도 업데이트하거나, 페이지 새로고침 유도
                    window.location.reload(); // 프로필 데이터 조인을 위해 새로고침 (가장 간단한 MVP 접근)
                }
            },
            onUpdate: (payload) => {
                const updatedInv = payload.new as InvitationPayload;
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
