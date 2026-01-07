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
import { StartTripButton } from "@/components/trips/start-trip-button";
import { UploadArrivalPhoto } from "@/components/trip-arrivals/upload-arrival-photo";
import { ArrivalPhotoViewer } from "@/components/trip-arrivals/arrival-photo-viewer";
import { ApproveCancelButton } from "@/components/pickup-requests/approve-cancel-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Lock, Users, MapPin, Clock, Calendar, Camera, CheckCircle2, Plus, Star } from "lucide-react";
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
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/trips">
            <ArrowLeft className="mr-2 h-4 w-4" />
            픽업제공 목록으로
          </Link>
        </Button>
      </div>

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
              이 픽업제공에 참여하는 요청자 목록입니다. ({participantCount}명)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {participantCount === 0 ? (
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
              <div className="space-y-4">
                {participants.map((participant: any, index: number) => {
                  const pickupRequest = participant.pickup_request as any;
                  return (
                    <Card key={participant.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">
                                #{index + 1}
                              </span>
                              {pickupRequest && (
                                <span
                                  className={`px-2 py-1 rounded-md text-xs font-medium ${
                                    pickupRequest.status === "CANCEL_REQUESTED"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                      : pickupRequest.status === "IN_PROGRESS"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : pickupRequest.status === "COMPLETED"
                                          ? "bg-gray-100 text-gray-800"
                                          : pickupRequest.status === "CANCELLED"
                                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                            : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {pickupRequest.status === "CANCEL_REQUESTED"
                                    ? "취소 요청됨"
                                    : pickupRequest.status === "IN_PROGRESS"
                                      ? "진행중"
                                      : pickupRequest.status === "COMPLETED"
                                        ? "완료"
                                        : pickupRequest.status === "CANCELLED"
                                          ? "취소됨"
                                          : "매칭됨"}
                                </span>
                              )}
                            </div>
                          </div>

                          {pickupRequest && (
                            <>
                              <div className="flex items-start gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <span className="text-muted-foreground">픽업 시간:</span>
                                  <span className="font-medium ml-2">
                                    {formatDateTime(pickupRequest.pickup_time)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-start gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                  <div>
                                    <span className="text-muted-foreground">출발지:</span>
                                    <span className="font-medium ml-2">
                                      {pickupRequest.origin_text}
                                    </span>
                                  </div>
                                  <div className="mt-1">
                                    <span className="text-muted-foreground">목적지:</span>
                                    <span className="font-medium ml-2">
                                      {pickupRequest.destination_text}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {/* 취소 승인 버튼 (CANCEL_REQUESTED 상태일 때만) */}
                          {pickupRequest && pickupRequest.status === "CANCEL_REQUESTED" && (
                            <div className="mt-4 pt-4 border-t">
                              <ApproveCancelButton pickupRequestId={pickupRequest.id} />
                            </div>
                          )}

                          {/* 도착 사진 업로드 (LOCK된 경우만, 제공자만) */}
                          {trip.is_locked && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center gap-2 mb-2">
                                <Camera className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">도착 사진</span>
                              </div>
                              <UploadArrivalPhoto
                                tripId={tripId}
                                pickupRequestId={pickupRequest.id}
                                isAlreadyUploaded={!!arrivalPhotosMap[pickupRequest.id]}
                                existingPhotoUrl={arrivalPhotosMap[pickupRequest.id]}
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 출발 버튼 카드 */}
        {!trip.is_locked && (
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
              />
            </CardContent>
          </Card>
        )}

        {/* LOCK된 경우 안내 메시지 */}
        {trip.is_locked && (
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

