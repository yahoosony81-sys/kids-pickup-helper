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
import { startTrip, cancelUnmetStudents } from "@/actions/trips";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Play, Lock } from "lucide-react";
import { CancelStudentModal } from "./cancel-student-modal";

interface StartTripButtonProps {
  tripId: string;
  isLocked: boolean;
  participantCount: number;
  tripStatus?: string;
  participants?: any[]; // 각 participant의 is_met_at_pickup 확인용
}

export function StartTripButton({
  tripId,
  isLocked,
  participantCount,
  tripStatus,
  participants = [],
}: StartTripButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const router = useRouter();

  // 확인된 학생 수 계산
  const metStudentsCount = participants.filter(
    (p) => p.is_met_at_pickup === true
  ).length;

  // 미도착 학생 목록 (is_met_at_pickup이 false인 학생)
  const unmetStudents = participants.filter(
    (p) => p.is_met_at_pickup === false || p.is_met_at_pickup === undefined
  );

  const handleStartTrip = async () => {
    if (isLocked || participantCount === 0 || tripStatus === "EXPIRED") {
      return;
    }

    // 확인된 학생이 없으면 출발 불가
    if (metStudentsCount === 0) {
      setError("픽업 장소 도착 확인이 된 학생이 없어 출발할 수 없습니다.");
      return;
    }

    // 미도착 학생이 있으면 모달 표시
    if (unmetStudents.length > 0) {
      setShowCancelModal(true);
      return;
    }

    // 미도착 학생이 없으면 바로 출발 처리
    await proceedWithStart();
  };

  const handleCancelConfirm = async (
    cancellations: Array<{
      participantId: string;
      pickupRequestId: string;
      cancelReasonCode: "NO_SHOW" | "CANCEL";
      cancelReasonText?: string;
    }>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. 미도착 학생 취소 처리
      const cancelResult = await cancelUnmetStudents(tripId, cancellations);

      if (!cancelResult.success) {
        setError(cancelResult.error || "취소 처리에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 2. 취소 처리 성공 후 출발 처리
      await proceedWithStart();
    } catch (err) {
      console.error("취소 처리 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  const proceedWithStart = async () => {
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

  const canStart =
    !isLocked &&
    participantCount > 0 &&
    tripStatus !== "EXPIRED" &&
    metStudentsCount > 0;

  return (
    <>
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
        {!canStart &&
          !isLocked &&
          tripStatus !== "EXPIRED" &&
          participantCount > 0 &&
          metStudentsCount === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              픽업 장소 도착 확인이 된 학생이 없어 출발할 수 없습니다.
            </p>
          )}
      </div>

      {/* 미도착 학생 취소 모달 */}
      <CancelStudentModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        unmetStudents={unmetStudents}
        onConfirm={handleCancelConfirm}
      />
    </>
  );
}





