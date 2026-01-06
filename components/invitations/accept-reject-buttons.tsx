/**
 * @file components/invitations/accept-reject-buttons.tsx
 * @description 초대 수락/거절 버튼 컴포넌트
 *
 * 주요 기능:
 * 1. 초대 수락 Server Action 호출
 * 2. 초대 거절 Server Action 호출
 * 3. 로딩 상태 관리
 * 4. 에러 메시지 표시
 * 5. 성공 시 페이지 새로고침 또는 리다이렉트
 *
 * @dependencies
 * - @/actions/invitations: acceptInvitation, rejectInvitation Server Actions
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useState } from "react";
import { acceptInvitation, rejectInvitation } from "@/actions/invitations";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

interface AcceptRejectButtonsProps {
  invitationId: string;
  invitationStatus: string;
  isExpired: boolean;
}

export function AcceptRejectButtons({
  invitationId,
  invitationStatus,
  isExpired,
}: AcceptRejectButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // PENDING 상태가 아니면 버튼 표시 안 함
  if (invitationStatus !== "PENDING") {
    return null;
  }

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await acceptInvitation(invitationId);

      if (!result.success) {
        setError(result.error || "초대 수락에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 성공 시 페이지 새로고침
      router.refresh();
    } catch (err) {
      console.error("초대 수락 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await rejectInvitation(invitationId);

      if (!result.success) {
        setError(result.error || "초대 거절에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 성공 시 페이지 새로고침
      router.refresh();
    } catch (err) {
      console.error("초대 거절 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          className="flex-1"
          variant="default"
          disabled={isLoading || isExpired}
          onClick={handleAccept}
        >
          <Check className="mr-2 h-4 w-4" />
          {isLoading ? "처리 중..." : "수락하기"}
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          disabled={isLoading}
          onClick={handleReject}
        >
          <X className="mr-2 h-4 w-4" />
          {isLoading ? "처리 중..." : "거절하기"}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
      {isExpired && (
        <p className="text-xs text-muted-foreground text-center">
          이 초대는 만료되었습니다.
        </p>
      )}
    </div>
  );
}

