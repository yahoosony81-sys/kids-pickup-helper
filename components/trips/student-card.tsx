/**
 * @file components/trips/student-card.tsx
 * @description 학생 카드 컴포넌트
 *
 * 주요 기능:
 * 1. 학생 정보 표시 (번호, 상태, 픽업 시간, 출발지/목적지)
 * 2. 픽업 장소 도착 확인 버튼
 * 3. 취소 승인 버튼 (CANCEL_REQUESTED 상태일 때)
 * 4. 메시지 작성 버튼
 * 5. 도착 사진 업로드 (LOCK된 경우)
 *
 * 핵심 구현 로직:
 * - 클라이언트 컴포넌트로 구현
 * - 픽업 장소 도착 확인 버튼 클릭 시 markStudentMetAtPickup Server Action 호출
 * - 로컬 상태로 버튼 상태 관리
 * - TODO: 향후 실시간 알림 전송 (Firebase 또는 Socket.io)
 *
 * @dependencies
 * - @/actions/trips: markStudentMetAtPickup Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 * - @/components/ui/badge: 배지 컴포넌트
 * - lucide-react: 아이콘
 */

"use client";

import { useState } from "react";
import { markStudentMetAtPickup } from "@/actions/trips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApproveCancelButton } from "@/components/pickup-requests/approve-cancel-button";
import { UploadArrivalPhoto } from "@/components/trip-arrivals/upload-arrival-photo";
import { Clock, MapPin, MessageSquare, Camera, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface StudentCardProps {
  participant: any;
  index: number;
  tripId: string;
  tripIsLocked: boolean;
  inviteId?: string;
  unreadCount?: number;
  arrivalPhotoUrl?: string | null;
  isPending?: boolean; // PENDING 상태 추가
}

export function StudentCard({
  participant,
  index,
  tripId,
  tripIsLocked,
  inviteId,
  unreadCount = 0,
  arrivalPhotoUrl,
  isPending = false, // 기본값 false
}: StudentCardProps) {
  const [isMetAtPickup, setIsMetAtPickup] = useState(
    participant.is_met_at_pickup || false
  );
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const pickupRequest = participant.pickup_request as any;

  // pickupRequest가 없는 경우 처리
  if (!pickupRequest) {
    return (
      <Card className="border-l-4 border-l-gray-500">
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">#{index + 1}</span>
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                  정보 없음
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              픽업 요청 정보를 불러올 수 없습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * 픽업 장소 도착 확인 처리
   * 
   * TODO: 요청자 화면에 실시간 알림 전송(Firebase 또는 Socket.io)
   * - 제공자가 확인 버튼을 클릭하면 부모님 화면에 "픽업 장소에서 만났습니다" 메시지 전송
   */
  const handleStudentMet = async () => {
    if (isMetAtPickup || isLoading) return;

    setIsLoading(true);
    try {
      const result = await markStudentMetAtPickup(tripId, participant.id);

      if (result.success) {
        setIsMetAtPickup(true);
        // 페이지 새로고침하여 최신 상태 반영
        router.refresh();
      } else {
        console.error("도착 확인 실패:", result.error);
        // TODO: 에러 토스트 메시지 표시
      }
    } catch (error) {
      console.error("도착 확인 에러:", error);
      // TODO: 에러 토스트 메시지 표시
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={`border-l-4 ${isPending ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">#{index + 1}</span>
              {isPending ? (
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  대기 중
                </span>
              ) : (
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

            {/* 픽업 장소 도착 확인 버튼 (PENDING이 아니고 LOCK되지 않은 경우만) */}
            {!isPending && !tripIsLocked && (
              <Button
                onClick={handleStudentMet}
                disabled={isMetAtPickup || isLoading}
                size="sm"
                variant={isMetAtPickup ? "outline" : "default"}
                className={
                  isMetAtPickup
                    ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                    : ""
                }
              >
                {isMetAtPickup ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    확인 완료
                  </>
                ) : (
                  "픽업 장소 도착"
                )}
              </Button>
            )}
          </div>

          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-muted-foreground">픽업 시간:</span>
              <span className="font-medium ml-2">
                {formatDateTime(pickupRequest.pickup_time)}
              </span>
            </div>
          </div>

          {pickupRequest.started_at && (
            <div className="flex items-start gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">출발 시간:</span>
                <span className="font-medium ml-2">
                  {formatDateTime(pickupRequest.started_at)}
                </span>
              </div>
            </div>
          )}

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

          {/* 취소 승인 버튼 (CANCEL_REQUESTED 상태일 때만) */}
          {pickupRequest.status === "CANCEL_REQUESTED" && (
            <div className="mt-4 pt-4 border-t">
              <ApproveCancelButton
                pickupRequestId={pickupRequest.id}
                pickupTime={pickupRequest.pickup_time}
              />
            </div>
          )}

          {/* 메시지 작성 버튼 (ACCEPTED invitation이 있는 경우만, PENDING은 제외) */}
          {!isPending && pickupRequest && inviteId && (
            <div className="mt-4 pt-4 border-t">
              <Button asChild variant="outline" className="w-full relative">
                <Link href={`/trips/${tripId}/messages/${inviteId}`}>
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

          {/* 도착 사진 업로드 (LOCK된 경우만, 제공자만, PENDING은 제외) */}
          {!isPending && tripIsLocked && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">도착 사진</span>
              </div>
              <UploadArrivalPhoto
                tripId={tripId}
                pickupRequestId={pickupRequest.id}
                isAlreadyUploaded={!!arrivalPhotoUrl}
                existingPhotoUrl={arrivalPhotoUrl || undefined}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
