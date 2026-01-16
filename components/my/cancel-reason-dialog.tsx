/**
 * @file components/my/cancel-reason-dialog.tsx
 * @description 취소 사유 다이얼로그 컴포넌트
 *
 * 주요 기능:
 * 1. cancel_reason_code에 따른 사유 라벨 표시
 * 2. cancel_reason_text 표시 (있는 경우)
 * 3. 닫기 버튼
 *
 * @dependencies
 * - @/components/ui/dialog: 다이얼로그 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface CancelReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cancelReasonCode?: string | null;
  cancelReasonText?: string | null;
}

export function CancelReasonDialog({
  open,
  onOpenChange,
  cancelReasonCode,
  cancelReasonText,
}: CancelReasonDialogProps) {
  // 취소 사유 코드에 따른 라벨 매핑
  const getReasonLabel = (code: string | null | undefined): string => {
    if (!code) return "사유 없음";
    
    switch (code) {
      case "NO_SHOW":
        return "노쇼";
      case "CANCEL":
        return "일반 취소";
      default:
        return code;
    }
  };

  const reasonLabel = getReasonLabel(cancelReasonCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            취소 사유
          </DialogTitle>
          <DialogDescription>
            픽업 서비스가 제공되지 않은 사유입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              취소 사유:
            </p>
            <p className="text-base text-red-900 dark:text-red-100">
              {cancelReasonText || reasonLabel}
            </p>
            {cancelReasonCode === "CANCEL" && cancelReasonText && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 pt-2 border-t border-red-200 dark:border-red-700">
                (일반 취소)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
