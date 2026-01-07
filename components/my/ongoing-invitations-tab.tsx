/**
 * @file components/my/ongoing-invitations-tab.tsx
 * @description 진행중 초대 탭 컴포넌트 (그룹별 표시)
 *
 * 주요 기능:
 * 1. 내가 보낸 초대 목록을 그룹(trip)별로 표시
 * 2. 그룹 제목 및 출발 예정 시각 표시
 * 3. 그룹 아래 초대된 요청자 리스트 표시 (상태 라벨 포함)
 *
 * @dependencies
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock, MapPin, CheckCircle2, Users } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

// 상태별 배지 스타일
const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "수락 대기 중",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: <Clock className="h-3 w-3" />,
  },
  ACCEPTED: {
    label: "매칭 완료",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  EXPIRED: {
    label: "마감됨",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    icon: <Clock className="h-3 w-3" />,
  },
};

interface OngoingInvitationsTabProps {
  invitations: any[];
}

/**
 * 초대 상태에 따른 라벨 결정
 * - PENDING → "수락 대기 중"
 * - ACCEPTED → "매칭 완료"
 * - EXPIRED → "마감됨"
 */
function getStatusLabel(invitation: any): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  const status = invitation.status;
  return statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800",
    icon: null,
  };
}

export function OngoingInvitationsTab({
  invitations,
}: OngoingInvitationsTabProps) {
  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <p className="text-muted-foreground mb-4">
            진행중인 초대가 없습니다.
          </p>
          <p className="text-sm text-muted-foreground">
            픽업 제공 페이지에서 요청자에게 초대를 보내면 여기에 표시됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 그룹(trip)별로 초대 목록 그룹화
  const groupedByTrip = invitations.reduce((acc, invitation) => {
    const tripId = invitation.trip_id || invitation.trip?.id;
    if (!tripId) return acc;

    if (!acc[tripId]) {
      acc[tripId] = {
        trip: invitation.trip,
        invitations: [],
      };
    }
    acc[tripId].invitations.push(invitation);
    return acc;
  }, {} as Record<string, { trip: any; invitations: any[] }>);

  // 그룹을 출발 예정 시각 기준으로 정렬 (최신순)
  const sortedGroups = Object.values(groupedByTrip).sort((a, b) => {
    const aTime = a.trip?.scheduled_start_at
      ? new Date(a.trip.scheduled_start_at).getTime()
      : 0;
    const bTime = b.trip?.scheduled_start_at
      ? new Date(b.trip.scheduled_start_at).getTime()
      : 0;
    return bTime - aTime; // 최신순
  });

  return (
    <div className="space-y-6">
      {sortedGroups.map((group) => {
        const trip = group.trip;
        const groupTitle = trip?.title || `픽업 그룹 #${trip?.id?.slice(0, 8) || "알 수 없음"}`;
        const scheduledStart = trip?.scheduled_start_at;

        return (
          <Card key={trip?.id || "unknown"}>
            <CardHeader>
              <CardTitle className="text-lg">{groupTitle}</CardTitle>
              <CardDescription className="mt-1">
                {scheduledStart && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>출발 예정: {formatDateTime(scheduledStart)}</span>
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.invitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    초대된 요청자가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Users className="h-4 w-4" />
                      <span>초대된 요청자 ({group.invitations.length}명)</span>
                    </div>
                    {group.invitations.map((invitation: any) => {
                      const statusInfo = getStatusLabel(invitation);
                      const pickupRequest = invitation.pickup_request;

                      return (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 border rounded-md bg-muted/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">
                                {pickupRequest?.origin_text || "출발지 정보 없음"}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">
                                {pickupRequest?.destination_text || "목적지 정보 없음"}
                              </span>
                            </div>
                            {pickupRequest?.pickup_time && (
                              <div className="text-xs text-muted-foreground mt-1">
                                요청 시간: {formatDateTime(pickupRequest.pickup_time)}
                              </div>
                            )}
                          </div>
                          <span
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusInfo.className}`}
                          >
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {trip?.id && (
                <div className="mt-4 pt-4 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/trips/${trip.id}`}>
                      그룹 상세 보기
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

