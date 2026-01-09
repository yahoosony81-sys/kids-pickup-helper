/**
 * @file components/trips/pickup-complete-button.tsx
 * @description 픽업 완료 버튼 컴포넌트
 *
 * 주요 기능:
 * 1. 제공자가 특정 참여자의 픽업 완료를 표시
 * 2. progress_stage를 'PICKED_UP'으로 업데이트
 * 3. 로딩 상태 관리 및 에러 메시지 표시
 *
 * @dependencies
 * - @/actions/trips: markPickupComplete Server Action
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useState } from "react";
import { markPickupComplete } from "@/actions/trips";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

interface PickupCompleteButtonProps {
  tripId: string;
  pickupRequestId: string;
  progressStage: string | null;
}

export function PickupCompleteButton({
  tripId,
  pickupRequestId,
  progressStage,
}: PickupCompleteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // progress_stage가 'STARTED'일 때만 버튼 표시
  const canMarkComplete = progressStage === "STARTED";

  const handleMarkComplete = async () => {
    if (!canMarkComplete) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await markPickupComplete(tripId, pickupRequestId);

      if (!result.success) {
        setError(result.error || "픽업 완료 처리에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 성공 시 페이지 새로고침
      router.refresh();
    } catch (err) {
      console.error("픽업 완료 처리 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  if (!canMarkComplete) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        disabled={isLoading}
        onClick={handleMarkComplete}
        variant="outline"
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            처리 중...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            픽업 완료
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}

