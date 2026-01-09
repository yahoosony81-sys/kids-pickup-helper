/**
 * @file components/my/ongoing-requests-client.tsx
 * @description 진행중 요청 클라이언트 컴포넌트
 *
 * 주요 기능:
 * 1. 도착 확인 버튼 클릭 처리
 * 2. 폴링 로직 (10~15초 간격으로 상태 재조회)
 * 3. ArrivalConfirmation 컴포넌트 표시
 *
 * @dependencies
 * - @/actions/pickup-requests: confirmArrival, getMyPickupRequests Server Actions
 * - @/components/my/arrival-confirmation: ArrivalConfirmation 컴포넌트
 */

"use client";

import { useState, useEffect } from "react";
import { confirmArrival } from "@/actions/pickup-requests";
import { ArrivalConfirmation } from "./arrival-confirmation";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface OngoingRequestsClientProps {
  pickupRequestId: string;
  progressStage: string | null;
}

export function OngoingRequestsClient({
  pickupRequestId,
  progressStage,
}: OngoingRequestsClientProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const router = useRouter();

  // 폴링 로직: 12초 간격으로 상태 재조회
  useEffect(() => {
    if (progressStage !== "ARRIVED" && !showConfirmation) {
      return; // ARRIVED 상태가 아니거나 확인 UI가 표시되지 않았을 때만 폴링
    }

    const interval = setInterval(() => {
      router.refresh();
    }, 12000); // 12초 간격

    return () => clearInterval(interval);
  }, [progressStage, showConfirmation, router]);

  const handleConfirmArrival = async () => {
    setIsConfirming(true);
    try {
      const result = await confirmArrival(pickupRequestId);
      if (result.success) {
        setShowConfirmation(true);
        router.refresh();
      } else {
        alert(result.error || "도착 확인 처리에 실패했습니다.");
      }
    } catch (error) {
      console.error("도착 확인 처리 에러:", error);
      alert("예상치 못한 오류가 발생했습니다.");
    } finally {
      setIsConfirming(false);
    }
  };

  if (showConfirmation) {
    return <ArrivalConfirmation pickupRequestId={pickupRequestId} />;
  }

  return (
    <div className="mt-4">
      <Button
        onClick={handleConfirmArrival}
        disabled={isConfirming}
        className="w-full"
      >
        {isConfirming ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            처리 중...
          </>
        ) : (
          "도착 완료 확인하기"
        )}
      </Button>
    </div>
  );
}

