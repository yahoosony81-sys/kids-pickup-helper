/**
 * @file components/my/ongoing-requests-tab.tsx
 * @description 진행중 픽업 요청 탭 컴포넌트
 *
 * 주요 기능:
 * 1. 진행중 픽업 요청 목록 표시
 * 2. 각 요청 카드 아래에 제공자 프로필 박스 리스트 표시
 * 3. 제공자 정렬: invitation.created_at ASC (시간순)
 * 4. 수락 후 나머지 제공자 박스 즉시 숨김 처리
 *
 * @dependencies
 * - @/actions/invitations: getInvitationsForRequest Server Action
 * - @/components/invitations/invitation-card: 초대 카드 컴포넌트
 */

import { getInvitationsForRequest } from "@/actions/invitations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvitationCard } from "@/components/invitations/invitation-card";
import { MapPin } from "lucide-react";
import { formatDateTime, formatDateTimeShort } from "@/lib/utils";
import Link from "next/link";

// 상태별 배지 스타일
const statusConfig: Record<
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
};

interface OngoingRequestsTabProps {
  requests: any[];
}

export async function OngoingRequestsTab({
  requests,
}: OngoingRequestsTabProps) {
  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <p className="text-muted-foreground mb-4">
            진행중인 픽업 요청이 없습니다.
          </p>
          <Link href="/pickup-requests/new">
            <span className="text-primary hover:underline">
              새 픽업 요청 등록하기
            </span>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {await Promise.all(
        requests.map(async (request: any) => {
          const statusInfo = statusConfig[request.status] || {
            label: request.status,
            className: "bg-gray-100 text-gray-800",
          };

          // 초대 목록 조회
          const invitationsResult = await getInvitationsForRequest(
            request.id
          );
          const invitations = invitationsResult.success
            ? invitationsResult.data || []
            : [];

          // 초대 만료 여부 확인 함수
          const isExpired = (expiresAt: string) => {
            const now = new Date();
            const expires = new Date(expiresAt);
            return expires < now;
          };

          // 필터링 및 정렬된 초대 목록
          // MATCHED 상태면 제공자 섹션 숨김
          // REQUESTED 상태면 PENDING 초대만 표시 (만료되지 않은 것만)
          // 시간순 정렬: created_at ASC
          const filteredInvitations = invitations
            .filter((inv: any) => {
              // MATCHED 상태면 제공자 섹션 숨김
              if (
                request.status === "MATCHED" ||
                request.status === "IN_PROGRESS"
              ) {
                return false;
              }
              // REQUESTED 상태면 PENDING 초대만 표시 (만료되지 않은 것만)
              return inv.status === "PENDING" && !isExpired(inv.expires_at);
            })
            .sort(
              (a: any, b: any) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );

          return (
            <div key={request.id} className="space-y-4">
              <Card className="hover:shadow-md transition-shadow">
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

                    {/* 제공자 선택 섹션 */}
                    {filteredInvitations.length > 0 && (
                      <div className="pt-3 border-t space-y-3">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          제공자 선택
                        </p>
                        {filteredInvitations.map((invitation: any) => (
                          <InvitationCard
                            key={invitation.id}
                            invitation={invitation}
                            requestId={request.id}
                          />
                        ))}
                      </div>
                    )}

                    {/* 매칭 완료된 경우 선택된 제공자만 표시 */}
                    {request.status === "MATCHED" && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          매칭 완료
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })
      )}
    </div>
  );
}

