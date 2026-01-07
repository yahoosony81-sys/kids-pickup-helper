/**
 * @file app/(routes)/invitations/[invitationId]/page.tsx
 * @description 초대 상세 페이지
 *
 * 주요 기능:
 * 1. 초대 조회 및 소유자 확인
 * 2. 초대 상세 정보 표시
 * 3. 초대 수락 후 정확한 주소/좌표 공개 (PRD 규칙)
 * 4. 수락/거절 버튼 제공
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getInvitationById Server Action 호출
 * - 초대 소유자 확인 (요청자만 접근 가능)
 * - 초대 상태에 따라 UI 표시 변경
 * - PENDING 상태일 때만 수락/거절 버튼 표시
 *
 * @dependencies
 * - @/actions/invitations: getInvitationById Server Action
 * - @/components/invitations/accept-reject-buttons: 수락/거절 버튼 컴포넌트
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { getInvitationById } from "@/actions/invitations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AcceptRejectButtons } from "@/components/invitations/accept-reject-buttons";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Calendar, AlertCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface InvitationDetailPageProps {
  params: Promise<{ invitationId: string }>;
}

// 초대 상태별 배지 설정
const invitationStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: "대기 중",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  ACCEPTED: {
    label: "수락됨",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  REJECTED: {
    label: "거절됨",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
  EXPIRED: {
    label: "만료됨",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

export default async function InvitationDetailPage({
  params,
}: InvitationDetailPageProps) {
  const { invitationId } = await params;
  const result = await getInvitationById(invitationId);

  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{result.error || "초대를 찾을 수 없습니다."}</p>
            </div>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/pickup-requests">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  픽업 요청 목록으로
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invitation = result.data;
  const pickupRequest = invitation.pickup_request as any;
  const trip = invitation.trip as any;

  const statusInfo =
    invitationStatusConfig[invitation.status] ||
    invitationStatusConfig["PENDING"];

  // 초대 만료 여부 확인
  const now = new Date();
  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt < now;

  // 초대 수락 후 정확한 주소/좌표 공개 (PRD 규칙)
  const isAccepted = invitation.status === "ACCEPTED";

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/pickup-requests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            픽업 요청 목록으로
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* 초대 상태 카드 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>초대 상세</CardTitle>
                <CardDescription className="mt-2">
                  초대 정보를 확인하고 수락 또는 거절할 수 있습니다.
                </CardDescription>
              </div>
              <span
                className={`px-3 py-1 rounded-md text-sm font-medium ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 초대 정보 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>초대 일시: {formatDateTime(invitation.created_at)}</span>
              </div>
              {invitation.status === "PENDING" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    만료 시간: {formatDateTime(invitation.expires_at)}
                    {isExpired && (
                      <span className="text-destructive ml-2">(만료됨)</span>
                    )}
                  </span>
                </div>
              )}
              {invitation.responded_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>응답 일시: {formatDateTime(invitation.responded_at)}</span>
                </div>
              )}
            </div>

            {/* 수락/거절 버튼 */}
            {invitation.status === "PENDING" && (
              <AcceptRejectButtons
                invitationId={invitationId}
                invitationStatus={invitation.status}
                isExpired={isExpired}
              />
            )}

            {/* 초대 상태별 메시지 */}
            {invitation.status === "ACCEPTED" && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  초대를 수락하셨습니다. 픽업이 진행될 예정입니다.
                </p>
              </div>
            )}
            {invitation.status === "REJECTED" && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-md">
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  초대를 거절하셨습니다.
                </p>
              </div>
            )}
            {invitation.status === "EXPIRED" && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">
                  이 초대는 만료되었습니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 픽업 요청 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>픽업 요청 정보</CardTitle>
            <CardDescription>
              {isAccepted
                ? "초대 수락 후 정확한 주소와 좌표가 공개되었습니다."
                : "초대 수락 후 정확한 주소와 좌표가 공개됩니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 픽업 시간 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">픽업 시간</span>
              </div>
              <p className="text-sm pl-6">
                {formatDateTime(pickupRequest?.pickup_time || "")}
              </p>
            </div>

            {/* 출발지 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">출발지</span>
              </div>
              {isAccepted ? (
                <div className="text-sm pl-6 space-y-1">
                  <p>{pickupRequest?.origin_text || "주소 정보 없음"}</p>
                  <p className="text-muted-foreground">
                    좌표: {pickupRequest?.origin_lat}, {pickupRequest?.origin_lng}
                  </p>
                </div>
              ) : (
                <p className="text-sm pl-6 text-muted-foreground">
                  초대 수락 후 정확한 주소가 공개됩니다.
                </p>
              )}
            </div>

            {/* 목적지 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">목적지</span>
              </div>
              {isAccepted ? (
                <div className="text-sm pl-6 space-y-1">
                  <p>{pickupRequest?.destination_text || "주소 정보 없음"}</p>
                  <p className="text-muted-foreground">
                    좌표: {pickupRequest?.destination_lat}, {pickupRequest?.destination_lng}
                  </p>
                </div>
              ) : (
                <p className="text-sm pl-6 text-muted-foreground">
                  초대 수락 후 정확한 주소가 공개됩니다.
                </p>
              )}
            </div>

            {/* 픽업 요청 상태 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">요청 상태</span>
              </div>
              <p className="text-sm pl-6">
                {pickupRequest?.status === "REQUESTED"
                  ? "요청됨"
                  : pickupRequest?.status === "MATCHED"
                    ? "매칭됨"
                    : pickupRequest?.status || "알 수 없음"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trip 정보 카드 (제공자 정보는 제외) */}
        <Card>
          <CardHeader>
            <CardTitle>Trip 정보</CardTitle>
            <CardDescription>이 초대가 포함된 Trip 정보입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Trip 상태</span>
              </div>
              <p className="text-sm pl-6">
                {trip?.status === "OPEN"
                  ? "오픈"
                  : trip?.status === "IN_PROGRESS"
                    ? "진행 중"
                    : trip?.status === "COMPLETED"
                      ? "완료"
                      : trip?.status === "ARRIVED"
                        ? "도착" // 기존 데이터 호환성 (Phase 8 이후에는 사용되지 않음)
                        : trip?.status === "CANCELLED"
                          ? "취소됨"
                          : trip?.status || "알 수 없음"}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">수용 인원</span>
              </div>
              <p className="text-sm pl-6">{trip?.capacity || 3}명</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">LOCK 상태</span>
              </div>
              <p className="text-sm pl-6">
                {trip?.is_locked ? "LOCK됨 (출발함)" : "UNLOCK (초대 가능)"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

