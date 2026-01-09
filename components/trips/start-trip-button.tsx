/**
 * @file components/trips/start-trip-button.tsx
 * @description Trip 출발 버튼 컴포넌트
 *
 * 주요 기능:
 * 1. Trip 출발 처리 Server Action 호출
 * 2. 로딩 상태 관리
 * 3. 에러 메시지 표시
 * 4. 성공 시 페이지 새로고침
 * 5. 출발 불가 조건 시 버튼 비활성화 및 안내 메시지
 *
 * @dependencies
 * - @/actions/trips: startTrip Server Action
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useState } from "react";
import { startTrip } from "@/actions/trips";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Play, Lock } from "lucide-react";

interface StartTripButtonProps {
  tripId: string;
  isLocked: boolean;
  participantCount: number;
  tripStatus?: string;
}

export function StartTripButton({
  tripId,
  isLocked,
  participantCount,
  tripStatus,
}: StartTripButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStartTrip = async () => {
    if (isLocked || participantCount === 0 || tripStatus === "EXPIRED") {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await startTrip(tripId);

      if (!result.success) {
        setError(result.error || "출발 처리에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 성공 시 페이지 새로고침
      router.refresh();
    } catch (err) {
      console.error("출발 처리 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  const canStart = !isLocked && participantCount > 0 && tripStatus !== "EXPIRED";

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        disabled={!canStart || isLoading}
        onClick={handleStartTrip}
        size="lg"
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            출발 처리 중...
          </>
        ) : tripStatus === "EXPIRED" ? (
          <>
            <Lock className="mr-2 h-4 w-4" />
            기간 만료
          </>
        ) : isLocked ? (
          <>
            <Lock className="mr-2 h-4 w-4" />
            이미 출발했습니다
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            출발하기
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
      {!canStart && tripStatus === "EXPIRED" && (
        <p className="text-xs text-muted-foreground text-center">
          이 그룹은 기간이 만료되어 출발할 수 없습니다.
        </p>
      )}
      {!canStart && !isLocked && tripStatus !== "EXPIRED" && participantCount === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          참여자가 없어 출발할 수 없습니다.
        </p>
      )}
    </div>
  );
}





