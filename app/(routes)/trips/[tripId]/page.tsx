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
import { StartTripButton } from "@/components/trips/start-trip-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Lock, Users, MapPin, Clock, Calendar } from "lucide-react";
import { notFound } from "next/navigation";

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
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
  CANCELLED: {
    label: "취소됨",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

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

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

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
                Trip 목록으로 돌아가기
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/trips">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Trip 목록으로
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Trip 정보 카드 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">Trip 상세</CardTitle>
                <CardDescription className="mt-1">
                  Trip #{trip.id.slice(0, 8)}
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
              이 Trip에 참여하는 요청자 목록입니다. ({participantCount}명)
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
                                    pickupRequest.status === "IN_PROGRESS"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : pickupRequest.status === "ARRIVED"
                                        ? "bg-purple-100 text-purple-800"
                                        : pickupRequest.status === "COMPLETED"
                                          ? "bg-gray-100 text-gray-800"
                                          : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {pickupRequest.status === "IN_PROGRESS"
                                    ? "진행중"
                                    : pickupRequest.status === "ARRIVED"
                                      ? "도착"
                                      : pickupRequest.status === "COMPLETED"
                                        ? "완료"
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
                출발 버튼을 클릭하면 Trip이 LOCK 상태가 되고, 이후 추가 초대나 초대 수락이 불가능해집니다.
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
                이 Trip은 이미 출발했습니다. 추가 초대나 초대 수락이 불가능합니다.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}

