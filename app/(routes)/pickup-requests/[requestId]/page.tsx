/**
 * @file app/(routes)/pickup-requests/[requestId]/page.tsx
 * @description 픽업 요청 상세 페이지
 *
 * 주요 기능:
 * 1. 픽업 요청 정보 표시
 * 2. 받은 초대 목록 조회 및 표시
 * 3. 제공자 프로필 정보 표시 (이름, 사진, 한줄소개)
 * 4. 초대 수락 버튼 제공
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getPickupRequestById, getInvitationsForRequest Server Action 호출
 * - 요청자 본인만 접근 가능
 * - 초대 목록을 카드 형태로 표시
 * - PENDING 상태 초대에만 수락 버튼 표시
 *
 * @dependencies
 * - @/actions/pickup-requests: getPickupRequestById Server Action
 * - @/actions/invitations: getInvitationsForRequest Server Action
 * - @/components/invitations/invitation-card: 초대 카드 컴포넌트
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { getPickupRequestById } from "@/actions/pickup-requests";
import { getInvitationsForRequest } from "@/actions/invitations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, AlertCircle, User } from "lucide-react";
import { InvitationCard } from "@/components/invitations/invitation-card";

export const dynamic = "force-dynamic";

interface RequestDetailPageProps {
  params: Promise<{ requestId: string }>;
}

// 날짜 포맷팅 유틸리티 함수
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}

// 상태별 배지 스타일
const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  REQUESTED: { label: "요청됨", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  MATCHED: { label: "매칭됨", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  IN_PROGRESS: { label: "진행중", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  ARRIVED: { label: "도착", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  COMPLETED: { label: "완료", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  CANCELLED: { label: "취소됨", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { requestId } = await params;

  // 1. 픽업 요청 조회
  const requestResult = await getPickupRequestById(requestId);

  if (!requestResult.success || !requestResult.data) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{requestResult.error || "픽업 요청을 찾을 수 없습니다."}</p>
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

  const pickupRequest = requestResult.data;
  const statusInfo = statusConfig[pickupRequest.status] || {
    label: pickupRequest.status,
    className: "bg-gray-100 text-gray-800",
  };

  // 2. 초대 목록 조회
  const invitationsResult = await getInvitationsForRequest(requestId);

  if (!invitationsResult.success) {
    console.error("초대 목록 조회 실패:", invitationsResult.error);
  }

  const invitations = invitationsResult.data || [];

  // 디버깅 로그
  console.log("📋 [요청 상세 페이지] 초대 목록:", {
    requestId,
    invitationCount: invitations.length,
    invitations: invitations.map((inv: any) => ({
      id: inv.id,
      status: inv.status,
      providerName: inv.provider?.name,
    })),
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/pickup-requests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            픽업 요청 목록으로
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* 픽업 요청 정보 카드 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl">픽업 요청 정보</CardTitle>
                <CardDescription className="mt-1">
                  등록한 픽업 요청의 상세 정보입니다.
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
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">픽업 시간</p>
                <p className="text-base font-medium">{formatDateTime(pickupRequest.pickup_time)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">출발지</p>
                <p className="text-base">{pickupRequest.origin_text}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">목적지</p>
                <p className="text-base">{pickupRequest.destination_text}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 받은 초대 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">받은 초대</CardTitle>
            <CardDescription>
              제공자가 보낸 초대 목록입니다. 제공자 프로필을 확인하고 초대를 수락할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  아직 받은 초대가 없습니다.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  제공자가 초대를 보내면 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((invitation: any) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    requestId={requestId}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

