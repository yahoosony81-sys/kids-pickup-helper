/**
 * @file app/(routes)/pickup-requests/new/page.tsx
 * @description 픽업 요청 등록 페이지
 *
 * 주요 기능:
 * 1. 픽업 시간 선택
 * 2. 출발지/목적지 선택 (네이버 지도 검색)
 * 3. 폼 유효성 검사 (Zod)
 * 4. Server Action으로 데이터 저장
 *
 * 핵심 구현 로직:
 * - React Hook Form + Zod resolver로 폼 관리
 * - shadcn/ui Form 컴포넌트 사용
 * - 네이버 지도 검색 컴포넌트 연동
 * - 제출 성공 시 목록 페이지로 리다이렉트
 *
 * @dependencies
 * - react-hook-form: 폼 상태 관리
 * - @hookform/resolvers/zod: Zod 스키마 resolver
 * - @/components/map/naver-map-search: 지도 검색 컴포넌트
 * - @/actions/pickup-requests: Server Action
 */

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  pickupRequestSchema,
  type PickupRequestFormData,
} from "@/lib/validations/pickup-request";
import { createPickupRequest } from "@/actions/pickup-requests";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NaverMapSearch } from "@/components/map/naver-map-search";
import { Loader2 } from "lucide-react";
import { PickupCalendar } from "@/components/calendar/pickup-calendar";
import { TimeSlotPicker } from "@/components/calendar/time-slot-picker";
import {
  getCalendarStatsForRequestCreate,
  type CalendarStat,
} from "@/actions/calendar-stats";

export default function NewPickupRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarStats, setCalendarStats] = useState<CalendarStat[]>([]);

  // 현재 월의 집계 데이터 로드
  useEffect(() => {
    const loadStats = async () => {
      // setIsLoadingStats(true);
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
      const result = await getCalendarStatsForRequestCreate(monthStr);
      if (result.success) {
        setCalendarStats(result.data);
      }
      // setIsLoadingStats(false);
    };
    loadStats();
  }, [currentMonth]);

  const form = useForm<PickupRequestFormData>({
    resolver: zodResolver(pickupRequestSchema),
    defaultValues: {
      pickup_time: "",
      origin_text: "",
      origin_lat: 0,
      origin_lng: 0,
      destination_text: "",
      destination_lat: 0,
      destination_lng: 0,
    },
  });

  // 날짜 선택 핸들러
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null); // 날짜 변경 시 시간 초기화
  };

  // 시간 선택 핸들러
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    // 날짜와 시간을 결합하여 pickup_time 필드에 설정
    if (selectedDate) {
      const [hours, minutes] = time.split(":").map(Number);
      const dateTime = new Date(selectedDate);
      dateTime.setHours(hours, minutes, 0, 0);
      // YYYY-MM-DDTHH:mm 형식으로 변환
      const year = dateTime.getFullYear();
      const month = String(dateTime.getMonth() + 1).padStart(2, "0");
      const day = String(dateTime.getDate()).padStart(2, "0");
      const hoursStr = String(hours).padStart(2, "0");
      const minutesStr = String(minutes).padStart(2, "0");
      const dateTimeStr = `${year}-${month}-${day}T${hoursStr}:${minutesStr}`;
      form.setValue("pickup_time", dateTimeStr);
    }
  };

  const onSubmit = async (data: PickupRequestFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createPickupRequest(data);

      if (!result.success) {
        setSubmitError(result.error || "픽업 요청 등록에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }

      // 성공 시 마이페이지로 리다이렉트
      router.push("/my");
    } catch (error) {
      console.error("폼 제출 에러:", error);
      setSubmitError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>픽업 요청 등록</CardTitle>
          <CardDescription>
            픽업 시간과 출발지, 목적지를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 픽업 시간 선택 (달력 + 시간 슬롯) */}
              <FormField
                control={form.control}
                name="pickup_time"
                render={() => (
                  <FormItem>
                    <FormLabel>픽업 시간</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {/* 달력 */}
                        <div className="border rounded-lg p-4">
                          <PickupCalendar
                            mode="create-request"
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            onDateClick={handleDateClick}
                            stats={calendarStats}
                          />
                        </div>
                        {/* 시간 슬롯 선택 */}
                        {selectedDate && (
                          <div className="border rounded-lg p-4">
                            <TimeSlotPicker
                              selectedDate={selectedDate}
                              selectedTime={selectedTime}
                              onTimeSelect={handleTimeSelect}
                            />
                          </div>
                        )}
                        {/* 선택된 날짜/시간 표시 */}
                        {selectedDate && selectedTime && (
                          <div className="text-sm text-muted-foreground">
                            선택된 시간: {selectedDate.toLocaleDateString("ko-KR")} {selectedTime}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 출발지 */}
              <FormField
                control={form.control}
                name="origin_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>출발지</FormLabel>
                    <FormControl>
                      <NaverMapSearch
                        label="출발지"
                        value={
                          form.watch("origin_lat") && form.watch("origin_lng")
                            ? {
                              text: field.value,
                              lat: form.watch("origin_lat"),
                              lng: form.watch("origin_lng"),
                            }
                            : null
                        }
                        onChange={(value) => {
                          form.setValue("origin_text", value.text);
                          form.setValue("origin_lat", value.lat);
                          form.setValue("origin_lng", value.lng);
                        }}
                        error={form.formState.errors.origin_text?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 목적지 */}
              <FormField
                control={form.control}
                name="destination_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>목적지</FormLabel>
                    <FormControl>
                      <NaverMapSearch
                        label="목적지"
                        value={
                          form.watch("destination_lat") &&
                            form.watch("destination_lng")
                            ? {
                              text: field.value,
                              lat: form.watch("destination_lat"),
                              lng: form.watch("destination_lng"),
                            }
                            : null
                        }
                        onChange={(value) => {
                          form.setValue("destination_text", value.text);
                          form.setValue("destination_lat", value.lat);
                          form.setValue("destination_lng", value.lng);
                        }}
                        error={form.formState.errors.destination_text?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  등록하기
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

