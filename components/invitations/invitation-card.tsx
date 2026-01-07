/**
 * @file components/invitations/invitation-card.tsx
 * @description 초대 카드 컴포넌트
 *
 * 주요 기능:
 * 1. 제공자 프로필 정보 표시 (이름, 사진, 한줄소개)
 * 2. 초대 상태 배지 표시
 * 3. 수락 버튼 제공 (PENDING 상태일 때만)
 * 4. 수락 처리 및 상태 업데이트
 *
 * 핵심 구현 로직:
 * - Client Component로 구현
 * - acceptInvitation Server Action 호출
 * - 로딩 상태 관리
 * - 에러 처리 및 사용자 피드백
 *
 * @dependencies
 * - @/actions/invitations: acceptInvitation Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useState } from "react";
import { acceptInvitation } from "@/actions/invitations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface InvitationCardProps {
  invitation: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
    provider: {
      name: string;
      imageUrl: string | null;
      bio: string | null;
    };
    created_at: string;
    expires_at: string;
  };
  requestId: string;
}

// 초대 상태별 배지 설정
const invitationStatusConfig: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "대기 중",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: <Clock className="h-3 w-3" />,
  },
  ACCEPTED: {
    label: "수락됨",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  REJECTED: {
    label: "거절됨",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  EXPIRED: {
    label: "마감됨",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function InvitationCard({ invitation, requestId }: InvitationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(invitation.status);
  const router = useRouter();

  const statusInfo =
    invitationStatusConfig[currentStatus] || invitationStatusConfig["PENDING"];

  // 초대 만료 여부 확인
  const now = new Date();
  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt < now;

  // 수락 버튼 표시 조건
  const showAcceptButton =
    currentStatus === "PENDING" && !isExpired;

  // 제공자 이름의 첫 글자 추출 (아바타 fallback용)
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("📋 [초대 수락 버튼] 클릭:", {
        invitationId: invitation.id,
        requestId,
      });

      const result = await acceptInvitation(invitation.id);

      if (!result.success) {
        setError(result.error || "초대 수락에 실패했습니다.");
        setIsLoading(false);
        console.error("❌ 초대 수락 실패:", result.error);
        return;
      }

      console.log("✅ 초대 수락 성공:", {
        invitationId: invitation.id,
      });

      // 상태 업데이트
      setCurrentStatus("ACCEPTED");

      // 페이지 새로고침하여 최신 상태 반영
      router.refresh();
    } catch (err) {
      console.error("❌ 초대 수락 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* 제공자 프로필 사진 */}
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {invitation.provider.imageUrl ? (
              <img
                src={invitation.provider.imageUrl}
                alt={invitation.provider.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-muted-foreground">
                {getInitials(invitation.provider.name)}
              </span>
            )}
          </div>

          {/* 제공자 정보 및 초대 상태 */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{invitation.provider.name}</h3>
                {invitation.provider.bio && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {invitation.provider.bio}
                  </p>
                )}
              </div>
              <span
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusInfo.className}`}
              >
                {statusInfo.icon}
                {statusInfo.label}
              </span>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* 수락 버튼 */}
            {showAcceptButton && (
              <Button
                onClick={handleAccept}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    수락 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    수락
                  </>
                )}
              </Button>
            )}

            {/* 만료 메시지 */}
            {currentStatus === "PENDING" && isExpired && (
              <p className="text-sm text-muted-foreground">
                이 초대는 만료되었습니다.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

