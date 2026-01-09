/**
 * @file app/(routes)/my/past-trips/page.tsx
 * @description 지난 픽업 제공 페이지
 *
 * 주요 기능:
 * 1. 완료된 픽업 제공 목록 조회 (ARRIVED, COMPLETED)
 * 2. 최신순 정렬
 * 3. 빈 상태 처리
 * 4. 상세 페이지 링크 제공
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getMyCompletedTrips Server Action 재사용 (이미 ARRIVED, COMPLETED 필터링)
 * - 최신순 정렬
 *
 * @dependencies
 * - @/actions/trips: getMyCompletedTrips Server Action
 * - @/components/ui/card: 카드 컴포넌트
 */

import { getMyCompletedTrips } from "@/actions/trips";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Lock, Users } from "lucide-react";
import { formatDateTime, formatDateTimeShort } from "@/lib/utils";

// 상태별 배지 스타일
const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
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

export const dynamic = "force-dynamic";

export default async function PastTripsPage() {
  const result = await getMyCompletedTrips();

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

  const pastTrips = result.data || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button asChild variant="outline" className="mb-4">
          <Link href="/my">
            <ArrowLeft className="mr-2 h-4 w-4" />
            마이페이지로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">지난 픽업 제공</h1>
        <p className="text-muted-foreground text-sm mt-1">
          완료된 픽업 제공 목록을 확인할 수 있습니다.
        </p>
      </div>

      {pastTrips.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground mb-4">
              완료된 픽업 제공이 없습니다.
            </p>
            <Button asChild variant="outline">
              <Link href="/my">마이페이지로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pastTrips.map((trip: any) => {
            const statusInfo = statusConfig[trip.status] || {
              label: trip.status,
              className: "bg-gray-100 text-gray-800",
            };

            return (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        픽업제공 #{trip.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {formatDateTimeShort(trip.created_at, "생성:")}
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
                    {trip.completed_at && (
                      <div className="text-sm font-medium text-green-700 dark:text-green-300">
                        완료 시간: {formatDateTime(trip.completed_at)}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/trips/${trip.id}`}>상세 보기</Link>
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



