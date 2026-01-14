/**
 * @file components/pickup-requests/cancel-request-button.tsx
 * @description 취소 요청 버튼 컴포넌트
 *
 * 주요 기능:
 * 1. 취소 요청 Server Action 호출
 * 2. 시간/상태 조건 검증 (클라이언트)
 * 3. 확인 다이얼로그 표시
 * 4. 로딩 상태 관리
 * 5. 에러 메시지 표시
 *
 * 취소 로직:
 * - REQUESTED 상태: 즉시 자동 취소
 * - MATCHED 상태: 시간에 따라 분기
 *   - 출발 1시간 이전: 즉시 자동 취소
 *   - 출발 1시간 이내: 제공자 승인 필요
 *
 * @dependencies
 * - @/actions/pickup-cancel: requestCancel Server Action
 * - @/components/ui/button: 버튼 컴포넌트
 * - @/components/ui/dialog: 다이얼로그 컴포넌트
 */

"use client";

import { useState } from "react";
import { requestCancel } from "@/actions/pickup-cancel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { X, AlertTriangle } from "lucide-react";

interface CancelRequestButtonProps {
  pickupRequestId: string;
  status: string;
  pickupTime: string;
}

export function CancelRequestButton({
  pickupRequestId,
  status,
  pickupTime,
}: CancelRequestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  // 취소 가능 여부 계산
  const canCancel = (() => {
    // 상태 검증
    if (status !== "REQUESTED" && status !== "MATCHED") {
      return false;
    }

    // REQUESTED 상태: 시간 제한 없이 항상 취소 가능 (자동 승인)
    if (status === "REQUESTED") {
      return true;
    }

    // MATCHED 상태: 시간 제한 없이 항상 취소 요청 가능
    // 출발 1시간 이전: 자동 취소
    // 출발 1시간 이내: 제공자 승인 필요
    return true;
  })();

  // 시간에 따른 안내 메시지 (MATCHED 상태일 때만)
  const timeMessage = (() => {
    if (status !== "MATCHED") {
      return null;
    }

    const pickup = new Date(pickupTime);
    const now = new Date();
    const oneHourInMs = 60 * 60 * 1000;
    const timeUntilPickup = pickup.getTime() - now.getTime();

    if (timeUntilPickup <= 0) {
      return "이미 출발 시간이 지났습니다.";
    }

    if (timeUntilPickup <= oneHourInMs) {
      const minutesUntilPickup = Math.floor(timeUntilPickup / 60000);
      return `출발 ${minutesUntilPickup}분 전입니다. 취소 요청 시 제공자의 승인이 필요합니다.`;
    }

    return "출발 1시간 이전이므로 취소 버튼만 누르면 즉시 취소 처리됩니다.";
  })();

  const handleCancelRequest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestCancel(pickupRequestId);

      if (!result.success) {
        setError(result.error || "취소 요청에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 성공 시 다이얼로그 닫고 페이지 새로고침
      setIsDialogOpen(false);
      router.refresh();
    } catch (err) {
      console.error("취소 요청 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  // 취소 불가능한 경우 버튼 숨김 또는 비활성화
  if (!canCancel) {
    if (status === "CANCEL_REQUESTED") {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">취소 승인 대기중</span>
          </div>
        </div>
      );
    }

    if (status === "REQUESTED" || status === "MATCHED") {
      return (
        <div className="space-y-2">
          <Button variant="outline" disabled className="w-full">
            <X className="mr-2 h-4 w-4" />
            취소 요청 불가
          </Button>
          {timeMessage && (
            <p className="text-xs text-muted-foreground text-center">
              {timeMessage}
            </p>
          )}
        </div>
      );
    }

    // 다른 상태에서는 버튼 숨김
    return null;
  }

  return (
    <div className="space-y-2">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            <X className="mr-2 h-4 w-4" />
            취소 요청
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>취소 확인</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              정말로 이 픽업 요청을 취소하시겠습니까?
              <br />
              {status === "REQUESTED" ? (
                <>
                  매칭 전 취소이므로 즉시 취소 처리됩니다.
                </>
              ) : (() => {
                const pickup = new Date(pickupTime);
                const now = new Date();
                const oneHourInMs = 60 * 60 * 1000;
                const timeUntilPickup = pickup.getTime() - now.getTime();
                const isWithinOneHour = timeUntilPickup <= oneHourInMs;

                if (isWithinOneHour) {
                  return "출발 1시간 이내이므로 취소 요청 후 제공자의 승인이 필요합니다.";
                } else {
                  return "출발 1시간 이전이므로 취소 버튼만 누르면 즉시 취소 처리됩니다.";
                }
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              아니오
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRequest}
              disabled={isLoading}
            >
              {isLoading 
                ? "처리 중..." 
                : status === "REQUESTED" 
                  ? "예, 취소합니다" 
                  : (() => {
                      const pickup = new Date(pickupTime);
                      const now = new Date();
                      const oneHourInMs = 60 * 60 * 1000;
                      const timeUntilPickup = pickup.getTime() - now.getTime();
                      const isWithinOneHour = timeUntilPickup <= oneHourInMs;

                      return isWithinOneHour ? "예, 취소 요청합니다" : "예, 취소합니다";
                    })()}
            </Button>
          </DialogFooter>
          {error && (
            <p className="text-xs text-destructive text-center mt-2">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

