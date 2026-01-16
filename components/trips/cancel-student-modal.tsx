/**
 * @file components/trips/cancel-student-modal.tsx
 * @description 미도착 학생 취소 사유 선택 모달 컴포넌트
 *
 * 주요 기능:
 * 1. 미도착 학생 목록 표시
 * 2. 각 학생별로 취소 사유 선택 (3가지 옵션)
 * 3. 사유 선택 후 취소 처리 Server Action 호출
 *
 * @dependencies
 * - @/components/ui/dialog: 다이얼로그 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 * - @/components/ui/radio-group: 라디오 그룹 컴포넌트
 * - @/components/ui/textarea: 텍스트 영역 컴포넌트
 * - @/components/ui/label: 라벨 컴포넌트
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface Participant {
  id: string;
  pickup_request_id: string;
  is_met_at_pickup: boolean;
  pickup_request?: {
    id: string;
    origin_text: string;
    destination_text: string;
    pickup_time: string;
  };
}

interface CancelStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unmetStudents: Participant[];
  onConfirm: (cancellations: Array<{
    participantId: string;
    pickupRequestId: string;
    cancelReasonCode: "NO_SHOW" | "CANCEL";
    cancelReasonText?: string;
  }>) => Promise<void>;
}

type CancelReason = "NO_SHOW" | "CANCEL_REQUESTED_BEFORE_START" | "OTHER" | "";

export function CancelStudentModal({
  open,
  onOpenChange,
  unmetStudents,
  onConfirm,
}: CancelStudentModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<Record<string, CancelReason>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달이 열릴 때마다 상태 초기화
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedReasons({});
      setOtherTexts({});
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const handleReasonChange = (participantId: string, reason: CancelReason) => {
    setSelectedReasons((prev) => ({
      ...prev,
      [participantId]: reason,
    }));
    // "기타"가 아닌 경우 텍스트 초기화
    if (reason !== "OTHER") {
      setOtherTexts((prev) => {
        const newTexts = { ...prev };
        delete newTexts[participantId];
        return newTexts;
      });
    }
  };

  const handleOtherTextChange = (participantId: string, text: string) => {
    setOtherTexts((prev) => ({
      ...prev,
      [participantId]: text,
    }));
  };

  const handleConfirm = async () => {
    // 모든 학생의 사유가 선택되었는지 확인
    const allSelected = unmetStudents.every(
      (student) => selectedReasons[student.id] && selectedReasons[student.id] !== ""
    );

    if (!allSelected) {
      setError("모든 학생의 취소 사유를 선택해주세요.");
      return;
    }

    // "기타" 선택한 경우 텍스트 입력 확인
    const otherStudents = unmetStudents.filter(
      (student) => selectedReasons[student.id] === "OTHER"
    );
    const allOtherTextsFilled = otherStudents.every(
      (student) => otherTexts[student.id] && otherTexts[student.id].trim() !== ""
    );

    if (!allOtherTextsFilled) {
      setError("'기타'를 선택한 경우 상세 사유를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 취소 데이터 변환
      const cancellations = unmetStudents.map((student) => {
        const reason = selectedReasons[student.id];
        let cancelReasonCode: "NO_SHOW" | "CANCEL";
        let cancelReasonText: string | undefined;

        if (reason === "NO_SHOW") {
          cancelReasonCode = "NO_SHOW";
        } else if (reason === "CANCEL_REQUESTED_BEFORE_START") {
          cancelReasonCode = "CANCEL";
          cancelReasonText = "출발 전 요청자 취소";
        } else if (reason === "OTHER") {
          cancelReasonCode = "CANCEL";
          cancelReasonText = otherTexts[student.id]?.trim();
        } else {
          throw new Error(`Invalid reason: ${reason}`);
        }

        return {
          participantId: student.id,
          pickupRequestId: student.pickup_request_id,
          cancelReasonCode,
          cancelReasonText,
        };
      });

      await onConfirm(cancellations);
      handleOpenChange(false);
    } catch (err) {
      console.error("취소 처리 에러:", err);
      setError("취소 처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>미도착 학생 취소 사유 선택</DialogTitle>
          <DialogDescription>
            픽업 장소에 도착하지 않은 학생의 취소 사유를 선택해주세요. 모든 학생의 사유를 선택해야 출발할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {unmetStudents.map((student, index) => {
            const pickupRequest = student.pickup_request;
            const selectedReason = selectedReasons[student.id] || "";
            const otherText = otherTexts[student.id] || "";

            return (
              <div key={student.id} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">#{index + 1}</span>
                  {pickupRequest && (
                    <div className="flex-1 text-sm text-muted-foreground">
                      <div>출발지: {pickupRequest.origin_text}</div>
                      <div>목적지: {pickupRequest.destination_text}</div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">취소 사유 선택</Label>
                  <RadioGroup
                    value={selectedReason}
                    onValueChange={(value) => handleReasonChange(student.id, value as CancelReason)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NO_SHOW" id={`no-show-${student.id}`} />
                      <Label
                        htmlFor={`no-show-${student.id}`}
                        className="font-normal cursor-pointer"
                      >
                        노쇼
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="CANCEL_REQUESTED_BEFORE_START"
                        id={`cancel-before-${student.id}`}
                      />
                      <Label
                        htmlFor={`cancel-before-${student.id}`}
                        className="font-normal cursor-pointer"
                      >
                        출발 전 요청자 취소
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="OTHER" id={`other-${student.id}`} />
                      <Label
                        htmlFor={`other-${student.id}`}
                        className="font-normal cursor-pointer"
                      >
                        기타
                      </Label>
                    </div>
                  </RadioGroup>

                  {selectedReason === "OTHER" && (
                    <div className="space-y-2">
                      <Label htmlFor={`other-text-${student.id}`} className="text-sm">
                        상세 사유 입력
                      </Label>
                      <Textarea
                        id={`other-text-${student.id}`}
                        placeholder="취소 사유를 입력해주세요"
                        value={otherText}
                        onChange={(e) => handleOtherTextChange(student.id, e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                처리 중...
              </>
            ) : (
              "확인"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
