/**
 * @file components/calendar/time-slot-picker.tsx
 * @description 시간 슬롯 선택 컴포넌트
 *
 * 주요 기능:
 * 1. 30분 단위 시간 슬롯 표시
 * 2. 그리드 레이아웃 (4열)
 * 3. 과거 시간 비활성화
 * 4. 선택된 시간 표시
 *
 * 핵심 구현 로직:
 * - 00:00 ~ 23:30까지 30분 단위로 생성
 * - 선택된 날짜와 현재 시간 비교
 * - 과거 시간은 비활성화
 *
 * @dependencies
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TimeSlotPickerProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  className?: string;
}

/**
 * 시간 슬롯 선택 컴포넌트
 *
 * 30분 단위로 시간 슬롯을 표시하고 선택할 수 있게 합니다.
 * 예: 00:00, 00:30, 01:00, 01:30, ..., 23:30
 */
export function TimeSlotPicker({
  selectedDate,
  selectedTime,
  onTimeSelect,
  className,
}: TimeSlotPickerProps) {
  // 30분 단위 시간 슬롯 생성 (00:00 ~ 23:30)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        slots.push(timeStr);
      }
    }
    return slots;
  }, []);

  // 시간 슬롯이 비활성화되어야 하는지 확인
  const isTimeDisabled = (time: string): boolean => {
    if (!selectedDate) return true;

    // 선택된 날짜와 시간을 결합
    const [hours, minutes] = time.split(":").map(Number);
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(hours, minutes, 0, 0);

    // 현재 시간과 비교
    const now = new Date();
    return slotDateTime <= now;
  };

  // 시간 포맷팅 (오전/오후)
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours < 12 ? "오전" : "오후";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${period} ${displayHours}:${String(minutes).padStart(2, "0")}`;
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">시간 선택</h3>
        <p className="text-xs text-muted-foreground">
          30분 단위로 시간을 선택해주세요.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
        {timeSlots.map((time) => {
          const isDisabled = isTimeDisabled(time);
          const isSelected = selectedTime === time;

          return (
            <Button
              key={time}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              disabled={isDisabled}
              onClick={() => !isDisabled && onTimeSelect(time)}
              className={cn(
                "text-xs",
                isDisabled && "opacity-50 cursor-not-allowed",
                isSelected && "bg-primary text-primary-foreground"
              )}
            >
              {formatTime(time)}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
