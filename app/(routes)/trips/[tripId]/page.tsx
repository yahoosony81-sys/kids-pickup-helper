/**
 * @file app/(routes)/trips/[tripId]/page.tsx
 * @description Trip 상세 페이지
 *
 * 주요 기능:
 * 1. Trip 정보 조회 및 표시
 * 2. 참여자 목록 조회 및 표시
 * 3. 출발 버튼 제공 (LOCK 처리)
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getTripById로 Trip 정보 조회
 * - getTripParticipants로 참여자 목록 조회
 * - StartTripButton 컴포넌트로 출발 처리
 *
 * @dependencies
 * - @/actions/trips: getTripById, getTripParticipants Server Actions
 * - @/components/trips/start-trip-button: StartTripButton 컴포넌트
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { getTripById, getTripParticipants } from "@/actions/trips";
import { getTripArrivals, checkArrivalPhoto } from "@/actions/trip-arrivals";
import { getTripReviews } from "@/actions/trip-reviews";
import { getTripInvitations } from "@/actions/invitations";
import { getUnreadCountsForInvites } from "@/actions/pickup-messages";
import { StartTripButton } from "@/components/trips/start-trip-button";
import { StudentCard } from "@/components/trips/student-card";
import { ArrivalPhotoViewer } from "@/components/trip-arrivals/arrival-photo-viewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Lock, Users, Clock, Calendar, Camera, CheckCircle2, Plus, Star } from "lucide-react";
import { PageNavActions } from "@/components/page-nav-actions";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface TripDetailPageProps {
  params: Promise<{ tripId: string }>;
}

// 상태별 배지 스타일
const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  OPEN: {
    label: "오픈",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  IN_PROGRESS: {
    label: "진행중",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  ARRIVED: {
    label: "도착",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  COMPLETED: {
    label: "완료",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  CANCELLED: {
    label: "취소됨",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  EXPIRED: {
    label: "기간 만료",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
};

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { tripId } = await params;

  // 1. Trip 조회 및 소유자 확인
  const tripResult = await getTripById(tripId);

  if (!tripResult.success || !tripResult.data) {
    notFound();
  }

  const trip = tripResult.data;

  // 2. 참여자 목록 조회
  const participantsResult = await getTripParticipants(tripId);

  // 2-1. 초대 목록 조회 (PENDING, ACCEPTED 모두 포함)
  // 상태 필터 없이 한 번만 호출하여 모든 초대를 가져온 후, PENDING과 ACCEPTED만 필터링
  const invitationsResult = await getTripInvitations(tripId);
  const allInvitations = invitationsResult.success
    ? invitationsResult.data || []
    : [];
  
  // PENDING과 ACCEPTED만 필터링 (활성 초대만)
  const activeInvitations = allInvitations.filter(
    (inv: any) => inv.status === "PENDING" || inv.status === "ACCEPTED"
  );
  
  // PENDING과 ACCEPTED로 분리
  const acceptedInvitations = activeInvitations.filter(
    (inv: any) => inv.status === "ACCEPTED"
  );
  const pendingInvitations = activeInvitations.filter(
    (inv: any) => inv.status === "PENDING"
  );
  
  console.log("🔍 [TripDetailPage] 초대 목록 조회 결과:", {
    total: allInvitations.length,
    active: activeInvitations.length,
    accepted: acceptedInvitations.length,
    pending: pendingInvitations.length,
    statuses: allInvitations.map((inv: any) => inv.status),
  });
  
  // participant와 invitation 매핑 (pickup_request_id 기준)
  const invitationMap = new Map<string, string>();
  acceptedInvitations.forEach((invitation: any) => {
    const pickupRequest = invitation.pickup_request;
    if (pickupRequest?.id) {
      invitationMap.set(pickupRequest.id, invitation.id);
    }
  });

  // PENDING invitation도 매핑에 추가 (메시지는 없지만 표시용)
  pendingInvitations.forEach((invitation: any) => {
    const pickupRequest = invitation.pickup_request;
    if (pickupRequest?.id) {
      invitationMap.set(pickupRequest.id, invitation.id);
    }
  });

  // 2-2. 읽지 않은 메시지 개수 조회
  const inviteIds = Array.from(invitationMap.values());
  console.log("🔍 [TripDetailPage] 읽지 않은 메시지 조회 시작:", {
    inviteIds,
    invitationMapSize: invitationMap.size,
  });
  
  let unreadCounts: { [inviteId: string]: number } = {};
  if (inviteIds.length > 0) {
    const unreadCountsResult = await getUnreadCountsForInvites(inviteIds);
    if (unreadCountsResult.success) {
      unreadCounts = unreadCountsResult.data || {};
      console.log("✅ [TripDetailPage] 읽지 않은 메시지 개수:", unreadCounts);
    } else {
      console.error("❌ [TripDetailPage] 읽지 않은 메시지 조회 실패:", unreadCountsResult.error);
    }
  }

  // 3. 리뷰 목록 조회 (COMPLETED 상태일 때만)
  let reviewsData = null;
  if (trip.status === "COMPLETED") {
    const reviewsResult = await getTripReviews(tripId);
    if (reviewsResult.success && reviewsResult.data) {
      reviewsData = reviewsResult.data;
    }
  }

  if (!participantsResult.success) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              {participantsResult.error || "참여자 정보를 불러오는데 실패했습니다."}
            </p>
            <Button asChild className="mt-4">
              <Link href="/trips">
                <ArrowLeft className="mr-2 h-4 w-4" />
                픽업제공 목록으로 돌아가기
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const participants = participantsResult.data || [];
  const participantCount = participants.length;
  
  // PENDING 초대를 가상의 participant 형태로 변환
  const pendingParticipants = pendingInvitations.map((invitation: any) => {
    const pickupRequest = invitation.pickup_request;
    return {
      id: `pending-${invitation.id}`, // 가상 ID
      trip_id: tripId,
      pickup_request_id: pickupRequest?.id,
      requester_profile_id: invitation.requester_profile_id,
      sequence_order: participants.length + 1, // 마지막 순서
      created_at: invitation.created_at,
      is_pending: true, // PENDING 상태 표시용
      invitation_id: invitation.id,
      pickup_request: pickupRequest,
    };
  });
  
  // ACCEPTED 참여자와 PENDING 초대를 합침
  const allParticipants = [...participants, ...pendingParticipants];
  const totalCount = allParticipants.length;
  
  // 활성 초대 수 계산 (ACCEPTED + PENDING)
  const activeInvitationCount = acceptedInvitations.length + pendingInvitations.length;
  // 초대 가능 여부 확인: 활성 초대 수 < capacity && LOCK되지 않음 && EXPIRED 아님
  const canInvite = activeInvitationCount < trip.capacity && !trip.is_locked && trip.status !== "EXPIRED";
  
  const statusInfo = statusConfig[trip.status] || {
    label: trip.status,
    className: "bg-gray-100 text-gray-800",
  };

  // 도착 사진 존재 여부 확인 (LOCK된 경우만)
  const arrivalPhotosMap: Record<string, string | null> = {};
  if (trip.is_locked) {
    await Promise.all(
      participants.map(async (participant: any) => {
        const pickupRequestId = participant.pickup_request_id;
        const result = await checkArrivalPhoto(tripId, pickupRequestId);
        arrivalPhotosMap[pickupRequestId] = result.data?.photoUrl || null;
      })
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <PageNavActions fallbackHref="/trips" />

      <div className="space-y-6">
        {/* Trip 정보 카드 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">픽업제공 상세</CardTitle>
                <CardDescription className="mt-1">
                  픽업제공 #{trip.id.slice(0, 8)}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">수용 인원:</span>
                  <span className="font-medium">
                    {participantCount} / {trip.capacity}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {trip.is_locked ? (
                    <>
                      <Lock className="h-4 w-4 text-yellow-600" />
                      <span className="text-yellow-600 font-medium">LOCK됨</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">UNLOCK</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {trip.start_at && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">출발 시간:</span>
                <span className="font-medium">{formatDateTime(trip.start_at)}</span>
              </div>
            )}

            {trip.arrived_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">도착 시간:</span>
                <span className="font-medium">{formatDateTime(trip.arrived_at)}</span>
              </div>
            )}

            {trip.completed_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">완료 시간:</span>
                <span className="font-medium">{formatDateTime(trip.completed_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 참여자 목록 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>참여자 목록</CardTitle>
            <CardDescription>
              이 픽업제공에 참여하는 요청자 목록입니다. (수락: {participantCount}명, 대기: {pendingInvitations.length}명)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>아직 참여자가 없습니다.</p>
                <p className="text-sm mt-2">
                  초대를 보내면 참여자가 여기에 표시됩니다.
                </p>
                <Button asChild className="mt-4" variant="outline">
                  <Link href={`/trips/${tripId}/invite`}>
                    초대하기
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {allParticipants.map((participant: any, index: number) => {
                    const pickupRequest = participant.pickup_request as any;
                    const inviteId = pickupRequest
                      ? invitationMap.get(pickupRequest.id)
                      : undefined;
                    const unreadCount = inviteId ? unreadCounts[inviteId] || 0 : 0;
                    const arrivalPhotoUrl = arrivalPhotosMap[pickupRequest?.id] || null;
                    const isPending = participant.is_pending === true;

                    return (
                      <StudentCard
                        key={participant.id}
                        participant={participant}
                        index={index}
                        tripId={tripId}
                        tripIsLocked={trip.is_locked}
                        inviteId={inviteId}
                        unreadCount={unreadCount}
                        arrivalPhotoUrl={arrivalPhotoUrl}
                        isPending={isPending}
                      />
                    );
                  })}
                </div>
                {/* 초대하기 버튼 (초대 가능할 때만 표시) */}
                {canInvite && (
                  <div className="mt-6 pt-6 border-t">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/trips/${tripId}/invite`}>
                        초대하기
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 출발 버튼 카드 */}
        {!trip.is_locked && trip.status !== "EXPIRED" && (
          <Card>
            <CardHeader>
              <CardTitle>출발 처리</CardTitle>
              <CardDescription>
                출발 버튼을 클릭하면 픽업제공이 LOCK 상태가 되고, 이후 추가 초대나 초대 수락이 불가능해집니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StartTripButton
                tripId={tripId}
                isLocked={trip.is_locked}
                participantCount={participantCount}
                tripStatus={trip.status}
                participants={participants}
              />
            </CardContent>
          </Card>
        )}

        {/* EXPIRED 상태 안내 메시지 */}
        {trip.status === "EXPIRED" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-orange-600" />
                기간 만료
              </CardTitle>
              <CardDescription>
                이 픽업제공은 출발 예정 시간이 지나도록 출발하지 않아 만료되었습니다. 초대나 출발이 불가능합니다.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* LOCK된 경우 안내 메시지 */}
        {trip.is_locked && trip.status !== "EXPIRED" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-yellow-600" />
                출발 완료
              </CardTitle>
              <CardDescription>
                이 픽업제공은 이미 출발했습니다. 추가 초대나 초대 수락이 불가능합니다.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* 도착 사진 조회 섹션 (LOCK된 경우만) */}
        {trip.is_locked && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                도착 사진 목록
              </CardTitle>
              <CardDescription>
                모든 참여자의 도착 사진을 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArrivalPhotoViewer tripId={tripId} viewerRole="provider" />
            </CardContent>
          </Card>
        )}

        {/* 서비스 완료 상태 카드 */}
        {trip.status === "COMPLETED" && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                서비스 완료
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                모든 참여자의 도착 사진이 업로드되었습니다. 서비스가 완료되었습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 서비스 완료 시간 표시 */}
              {(trip.arrived_at || trip.completed_at) && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-300">서비스 완료 시간:</span>
                  <span className="font-medium text-green-800 dark:text-green-200">
                    {formatDateTime(trip.arrived_at || trip.completed_at || "")}
                  </span>
                </div>
              )}
              
              {/* Phase 8 원칙 설명 */}
              <div className="pt-2 border-t border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300">
                  리뷰 작성 여부와 관계없이 다음 픽업제공을 생성할 수 있습니다.
                </p>
              </div>

              {/* 다음 픽업제공 생성하기 버튼 */}
              <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
                <Link href="/trips/new">
                  <Plus className="mr-2 h-4 w-4" />
                  다음 픽업제공 생성하기
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 리뷰 목록 섹션 (COMPLETED 상태일 때만) */}
        {trip.status === "COMPLETED" && reviewsData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                리뷰 목록
              </CardTitle>
              <CardDescription>
                이 픽업제공에 대한 요청자들의 리뷰를 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 평균 평점 표시 */}
              {reviewsData.reviewCount > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                      {reviewsData.averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / 5.0 ({reviewsData.reviewCount}개 리뷰)
                    </span>
                  </div>
                </div>
              )}

              {/* 리뷰 목록 */}
              {reviewsData.reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviewsData.reviews.map((review: any) => (
                    <Card key={review.id} className="border-l-4 border-l-yellow-400">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm font-medium">
                                {review.rating}점
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(review.created_at)}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-muted-foreground">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>아직 작성된 리뷰가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

