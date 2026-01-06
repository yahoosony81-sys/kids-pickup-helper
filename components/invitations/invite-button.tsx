/**
 * @file components/invitations/invite-button.tsx
 * @description 초대하기 버튼 컴포넌트
 *
 * 주요 기능:
 * 1. 초대 전송 Server Action 호출
 * 2. 로딩 상태 관리
 * 3. 에러 메시지 표시
 * 4. 성공 시 페이지 새로고침
 *
 * @dependencies
 * - @/actions/invitations: sendInvitation Server Action
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useState } from "react";
import { sendInvitation } from "@/actions/invitations";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface InviteButtonProps {
  tripId: string;
  pickupRequestId: string;
  isTripLocked: boolean;
}

export function InviteButton({
  tripId,
  pickupRequestId,
  isTripLocked,
}: InviteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleInvite = async () => {
    if (isTripLocked) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await sendInvitation(tripId, pickupRequestId);

      if (!result.success) {
        setError(result.error || "초대 전송에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 성공 시 페이지 새로고침
      router.refresh();
    } catch (err) {
      console.error("초대 전송 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button
        className="w-full"
        disabled={isTripLocked || isLoading}
        onClick={handleInvite}
      >
        {isLoading ? "전송 중..." : "초대하기"}
      </Button>
      {error && (
        <p className="text-xs text-destructive mt-2 text-center">{error}</p>
      )}
      {isTripLocked && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          LOCK된 Trip에는 초대를 보낼 수 없습니다.
        </p>
      )}
    </div>
  );
}

