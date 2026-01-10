/**
 * @file components/my/calendar-view.tsx
 * @description 마이페이지 달력 뷰 컴포넌트
 *
 * 주요 기능:
 * 1. 달력 기본 화면 표시
 * 2. 날짜 클릭 시 상세 리스트 표시
 * 3. 요청자/제공자 모드 구분
 *
 * 핵심 구현 로직:
 * - 클라이언트 컴포넌트로 구현
 * - 집계 데이터를 서버에서 가져와서 표시
 * - 날짜 클릭 시 DateDetailDrawer 표시
 *
 * @dependencies
 * - @/components/calendar/pickup-calendar: 공통 달력 컴포넌트
 * - @/components/calendar/date-detail-drawer: 날짜별 상세 리스트
 * - @/actions/calendar-stats: 집계 서버 함수
 */

"use client";

import { useState, useEffect } from "react";
import { PickupCalendar } from "@/components/calendar/pickup-calendar";
import { DateDetailDrawer } from "@/components/calendar/date-detail-drawer";
import {
  getMyRequestCalendarStats,
  getMyProvideCalendarStats,
  type CalendarStat,
} from "@/actions/calendar-stats";

export type CalendarViewMode = "requests" | "provides";

export interface CalendarViewProps {
  mode: CalendarViewMode;
  initialMonth?: Date;
  initialSelectedDate?: Date | null;
}

/**
 * 마이페이지 달력 뷰 컴포넌트
 */
export function CalendarView({ 
  mode, 
  initialMonth,
  initialSelectedDate 
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialSelectedDate || null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [calendarStats, setCalendarStats] = useState<CalendarStat[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // 초기 선택된 날짜가 있으면 Drawer 자동 열기
  useEffect(() => {
    if (initialSelectedDate && !isDrawerOpen) {
      setIsDrawerOpen(true);
    }
  }, [initialSelectedDate, isDrawerOpen]);

  // 현재 월의 집계 데이터 로드
  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
      
      let result;
      if (mode === "requests") {
        result = await getMyRequestCalendarStats(monthStr);
      } else {
        result = await getMyProvideCalendarStats(monthStr);
      }

      if (result.success) {
        setCalendarStats(result.data);
      }
      setIsLoadingStats(false);
    };
    loadStats();
  }, [currentMonth, mode]);

  // 날짜 클릭 핸들러
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDrawerOpen(true);
  };

  return (
    <div className="w-full">
      <div className="border rounded-lg p-4">
        <PickupCalendar
          mode={mode === "requests" ? "view-requests" : "view-provides"}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          onDateClick={handleDateClick}
          stats={calendarStats}
        />
      </div>

      {/* 날짜별 상세 리스트 Drawer */}
      <DateDetailDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        date={selectedDate}
        mode={mode}
      />
    </div>
  );
}
