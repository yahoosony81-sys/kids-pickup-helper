/**
 * @file app/(routes)/trips/[tripId]/invite/page.tsx
 * @description Trip 초대 페이지
 *
 * 주요 기능:
 * 1. Trip 소유자 확인
 * 2. 초대 가능한 요청자 리스트 조회 및 표시
 * 3. 각 요청자에 대한 초대 버튼 제공 (Task 4.2에서 기능 구현)
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getTripById로 Trip 소유자 확인 및 상태 검증
 * - getAvailablePickupRequests로 REQUESTED 상태 요청만 조회
 * - PRD 규칙 준수: 정확한 주소/좌표는 숨기고 시간대, 대략 위치, 목적지 유형만 표시
 *
 * @dependencies
 * - @/actions/trips: getTripById Server Action
 * - @/actions/pickup-requests: getAvailablePickupRequests Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { getTripById } from "@/actions/trips";
import { getAvailablePickupRequests } from "@/actions/pickup-requests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Lock, Users, MapPin, Clock, Building2 } from "lucide-react";
import { notFound } from "next/navigation";

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
            <p className="text-destructive">{tripResult.error || "Trip을 찾을 수 없습니다."}</p>
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

  const trip = tripResult.data;

  // 2. Trip이 LOCK된 경우 초대 불가
  if (trip.is_locked) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-600 mb-4">
              <Lock className="h-5 w-5" />
              <p className="font-medium">이 Trip은 이미 출발했습니다.</p>
            </div>
            <p className="text-muted-foreground mb-4">
              LOCK된 Trip에는 새로운 초대를 보낼 수 없습니다.
            </p>
            <Button asChild>
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
                Trip 목록으로 돌아가기
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableRequests = requestsResult.data || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/trips">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Trip 목록으로
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">요청자 초대</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Trip #{trip.id.slice(0, 8)}에 초대할 요청자를 선택하세요.
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

          {availableRequests.map((request: any) => {
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
                  <Button
                    className="w-full"
                    disabled={trip.is_locked}
                    // TODO: Task 4.2에서 초대 전송 기능 구현
                  >
                    초대하기
                  </Button>
                  {trip.is_locked && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      LOCK된 Trip에는 초대를 보낼 수 없습니다.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

