/**
 * @file app/(routes)/trips/page.tsx
 * @description Trip 목록 페이지
 *
 * 주요 기능:
 * 1. 현재 제공자의 Trip 목록 조회
 * 2. 최신순 정렬
 * 3. 상태별 표시 (배지/색상)
 * 4. 빈 목록 처리
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getMyTrips Server Action 호출
 * - 카드 형태로 각 Trip 표시
 * - "새 Trip 생성" 버튼 제공
 *
 * @dependencies
 * - @/actions/trips: Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { getMyTrips } from "@/actions/trips";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Lock, Users, UserPlus } from "lucide-react";
import { formatDateTime, formatDateTimeShort } from "@/lib/utils";

// 상태별 배지 스타일
const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  OPEN: { label: "오픈", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  LOCKED: { label: "마감", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  IN_PROGRESS: { label: "진행중", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  ARRIVED: { label: "도착", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  COMPLETED: { label: "완료", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  CANCELLED: { label: "취소됨", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const result = await getMyTrips();

  if (!result.success) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 진행중 Trip만 필터링 (ARRIVED, COMPLETED, CANCELLED 제외)
  const trips = (result.data || []).filter(
    (trip: any) => !["ARRIVED", "COMPLETED", "CANCELLED"].includes(trip.status)
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">픽업제공</h1>
          <p className="text-muted-foreground text-sm mt-1">
            생성한 픽업 세션 목록을 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/trips/new">
              <Plus className="mr-2 h-4 w-4" />
              새 픽업 제공
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/trips/completed">
              픽업 제공 완료
            </Link>
          </Button>
        </div>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground mb-4">
              생성한 픽업제공이 없습니다.
            </p>
            <Button asChild>
              <Link href="/trips/new">
                <Plus className="mr-2 h-4 w-4" />
                첫 픽업 제공 생성하기
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip: any) => {
            const statusInfo = statusConfig[trip.status] || {
              label: trip.status,
              className: "bg-gray-100 text-gray-800",
            };

            // 초대하기 버튼 활성 조건 계산
            const now = new Date();
            const scheduledStart = trip.scheduled_start_at
              ? new Date(trip.scheduled_start_at)
              : null;
            const lockTime = scheduledStart
              ? new Date(scheduledStart.getTime() - 30 * 60 * 1000) // 30분 전
              : null;

            const canInvite =
              trip.status === "OPEN" &&
              !trip.is_locked &&
              scheduledStart &&
              now < lockTime;

            const inviteButtonText = trip.status === "LOCKED" || trip.is_locked
              ? "초대 불가 (마감됨)"
              : scheduledStart && now >= lockTime
                ? "초대 불가 (출발 30분 전)"
                : "초대하기";

            return (
              <Card key={trip.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {trip.title || `픽업제공 #${trip.id.slice(0, 8)}`}
                      </CardTitle>
                      <CardDescription className="mt-1 space-y-1">
                        {trip.scheduled_start_at && (
                          <div>
                            출발 예정: {formatDateTime(trip.scheduled_start_at)}
                          </div>
                        )}
                        <div>
                          {formatDateTimeShort(trip.created_at, "생성:")}
                        </div>
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
                          {/* 나중에 trip_participants 조인으로 실제 참여자 수 표시 */}
                          0 / {trip.capacity}
                        </span>
                      </div>
                      {(trip.status === "LOCKED" || trip.is_locked) && (
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-yellow-600" />
                          <span className="text-yellow-600 font-medium">LOCK</span>
                        </div>
                      )}
                    </div>
                    {trip.start_at && (
                      <div className="text-sm text-muted-foreground">
                        실제 출발 시간: {formatDateTime(trip.start_at)}
                      </div>
                    )}
                    {trip.arrived_at && (
                      <div className="text-sm text-muted-foreground">
                        도착 시간: {formatDateTime(trip.arrived_at)}
                      </div>
                    )}
                    {trip.status === "COMPLETED" && (trip.arrived_at || trip.completed_at) && (
                      <div className="text-sm font-medium text-green-700 dark:text-green-300">
                        완료 시간: {formatDateTime(trip.arrived_at || trip.completed_at || "")}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full"
                      disabled={!canInvite}
                    >
                      <Link href={`/trips/${trip.id}/invite`}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        {inviteButtonText}
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="default"
                      className="w-full"
                    >
                      <Link href={`/trips/${trip.id}`}>
                        상세 보기
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

