/**
 * @file components/trip-reviews/submit-review-button.tsx
 * @description 리뷰 제출 버튼 컴포넌트
 *
 * 주요 기능:
 * 1. 리뷰 제출 Server Action 호출
 * 2. 로딩 상태 관리
 * 3. 에러 메시지 표시
 * 4. 성공 시 페이지 새로고침 또는 리다이렉트
 *
 * @dependencies
 * - @/actions/trip-reviews: submitReview Server Action
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useState } from "react";
import { submitReview } from "@/actions/trip-reviews";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import type { TripReviewFormData } from "@/lib/validations/trip-review";

interface SubmitReviewButtonProps {
  pickupRequestId: string;
  formData: TripReviewFormData;
  onValidate?: () => Promise<boolean>;
  isValid?: boolean;
}

export function SubmitReviewButton({
  pickupRequestId,
  formData,
  onValidate,
  isValid,
}: SubmitReviewButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    // 유효성 검사
    if (onValidate) {
      const isValidForm = await onValidate();
      if (!isValidForm) {
        setError("입력 정보를 확인해주세요.");
        return;
      }
    } else if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
      setError("평점을 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await submitReview(pickupRequestId, formData);

      if (!result.success) {
        setError(result.error || "리뷰 제출에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 성공 시 목록 페이지로 리다이렉트
      router.push("/pickup-requests");
    } catch (err) {
      console.error("리뷰 제출 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button
        className="w-full"
        disabled={isLoading}
        onClick={handleSubmit}
      >
        <Star className="mr-2 h-4 w-4" />
        {isLoading ? "제출 중..." : "리뷰 제출하기"}
      </Button>
      {error && (
        <p className="text-xs text-destructive mt-2 text-center">{error}</p>
      )}
    </div>
  );
}

