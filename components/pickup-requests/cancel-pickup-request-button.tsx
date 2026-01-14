/**
 * @file components/pickup-requests/cancel-pickup-request-button.tsx
 * @description 픽업 요청 취소 버튼 컴포넌트
 *
 * 주요 기능:
 * 1. cancelPickupRequest Server Action 호출
 * 2. 로딩 상태 관리
 * 3. 에러 메시지 표시
 * 4. 성공 시 목록 페이지로 리다이렉트
 *
 * @dependencies
 * - @/actions/pickup-requests: cancelPickupRequest Server Action
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelPickupRequest } from "@/actions/pickup-requests";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { CancelPickupRequestFormData } from "@/lib/validations/pickup-request";

interface CancelPickupRequestButtonProps {
  pickupRequestId: string;
  formData: CancelPickupRequestFormData;
}

export function CancelPickupRequestButton({
  pickupRequestId,
  formData,
}: CancelPickupRequestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await cancelPickupRequest(
        pickupRequestId,
        formData.cancel_reason_code,
        formData.cancel_reason_text
      );

      if (!result.success) {
        setError(result.error || "취소 처리에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 성공 시 목록 페이지로 리다이렉트
      router.push("/pickup-requests");
    } catch (err) {
      console.error("취소 처리 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        onClick={handleCancel}
        disabled={isLoading}
        className="w-full"
      >
        <X className="mr-2 h-4 w-4" />
        {isLoading ? "처리 중..." : "취소하기"}
      </Button>
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
