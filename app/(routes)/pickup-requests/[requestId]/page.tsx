/**
 * @file app/(routes)/pickup-requests/[requestId]/page.tsx
 * @description 픽업 요청 상세 페이지
 *
 * 주요 기능:
 * 1. 픽업 요청 정보 표시
 * 2. 요청 취소 기능
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getPickupRequestById Server Action 호출
 * - 요청자 본인만 접근 가능
 * - 요청 정보만 표시 (제공자 선택은 리스트 페이지에서 수행)
 *
 * @dependencies
 * - @/actions/pickup-requests: getPickupRequestById Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { getPickupRequestById } from "@/actions/pickup-requests";
import { getUnreadCountsForInvites } from "@/actions/pickup-messages";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { CancelRequestButton } from "@/components/pickup-requests/cancel-request-button";
import { formatDateTime } from "@/lib/utils";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

interface RequestDetailPageProps {
  params: Promise<{ requestId: string }>;
}

// 상태별 배지 스타일
const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  REQUESTED: { label: "요청됨", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  MATCHED: { label: "매칭됨", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  CANCEL_REQUESTED: { label: "취소 요청됨", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
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
                <Link href="/my">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  마이페이지로
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

  // ACCEPTED invitation 조회 (메시지 버튼 표시용)
  let acceptedInvitation = null;
  let tripId = null;
  let unreadCount = 0;
  
  try {
    const { userId } = await auth();
    if (userId) {
      const supabase = createClerkSupabaseClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_user_id", userId)
        .single();

      if (profile) {
        const { data: invitation } = await supabase
          .from("invitations")
          .select("id, trip_id")
          .eq("pickup_request_id", requestId)
          .eq("requester_profile_id", profile.id)
          .eq("status", "ACCEPTED")
          .single();

        if (invitation) {
          acceptedInvitation = invitation;
          tripId = invitation.trip_id;

          // 읽지 않은 메시지 개수 조회
          const unreadCountsResult = await getUnreadCountsForInvites([invitation.id]);
          if (unreadCountsResult.success && unreadCountsResult.data) {
            unreadCount = unreadCountsResult.data[invitation.id] || 0;
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ ACCEPTED invitation 조회 실패:", error);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/my">
            <ArrowLeft className="mr-2 h-4 w-4" />
            마이페이지로
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

            {/* 메시지 버튼 (ACCEPTED invitation이 있는 경우만) */}
            {acceptedInvitation && tripId && (
              <div className="pt-4 border-t">
                <Button asChild variant="outline" className="w-full relative">
                  <Link href={`/trips/${tripId}/messages/${acceptedInvitation.id}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    메시지 작성
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-2 h-5 min-w-5 px-1.5 text-xs"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </div>
            )}

            {/* 취소 요청 버튼 */}
            <div className="pt-4 border-t">
              <CancelRequestButton
                pickupRequestId={pickupRequest.id}
                status={pickupRequest.status}
                pickupTime={pickupRequest.pickup_time}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

