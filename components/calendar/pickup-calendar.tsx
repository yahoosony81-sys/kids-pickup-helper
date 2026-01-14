/**
 * @file components/calendar/pickup-calendar.tsx
 * @description 공통 달력 컴포넌트
 *
 * 주요 기능:
 * 1. 월 단위 달력 표시
 * 2. 날짜별 집계 데이터 표시
 * 3. 날짜 클릭 이벤트 처리
 * 4. 모드별 동작 (생성/조회)
 *
 * 핵심 구현 로직:
 * - react-day-picker 기반
 * - 날짜 셀 커스터마이징 (건수 표시)
 * - 과거 날짜 비활성화 (create 모드)
 * - 상태별 색상 구분
 *
 * @dependencies
 * - react-day-picker: 달력 라이브러리
 */

"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarStat } from "@/actions/calendar-stats";
import "react-day-picker/dist/style.css";

export type CalendarMode =
  | "create-request"
  | "create-provide"
  | "view-requests"
  | "view-provides";

export interface PickupCalendarProps {
  mode: CalendarMode;
  month: Date;
  onMonthChange: (month: Date) => void;
  onDateClick: (date: Date) => void;
  stats: CalendarStat[];
  disabledDates?: (date: Date) => boolean;
  className?: string;
}

/**
 * 공통 달력 컴포넌트
 */
export function PickupCalendar({
  mode,
  month,
  onMonthChange,
  onDateClick,
  stats,
  disabledDates,
  className,
}: PickupCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // stats를 Map으로 변환 (빠른 조회)
  const statsMap = new Map<string, CalendarStat>();
  for (const stat of stats) {
    statsMap.set(stat.date, stat);
  }

  // 날짜 포맷팅 (YYYY-MM-DD)
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // 날짜가 비활성화되어야 하는지 확인
  const isDateDisabled = (date: Date): boolean => {
    // create 모드에서는 과거 날짜 비활성화
    if (mode === "create-request" || mode === "create-provide") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      if (checkDate < today) {
        return true;
      }
    }

    // 커스텀 disabledDates 함수
    if (disabledDates) {
      return disabledDates(date);
    }

    return false;
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    if (isDateDisabled(date)) return;

    setSelectedDate(date);
    onDateClick(date);
  };

  // 날짜별 모디파이어 (집계 데이터가 있는 날짜)
  const modifiers = {
    hasStats: (date: Date) => {
      const dateKey = formatDateKey(date);
      const stat = statsMap.get(dateKey);
      return stat ? stat.count > 0 : false;
    },
    hasOngoing: (date: Date) => {
      const dateKey = formatDateKey(date);
      const stat = statsMap.get(dateKey);
      if (!stat || !stat.statuses) return false;
      return stat.statuses.some((s) =>
        ["REQUESTED", "MATCHED", "IN_PROGRESS", "OPEN", "LOCKED"].includes(s)
      );
    },
  };

  // 날짜 셀에 배지 표시 여부 확인
  const shouldShowBadge = (date: Date): boolean => {
    // view-requests, view-provides 모드에서만 표시
    if (mode !== "view-requests" && mode !== "view-provides") {
      return false;
    }
    const dateKey = formatDateKey(date);
    const stat = statsMap.get(dateKey);
    return stat ? stat.count > 0 : false;
  };

  // 날짜 셀의 건수 가져오기
  const getDateCount = (date: Date): number => {
    const dateKey = formatDateKey(date);
    const stat = statsMap.get(dateKey);
    return stat ? stat.count : 0;
  };

  return (
    <div className={cn("w-full", className)}>
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={handleDateClick}
        month={month}
        onMonthChange={onMonthChange}
        disabled={isDateDisabled}
        modifiers={modifiers}
        modifiersClassNames={{
          hasStats: "relative",
          hasOngoing: "bg-primary/10 text-primary font-medium",
        }}
        components={{
          Chevron: ({ orientation, className, ...props }) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/528c9e7e-7e59-428c-bfd2-4d73065ea0ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pickup-calendar.tsx:152',message:'Chevron render',data:{orientation,hasClassName:!!className,propsKeys:Object.keys(props)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
            // Chevron은 단순히 아이콘만 렌더링 (DayPicker가 이미 button을 렌더링함)
            if (orientation === "left") {
              return <ChevronLeft className={cn("h-4 w-4", className)} {...props} />;
            }
            return <ChevronRight className={cn("h-4 w-4", className)} {...props} />;
          },
          Day: (props) => {
            const { day, modifiers: dayModifiers, ...restProps } = props as any;
          
            // ✅ day가 { date: Date } 이든 Date 이든 모두 대응
            const date: Date = (day?.date ?? day) as Date;
          
            const showBadge = shouldShowBadge(date);
            const count = getDateCount(date);
          
            // td에 적용할 props (role, className 등)
            const { className: tdClassName, ...tdProps } = restProps;
          
            // button에 적용할 props
            const buttonClassName = cn(
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative",
              props.className
            );
          
            return (
              <td {...tdProps} role="gridcell" className={tdClassName}>
                <button
                  className={buttonClassName}
                  onClick={restProps.onClick}
                  onKeyDown={restProps.onKeyDown}
                  disabled={!!dayModifiers?.disabled}

                  aria-selected={restProps["aria-selected"]}
                  aria-label={restProps["aria-label"]}
                  data-day={restProps["data-day"]}
                  data-month={restProps["data-month"]}
                  data-selected={restProps["data-selected"]}
                  data-disabled={restProps["data-disabled"]}
                  data-hidden={restProps["data-hidden"]}
                  data-outside={restProps["data-outside"]}
                  data-focused={restProps["data-focused"]}
                  data-today={restProps["data-today"]}
                >
                  {date.getDate()}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center leading-none z-10">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              </td>
            );
          },
          
        }}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: cn(
            "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20"
          ),
          day: cn("h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative"),
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
      />
      {/* 선택된 날짜의 집계 정보 표시 */}
      {selectedDate && (() => {
        const dateKey = formatDateKey(selectedDate);
        const stat = statsMap.get(dateKey);
        if (stat && stat.count > 0) {
          return (
            <div className="mt-4 text-sm text-center text-muted-foreground p-2 bg-muted/50 rounded-md">
              {mode === "create-request" && `제공자 ${stat.count}명`}
              {mode === "create-provide" && `요청자 ${stat.count}명`}
              {mode === "view-requests" && `요청 ${stat.count}건`}
              {mode === "view-provides" && `제공 ${stat.count}건`}
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
