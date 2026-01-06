/**
 * @file components/pickup-requests/approve-cancel-button.tsx
 * @description 취소 승인 버튼 컴포넌트
 *
 * 주요 기능:
 * 1. 취소 승인 Server Action 호출
 * 2. 확인 다이얼로그 표시
 * 3. 로딩 상태 관리
 * 4. 에러 메시지 표시
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
}

export function ApproveCancelButton({
  pickupRequestId,
}: ApproveCancelButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

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
            취소 승인
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>취소 승인 확인</DialogTitle>
            <DialogDescription>
              요청자의 취소 요청을 승인하시겠습니까?
              <br />
              승인하면 이 요청은 취소되고, 수용 가능한 인원이 1명 복구됩니다.
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
              {isLoading ? "처리 중..." : "예, 승인합니다"}
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

