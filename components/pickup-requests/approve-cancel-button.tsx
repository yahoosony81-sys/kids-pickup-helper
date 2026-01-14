/**
 * @file components/pickup-requests/approve-cancel-button.tsx
 * @description 취소 승인 버튼 컴포넌트
 *
 * 주요 기능:
 * 1. 취소 승인 Server Action 호출
 * 2. 확인 다이얼로그 표시
 * 3. 로딩 상태 관리
 * 4. 에러 메시지 표시
 * 5. 시간에 따른 버튼 텍스트 변경 (출발 1시간 전까지는 "확인", 1시간 이내는 "취소 승인")
 *
 * 핵심 구현 로직:
 * - 출발 시간 기준으로 시간 계산
 * - 출발 1시간 전까지: "확인" 버튼 (자동 승인)
 * - 1시간 이내: "취소 승인" 버튼 (수동 승인 필요)
 *
 * @dependencies
 * - @/actions/pickup-cancel: approveCancel Server Action
 * - @/components/ui/button: 버튼 컴포넌트
 * - @/components/ui/dialog: 다이얼로그 컴포넌트
 */

"use client";

import { useState } from "react";
import { approveCancel } from "@/actions/pickup-cancel";
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
import { CheckCircle2 } from "lucide-react";

interface ApproveCancelButtonProps {
  pickupRequestId: string;
  pickupTime: string;
}

export function ApproveCancelButton({
  pickupRequestId,
  pickupTime,
}: ApproveCancelButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  // 시간 계산: 출발 1시간 전까지는 자동 승인, 1시간 이내는 수동 승인 필요
  const pickup = new Date(pickupTime);
  const now = new Date();
  const oneHourInMs = 60 * 60 * 1000;
  const timeUntilPickup = pickup.getTime() - now.getTime();
  const isWithinOneHour = timeUntilPickup <= oneHourInMs;

  // 버튼 텍스트 및 설명 결정
  const buttonText = isWithinOneHour ? "취소 승인" : "확인";
  const dialogTitle = isWithinOneHour ? "취소 승인 확인" : "취소 확인";
  const dialogDescription = isWithinOneHour
    ? "요청자의 취소 요청을 승인하시겠습니까?\n승인하면 이 요청은 취소되고, 수용 가능한 인원이 1명 복구됩니다."
    : "요청자의 취소 요청을 확인하시겠습니까?\n출발 1시간 전이므로 확인만 누르면 즉시 취소 처리됩니다.";
  const confirmButtonText = isWithinOneHour ? "예, 승인합니다" : "예, 확인합니다";

  const handleApproveCancel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await approveCancel(pickupRequestId);

      if (!result.success) {
        setError(result.error || "취소 승인에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 성공 시 다이얼로그 닫고 페이지 새로고침
      setIsDialogOpen(false);
      router.refresh();
    } catch (err) {
      console.error("취소 승인 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="default" className="w-full">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {dialogDescription}
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
              variant="default"
              onClick={handleApproveCancel}
              disabled={isLoading}
            >
              {isLoading ? "처리 중..." : confirmButtonText}
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

