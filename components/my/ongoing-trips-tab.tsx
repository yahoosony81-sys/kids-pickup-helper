/**
 * @file components/my/ongoing-trips-tab.tsx
 * @description 진행중 픽업 제공 탭 컴포넌트
 *
 * 주요 기능:
 * 1. 진행중 픽업 제공 목록 표시
 * 2. 최소 정보 표시 (상태, 생성 시간 등)
 *
 * @dependencies
 * - @/components/ui/card: 카드 컴포넌트
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Lock, Users } from "lucide-react";
import { formatDateTimeShort } from "@/lib/utils";

// 상태별 배지 스타일
const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  OPEN: {
    label: "오픈",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  IN_PROGRESS: {
    label: "진행중",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
};

interface OngoingTripsTabProps {
  trips: any[];
}

export function OngoingTripsTab({ trips }: OngoingTripsTabProps) {
  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <p className="text-muted-foreground mb-4">
            진행중인 픽업 제공이 없습니다.
          </p>
          <Link href="/trips/new">
            <span className="text-primary hover:underline">
              새 픽업 제공 생성하기
            </span>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {trips.map((trip: any) => {
        const statusInfo = statusConfig[trip.status] || {
          label: trip.status,
          className: "bg-gray-100 text-gray-800",
        };

        return (
          <Card key={trip.id}>
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
                    출발 시간: {new Date(trip.start_at).toLocaleString("ko-KR")}
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
  );
}




