/**
 * @file components/my/canceled-box.tsx
 * @description 취소 상태 박스 컴포넌트
 *
 * 주요 기능:
 * 1. "픽업 서비스 제공이 불가합니다." 메시지 표시
 * 2. [상세 사유 보기] 버튼 포함
 * 3. 기존 MovingBox, StartedBox와 동일한 스타일 유지
 *
 * @dependencies
 * - @/components/ui/button: 버튼 컴포넌트
 * - Tailwind CSS
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CancelReasonDialog } from "./cancel-reason-dialog";

interface CanceledBoxProps {
  cancelReasonCode?: string | null;
  cancelReasonText?: string | null;
}

export function CanceledBox({
  cancelReasonCode,
  cancelReasonText,
}: CanceledBoxProps) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <div className="p-4 rounded-lg border-2 bg-red-100 dark:bg-red-950 border-red-400 dark:border-red-700">
        <p className="text-center font-semibold text-red-800 dark:text-red-200 mb-3">
          픽업 서비스 제공이 불가합니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border-red-300 dark:border-red-600 text-red-800 dark:text-red-200"
          onClick={() => setShowDialog(true)}
        >
          상세 사유 보기
        </Button>
      </div>

      {showDialog && (
        <CancelReasonDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          cancelReasonCode={cancelReasonCode}
          cancelReasonText={cancelReasonText}
        />
      )}
    </>
  );
}
