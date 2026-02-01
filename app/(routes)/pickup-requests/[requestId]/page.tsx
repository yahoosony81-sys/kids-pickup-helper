/**
 * @file app/(routes)/pickup-requests/[requestId]/page.tsx
 * @description 픽업 요청 상세 페이지
 *
 * 주요 기능:
 * 1. 픽업 요청 정보 표시
 * 2. 받은 초대 목록 표시 (제공자 프로필 및 수락 버튼)
 * 3. 요청 취소 기능
 * 4. 메시지 작성 기능 (ACCEPTED 초대가 있을 때)
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getPickupRequestById Server Action 호출
 * - getInvitationsForRequest Server Action 호출
 * - 요청자 본인만 접근 가능
 * - 모든 상태의 초대를 InvitationCard 컴포넌트로 표시 (PENDING, ACCEPTED, REJECTED, EXPIRED)
 * - 초대 조회 실패 시 에러 메시지 표시
 * - 초대가 없을 때 안내 메시지 표시
 * - ACCEPTED 초대는 메시지 버튼도 함께 표시
 *
 * @dependencies
 * - @/actions/pickup-requests: getPickupRequestById Server Action
 * - @/actions/invitations: getInvitationsForRequest Server Action
 * - @/components/invitations/invitation-card: 초대 카드 컴포넌트
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { getPickupRequestById } from "@/actions/pickup-requests";
import { getUnreadCountsForInvites } from "@/actions/pickup-messages";
import { getInvitationsForRequest } from "@/actions/invitations";
import { getMyArrivalPhotos } from "@/actions/trip-arrivals";
import { getMyReview } from "@/actions/trip-reviews";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, AlertCircle, MessageSquare, X, Camera, Star } from "lucide-react";
import { CancelRequestButton } from "@/components/pickup-requests/cancel-request-button";
import { InvitationCard } from "@/components/invitations/invitation-card";
import { PickupProgressTimeline } from "@/components/my/pickup-progress-timeline";
import { CanceledBox } from "@/components/my/canceled-box";
import { PickupRequestStatusContainer } from "@/components/pickup-requests/pickup-request-status-container";
import { formatDateTime } from "@/lib/utils";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";

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
  EXPIRED: { label: "픽업시간 지남", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
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

  // 초대 목록 조회 (제공자 프로필 정보 포함)
  const invitationsResult = await getInvitationsForRequest(requestId);
  const invitations = invitationsResult.success ? invitationsResult.data : [];

  // 디버깅 로그 추가
  console.log("📋 [RequestDetailPage] 초대 목록 조회 결과:", {
    success: invitationsResult.success,
    error: invitationsResult.error,
    totalCount: invitations.length,
    statuses: invitations.map((inv) => inv.status),
    pickupRequestStatus: pickupRequest.status,
    requestId,
  });

  // PENDING 초대 필터링 (EXPIRED 상태가 아닐 때만)
  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "PENDING" && pickupRequest.status !== "EXPIRED"
  );

  // 모든 초대 필터링 (EXPIRED 제외, 상태별로 분류)
  const allInvitations = invitations.filter(
    (inv) => inv.status !== "EXPIRED" && pickupRequest.status !== "EXPIRED"
  );

  console.log("📋 [RequestDetailPage] 필터링 결과:", {
    pendingCount: pendingInvitations.length,
    allCount: allInvitations.length,
    isExpired: pickupRequest.status === "EXPIRED",
  });

  const isExpired = pickupRequest.status === "EXPIRED";

  // 진행 상태 표시 여부 (MATCHED 이상 상태일 때만, CANCELLED 제외)
  const showProgress = !isExpired &&
    pickupRequest.status !== "CANCELLED" &&
    (pickupRequest.status === "MATCHED" ||
      pickupRequest.status === "IN_PROGRESS" ||
      pickupRequest.status === "COMPLETED");

  // 도착사진 조회 (ARRIVED 또는 COMPLETED 상태일 때만)
  let arrivalPhoto = null;
  if (!isExpired && (pickupRequest.progress_stage === "ARRIVED" || pickupRequest.status === "COMPLETED")) {
    const arrivalResult = await getMyArrivalPhotos(requestId);
    if (arrivalResult.success && arrivalResult.data) {
      arrivalPhoto = arrivalResult.data;
    }
  }

  // 리뷰 조회 (COMPLETED 상태일 때만)
  let review = null;
  if (!isExpired && pickupRequest.status === "COMPLETED") {
    const reviewResult = await getMyReview(requestId);
    if (reviewResult.success && reviewResult.data) {
      review = reviewResult.data;
    }
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
        <Card className={isExpired ? "opacity-60" : ""}>
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
            {pickupRequest.started_at && (
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">출발 시간</p>
                  <p className="text-base font-medium">{formatDateTime(pickupRequest.started_at)}</p>
                </div>
              </div>
            )}
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

            {/* EXPIRED 상태 안내 */}
            {isExpired && (
              <div className="pt-4 border-t">
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      픽업시간 지남
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      이 요청은 픽업 예정 시간이 지나 비활성화되었습니다. 수정, 삭제, 취소 등의 작업을 수행할 수 없습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 실시간 상태 업데이트 Container */}
        <PickupRequestStatusContainer
          initialRequest={pickupRequest}
          requestId={requestId}
          tripId={tripId}
          acceptedInvitationId={acceptedInvitation?.id || null}
          unreadCount={unreadCount}
        />

        {/* 취소 상태 표시 섹션 */}
        {!isExpired && pickupRequest.status === "CANCELLED" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">픽업 서비스 상태</CardTitle>
              <CardDescription className="mt-1">
                픽업 서비스가 제공되지 않았습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CanceledBox
                cancelReasonCode={pickupRequest.cancel_reason_code}
                cancelReasonText={pickupRequest.cancel_reason_text}
              />
            </CardContent>
          </Card>
        )}

        {/* 도착사진 표시 섹션 */}
        {!isExpired && (pickupRequest.progress_stage === "ARRIVED" || pickupRequest.status === "COMPLETED") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Camera className="h-5 w-5" />
                도착완료 사진
              </CardTitle>
              <CardDescription className="mt-1">
                제공자가 업로드한 도착 확인 사진입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {arrivalPhoto && arrivalPhoto.photoUrl ? (
                <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                  <div className="relative w-full aspect-video">
                    <Image
                      src={arrivalPhoto.photoUrl}
                      alt="도착 완료 사진"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>도착 사진이 아직 업로드되지 않았습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 리뷰 표시 섹션 */}
        {!isExpired && pickupRequest.status === "COMPLETED" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Star className="h-5 w-5" />
                평가
              </CardTitle>
              <CardDescription className="mt-1">
                서비스에 대한 평가를 작성해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {review ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Star
                          key={rating}
                          className={`h-5 w-5 ${rating <= review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
                            }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {review.rating}점
                    </span>
                  </div>
                  {review.comment && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                      <p className="text-sm">{review.comment}</p>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    작성일: {formatDateTime(review.created_at)}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Button asChild variant="default" className="w-full sm:w-auto">
                    <Link href={`/pickup-requests/${requestId}/review`}>
                      <Star className="mr-2 h-4 w-4" />
                      리뷰 작성하기
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 받은 초대 섹션 */}
        {!isExpired && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">받은 초대</CardTitle>
              <CardDescription className="mt-1">
                픽업 제공자가 보낸 초대입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 초대 조회 실패 시 에러 메시지 */}
              {!invitationsResult.success && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      초대 목록을 불러오는데 실패했습니다.
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {invitationsResult.error || "다시 시도해주세요."}
                    </p>
                  </div>
                </div>
              )}

              {/* 초대 목록이 비어있을 때 안내 메시지 */}
              {invitationsResult.success && allInvitations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>아직 받은 초대가 없습니다.</p>
                  <p className="text-sm mt-2">
                    픽업 제공자가 초대를 보내면 여기에 표시됩니다.
                  </p>
                </div>
              )}

              {/* 초대 목록 표시 (모든 상태 포함) */}
              {invitationsResult.success && allInvitations.length > 0 && (
                <div className="space-y-4">
                  {allInvitations.map((invitation) => (
                    <InvitationCard
                      key={invitation.id}
                      invitation={{
                        id: invitation.id,
                        status: invitation.status as "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED",
                        provider: invitation.provider,
                        created_at: invitation.created_at,
                        expires_at: invitation.expires_at,
                      }}
                      requestId={requestId}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

