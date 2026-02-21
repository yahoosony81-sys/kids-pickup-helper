/**
 * @file components/calendar/date-detail-drawer.tsx
 * @description 날짜별 상세 리스트 컴포넌트
 *
 * 주요 기능:
 * 1. 선택된 날짜의 요청/제공 리스트 표시
 * 2. Dialog 형태로 표시
 * 3. 기존 리스트 컴포넌트 재사용
 *
 * 핵심 구현 로직:
 * - 날짜별 필터링 (pickup_time 또는 scheduled_start_at 기준)
 * - 요청자/제공자 모드 구분
 * - 기존 리스트 컴포넌트 스타일 재사용
 *
 * @dependencies
 * - @/components/ui/dialog: Dialog 컴포넌트
 * - @/actions/pickup-requests: getMyPickupRequests
 * - @/actions/trips: getMyTrips
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, Lock } from "lucide-react";
import { formatDateTime, formatDateTimeShort } from "@/lib/utils";
import Link from "next/link";
import { getMyPickupRequests } from "@/actions/pickup-requests";
import { getMyTripsIncludingTest } from "@/actions/trips";

import {
  useRealtimeSubscription,
  subscribeToMyPickupRequests,
  subscribeToMyTrips,
  PickupRequestPayload,
  TripPayload
} from "@/lib/realtime";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";

export type DateDetailMode = "requests" | "provides";

export interface DateDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  mode: DateDetailMode;
  profileId?: string;
}

// 상태별 배지 스타일 (요청자)
const requestStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  REQUESTED: {
    label: "요청됨",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  MATCHED: {
    label: "매칭됨",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  IN_PROGRESS: {
    label: "진행중",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  EXPIRED: {
    label: "픽업시간 지남",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  ARRIVED: {
    label: "도착",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  COMPLETED: {
    label: "완료",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
};

// 상태별 배지 스타일 (제공자)
const tripStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  OPEN: {
    label: "출발전",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  LOCKED: {
    label: "출발전",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  IN_PROGRESS: {
    label: "진행중",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  EXPIRED: {
    label: "서비스 운행 무효",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  ARRIVED: {
    label: "도착",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  COMPLETED: {
    label: "완료",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
};

/**
 * 날짜별 상세 리스트 컴포넌트
 */
