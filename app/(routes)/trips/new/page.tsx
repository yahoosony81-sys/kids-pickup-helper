/**
 * @file app/(routes)/trips/new/page.tsx
 * @description Trip 생성 페이지
 *
 * 주요 기능:
 * 1. 제공자 Trip 생성
 * 2. 최소 정보만 입력 (초대는 별도 단계에서 처리)
 *
 * 핵심 구현 로직:
 * - Client Component로 구현
 * - 제공자 전용 페이지 표시 (UI에만 표시, 실제 권한 체크는 v1.1+에서 추가)
 * - 현재는 입력 필드 없이 "Trip 생성" 버튼만 제공
 * - 제출 성공 시 Trip 목록 페이지로 리다이렉트
 *
 * @dependencies
 * - @/actions/trips: Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/actions/trips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NewTripPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createTrip();

      if (!result.success) {
        setSubmitError(result.error || "Trip 생성에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }

      // 성공 시 목록 페이지로 리다이렉트
      router.push("/trips");
    } catch (error) {
      console.error("Trip 생성 에러:", error);
      setSubmitError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>새 픽업 제공</CardTitle>
          <CardDescription>
            제공자 전용: 새로운 픽업 세션을 생성합니다. 초대는 별도 단계에서 진행됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>안내:</strong> 픽업제공을 생성하면 요청자에게 초대를 보낼 수 있습니다.
                각 픽업제공은 최대 3명까지 수용 가능합니다.
              </p>
            </div>

            {/* 에러 메시지 */}
            {submitError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {submitError}
              </div>
            )}

            {/* 제출 버튼 */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button onClick={onSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                픽업 제공 생성하기
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

