/**
 * @file app/(routes)/trips/[tripId]/invite/page.tsx
 * @description Trip 초대 페이지
 *
 * 주요 기능:
 * 1. Trip 소유자 확인
 * 2. 초대 가능한 요청자 리스트 조회 및 표시
 * 3. 각 요청자에 대한 초대 버튼 제공 (Task 4.2에서 기능 구현)
 * 4. 보낸 초대 목록 조회 및 표시 (Task 4.3에서 기능 구현)
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getTripById로 Trip 소유자 확인 및 상태 검증
 * - getAvailablePickupRequests로 REQUESTED 상태 요청만 조회
 * - getTripInvitations로 보낸 초대 목록 조회
 * - PRD 규칙 준수: 정확한 주소/좌표는 숨기고 시간대, 대략 위치, 목적지 유형만 표시
 *
 * @dependencies
 * - @/actions/trips: getTripById Server Action
 * - @/actions/pickup-requests: getAvailablePickupRequests Server Action
 * - @/actions/invitations: getTripInvitations Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { getTripById } from "@/actions/trips";
import { getAvailablePickupRequests } from "@/actions/pickup-requests";
import { getTripInvitations } from "@/actions/invitations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteButton } from "@/components/invitations/invite-button";
import Link from "next/link";
import { ArrowLeft, Lock, Users, MapPin, Clock, Building2, Mail } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface InvitePageProps {
  params: Promise<{ tripId: string }>;
}

// 목적지 유형별 아이콘 및 라벨
const destinationTypeConfig: Record<
  string,
  { label: string; icon: typeof Building2; className: string }
> = {
  학원: {
    label: "학원",
    icon: Building2,
    className: "text-blue-600",
  },
  학교: {
    label: "학교",
    icon: Building2,
    className: "text-green-600",
  },
  집: {
    label: "집",
    icon: Building2,
    className: "text-orange-600",
  },
  기타: {
    label: "기타",
    icon: Building2,
    className: "text-gray-600",
  },
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { tripId } = await params;

  // 1. Trip 조회 및 소유자 확인
  const tripResult = await getTripById(tripId);

  if (!tripResult.success || !tripResult.data) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{tripResult.error || "픽업제공을 찾을 수 없습니다."}</p>
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

  const trip = tripResult.data;

  // 2. Trip이 EXPIRED 상태인 경우 초대 불가
  if (trip.status === "EXPIRED") {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-600 mb-4">
              <Lock className="h-5 w-5" />
              <p className="font-medium">이 픽업제공은 기간이 만료되었습니다.</p>
            </div>
            <p className="text-muted-foreground mb-4">
              출발 예정 시간이 지나도록 출발하지 않아 만료된 픽업제공입니다. 새로운 초대를 보낼 수 없습니다.
            </p>
            <Button asChild>
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

  // 2-1. Trip이 LOCK된 경우 초대 불가
  if (trip.is_locked) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-600 mb-4">
              <Lock className="h-5 w-5" />
              <p className="font-medium">이 픽업제공은 이미 출발했습니다.</p>
            </div>
            <p className="text-muted-foreground mb-4">
              LOCK된 픽업제공에는 새로운 초대를 보낼 수 없습니다.
            </p>
            <Button asChild>
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

  // 3. 요청자 리스트 조회
  const requestsResult = await getAvailablePickupRequests();

  if (!requestsResult.success) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{requestsResult.error}</p>
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

  const availableRequests = requestsResult.data || [];

  // 날짜 비교 함수: 그룹 날짜와 요청 날짜가 일치하는지 확인
  const isDateMatch = (tripDate: string | null, requestDate: string | Date): boolean => {
    if (!tripDate) return false;
    
    const tripDateObj = new Date(tripDate);
    const requestDateObj = typeof requestDate === "string" ? new Date(requestDate) : requestDate;
    
    // 날짜만 비교 (YYYY-MM-DD)
    const tripDateStr = tripDateObj.toISOString().split("T")[0];
    const requestDateStr = requestDateObj.toISOString().split("T")[0];
    
    return tripDateStr === requestDateStr;
  };

  // 각 요청에 대해 날짜 일치 여부 계산
  const requestsWithDateMatch = availableRequests.map((request: any) => {
    const match = isDateMatch(trip.scheduled_start_at, request.pickup_time_raw || request.pickup_time);
    return {
      ...request,
      isDateMatch: match,
    };
  });

  // 4. 보낸 초대 목록 조회
  const invitationsResult = await getTripInvitations(tripId);
  const invitations = invitationsResult.success ? invitationsResult.data || [] : [];

  // 초대 상태별 배지 설정
  const invitationStatusConfig: Record<
    string,
    { label: string; className: string }
  > = {
    PENDING: {
      label: "대기 중",
      className: "bg-yellow-100 text-yellow-800",
    },
    ACCEPTED: {
      label: "수락됨",
      className: "bg-green-100 text-green-800",
    },
    REJECTED: {
      label: "거절됨",
      className: "bg-gray-100 text-gray-800",
    },
    EXPIRED: {
      label: "만료됨",
      className: "bg-red-100 text-red-800",
    },
  };

  // formatDateTime은 lib/utils에서 import

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/trips">
            <ArrowLeft className="mr-2 h-4 w-4" />
            픽업제공 목록으로
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">요청자 초대</h1>
          <p className="text-muted-foreground text-sm mt-1">
            픽업제공 #{trip.id.slice(0, 8)}에 초대할 요청자를 선택하세요.
          </p>
        </div>
      </div>

      {/* Trip 정보 카드 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Trip 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">수용 인원:</span>
              <span className="font-medium">0 / {trip.capacity}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">상태:</span>
              <span className="font-medium">{trip.status}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요청자 리스트 */}
      {availableRequests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground mb-4">
              현재 초대 가능한 요청자가 없습니다.
            </p>
            <p className="text-sm text-muted-foreground">
              새로운 픽업 요청이 등록되면 여기에 표시됩니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              총 {availableRequests.length}개의 요청이 있습니다.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              정확한 주소와 좌표는 초대 수락 후에만 공개됩니다.
            </p>
          </div>

          {requestsWithDateMatch.map((request: any) => {
            const destinationTypeInfo =
              destinationTypeConfig[request.destination_type] ||
              destinationTypeConfig["기타"];
            const DestinationIcon = destinationTypeInfo.icon;

            return (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {request.pickup_time}
                      </CardTitle>
                      <CardDescription className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>출발지: {request.origin_area}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DestinationIcon className={`h-3 w-3 ${destinationTypeInfo.className}`} />
                          <span>
                            목적지: {request.destination_area} ({destinationTypeInfo.label})
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <InviteButton
                    tripId={trip.id}
                    pickupRequestId={request.id}
                    isTripLocked={trip.is_locked}
                    hasPendingInvite={request.hasPendingInvite}
                    isDateMatch={request.isDateMatch}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 보낸 초대 목록 */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            보낸 초대 목록
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            이 픽업제공에 보낸 초대 목록입니다.
          </p>
        </div>

        {!invitationsResult.success ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">
                {invitationsResult.error || "초대 목록을 불러오는데 실패했습니다."}
              </p>
            </CardContent>
          </Card>
        ) : invitations.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground mb-4">
                아직 보낸 초대가 없습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                위에서 요청자에게 초대를 보내면 여기에 표시됩니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation: any) => {
              const statusInfo =
                invitationStatusConfig[invitation.status] ||
                invitationStatusConfig["PENDING"];
              const pickupRequest = invitation.pickup_request;

              return (
                <Card key={invitation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {pickupRequest?.pickup_time
                          ? formatDateTime(pickupRequest.pickup_time)
                          : "시간 정보 없음"}
                      </CardTitle>
                        <CardDescription className="mt-2 space-y-1">
                          {pickupRequest && (
                            <>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>출발지: {pickupRequest.origin_text}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>목적지: {pickupRequest.destination_text}</span>
                              </div>
                            </>
                          )}
                          {invitation.status === "PENDING" && invitation.expires_at && (
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <span className="text-muted-foreground">
                                만료 시간: {formatDateTime(invitation.expires_at)}
                              </span>
                            </div>
                          )}
                          {(invitation.status === "ACCEPTED" ||
                            invitation.status === "REJECTED") &&
                            invitation.responded_at && (
                              <div className="flex items-center gap-2 mt-2 text-xs">
                                <span className="text-muted-foreground">
                                  응답 시간: {formatDateTime(invitation.responded_at)}
                                </span>
                              </div>
                            )}
                          {invitation.status === "EXPIRED" && invitation.expires_at && (
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <span className="text-muted-foreground">
                                만료 시간: {formatDateTime(invitation.expires_at)}
                              </span>
                            </div>
                          )}
                        </CardDescription>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