export function DateDetailDrawer({
  open,
  onOpenChange,
  date,
  mode,
  profileId,
}: DateDetailDrawerProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useClerkSupabaseClient();

  // Realtime 구독 (PRD Rule: pickup_requests | UPDATE | progress_stage 변경)
  useRealtimeSubscription<PickupRequestPayload>(
    useCallback(
      (handler, client) => {
        if (!profileId || mode !== "requests") return { unsubscribe: async () => "ok" } as any;
        return subscribeToMyPickupRequests(profileId, handler, client);
      },
      [profileId, mode]
    ),
    {
      client: supabase,
      onUpdate: (payload) => {
        const updated = payload.new as PickupRequestPayload;
        if (!updated.id) return;
        setRequests(prev => prev.map(req => req.id === updated.id ? { ...req, ...updated } : req));
      }
    }
  );

  // Realtime 구독 (PRD Rule: trips | UPDATE | status 변경)
  useRealtimeSubscription<TripPayload>(
    useCallback(
      (handler, client) => {
        if (!profileId || mode !== "provides") return { unsubscribe: async () => "ok" } as any;
        return subscribeToMyTrips(profileId, handler, client);
      },
      [profileId, mode]
    ),
    {
      client: supabase,
      onUpdate: (payload) => {
        const updated = payload.new as TripPayload;
        if (!updated.id) return;
        setTrips(prev => prev.map(trip => trip.id === updated.id ? { ...trip, ...updated } : trip));
      }
    }
  );


  // 날짜가 같은지 확인 (시간 제외)
  const isSameDate = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // 데이터 로드
  useEffect(() => {
    if (!open || !date) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (mode === "requests") {
          const result = await getMyPickupRequests();
          if (result.success) {
            // 날짜별 필터링
            const filtered = (result.data || []).filter((req: any) => {
              if (!req.pickup_time) return false;
              const requestDate = new Date(req.pickup_time);
              return isSameDate(requestDate, date);
            });
            setRequests(filtered);
          } else {
            setError(result.error || "데이터를 불러오는데 실패했습니다.");
          }
        } else {
          // 마이페이지 캘린더에서는 테스트 카드도 포함
          const result = await getMyTripsIncludingTest();
          if (result.success) {
            // 날짜별 필터링 (scheduled_start_at 기준, 없으면 created_at fallback)
            const filtered = (result.data || []).filter((trip: any) => {
              // scheduled_start_at이 있으면 사용, 없으면 created_at을 fallback으로 사용
              const dateToUse = trip.scheduled_start_at || trip.created_at;
              if (!dateToUse) return false;
              const tripDate = new Date(dateToUse);
              return isSameDate(tripDate, date);
            });

            setTrips(filtered);
          } else {
            setError(result.error || "데이터를 불러오는데 실패했습니다.");
          }
        }
      } catch (err) {
        console.error("데이터 로드 에러:", err);
        setError("예상치 못한 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [open, date, mode]);

  if (!date) return null;

  const dateStr = date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const renderTripList = (tripList: any[]) => (
    <div className="space-y-4">
      {tripList.map((trip: any) => {
        const statusInfo =
          tripStatusConfig[trip.status] || {
            label: trip.status,
            className: "bg-gray-100 text-gray-800",
          };

        return (
          <Card key={trip.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {trip.title || `픽업제공 #${trip.id.slice(0, 8)}`}
                    </CardTitle>
                    {trip.is_test && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        테스트
                      </span>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {trip.scheduled_start_at &&
                      formatDateTime(trip.scheduled_start_at)}
                  </CardDescription>
                </div>
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium ${statusInfo.className}`}
                >
                  {statusInfo.label}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">수용 인원:</span>
                    <span className="font-medium">
                      {trip.trip_participants?.length || 0} / {trip.capacity}
                    </span>
                  </div>
                  {trip.is_locked && (
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-yellow-600" />
                      <span className="text-yellow-600 font-medium">LOCK</span>
                    </div>
                  )}
                </div>
                {trip.start_at && (
                  <div className="text-sm text-muted-foreground">
                    출발 시간: {formatDateTime(trip.start_at)}
                  </div>
                )}
                {trip.arrived_at && (
                  <div className="text-sm text-muted-foreground">
                    도착 시간: {formatDateTime(trip.arrived_at)}
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t">
                {(!trip.trip_participants || trip.trip_participants.length === 0) ? (
                  <Link
                    href={`/trips/${trip.id}/invite`}
                    className="text-sm text-primary hover:underline"
                  >
                    요청자 리스트 보기
                  </Link>
                ) : (
                  <Link
                    href={`/trips/${trip.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    상세 보기 →
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "requests" ? "픽업 요청" : "픽업 제공"} - {dateStr}
          </DialogTitle>
          <DialogDescription>
            {mode === "requests"
              ? "해당 날짜의 픽업 요청 목록입니다."
              : "해당 날짜의 픽업 제공 목록입니다."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">{error}</p>
          </div>
        ) : mode === "requests" ? (
          requests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                해당 날짜에 픽업 요청이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request: any) => {
                const statusInfo =
                  requestStatusConfig[request.status] || {
                    label: request.status,
                    className: "bg-gray-100 text-gray-800",
                  };

                return (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <Link
                          href={`/pickup-requests/${request.id}`}
                          className="flex-1"
                        >
                          <CardTitle className="text-lg hover:text-primary transition-colors">
                            {formatDateTime(request.pickup_time)}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {formatDateTimeShort(request.created_at)}
                          </CardDescription>
                        </Link>
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">출발지</p>
                            <p className="text-sm text-muted-foreground">
                              {request.origin_text}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">목적지</p>
                            <p className="text-sm text-muted-foreground">
                              {request.destination_text}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <Link
                          href={`/pickup-requests/${request.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          상세 보기 →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : trips.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              해당 날짜에 픽업 제공이 없습니다.
            </p>
          </div>
        ) : (
          (() => {
            const newTrips = trips.filter(
              (t) => !t.trip_participants || t.trip_participants.length === 0
            );
            const activeTrips = trips.filter(
              (t) => t.trip_participants && t.trip_participants.length > 0
            );

            if (newTrips.length > 0 && activeTrips.length > 0) {
              return (
                <Tabs defaultValue="new" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="new">
                      모집 중 ({newTrips.length})
                    </TabsTrigger>
                    <TabsTrigger value="active">
                      진행 중 ({activeTrips.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="new">
                    {renderTripList(newTrips)}
                  </TabsContent>
                  <TabsContent value="active">
                    {renderTripList(activeTrips)}
                  </TabsContent>
                </Tabs>
              );
            }

            return renderTripList(trips);
          })()
        )}
      </DialogContent>
    </Dialog>
  );
}
