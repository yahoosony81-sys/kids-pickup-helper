/**
 * @file app/(routes)/pickup-requests/page.tsx
 * @description 픽업 요청 목록 페이지
 *
 * 주요 기능:
 * 1. 현재 사용자의 픽업 요청 목록 조회
 * 2. 최신순 정렬
 * 3. 상태별 표시 (배지/색상)
 * 4. 빈 목록 처리
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getMyPickupRequests Server Action 호출
 * - 카드 형태로 각 요청 표시
 * - "새 요청 등록" 버튼 제공
 *
 * @dependencies
 * - @/actions/pickup-requests: Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { getMyPickupRequests } from "@/actions/pickup-requests";
import { getMyReview } from "@/actions/trip-reviews";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, MapPin, Star, CheckCircle2 } from "lucide-react";
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

function formatDateTimeShort(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `등록: ${year}-${month}-${day} ${hours}:${minutes}`;
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

export const dynamic = "force-dynamic";

export default async function PickupRequestsPage() {
  const result = await getMyPickupRequests();

  if (!result.success) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pickupRequests = result.data || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">내 픽업 요청</h1>
          <p className="text-muted-foreground text-sm mt-1">
            등록한 픽업 요청 목록을 확인할 수 있습니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/pickup-requests/new">
            <Plus className="mr-2 h-4 w-4" />
            새 요청 등록
          </Link>
        </Button>
      </div>

      {pickupRequests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground mb-4">
              등록한 픽업 요청이 없습니다.
            </p>
            <Button asChild>
              <Link href="/pickup-requests/new">
                <Plus className="mr-2 h-4 w-4" />
                첫 요청 등록하기
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {await Promise.all(
            pickupRequests.map(async (request: any) => {
              const statusInfo = statusConfig[request.status] || {
                label: request.status,
                className: "bg-gray-100 text-gray-800",
              };

              // COMPLETED 상태인 요청에 대해 리뷰 작성 여부 확인
              let hasReview = false;
              if (request.status === "COMPLETED") {
                const reviewResult = await getMyReview(request.id);
                hasReview = reviewResult.success && reviewResult.data !== null;
              }

              return (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {formatDateTime(request.pickup_time)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {formatDateTimeShort(request.created_at)}
                        </CardDescription>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">출발지</p>
                          <p className="text-sm text-muted-foreground">
                            {request.origin_text}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">목적지</p>
                          <p className="text-sm text-muted-foreground">
                            {request.destination_text}
                          </p>
                        </div>
                      </div>

                      {/* 리뷰 작성 여부 표시 (COMPLETED 상태인 경우만) */}
                      {request.status === "COMPLETED" && (
                        <div className="pt-3 border-t">
                          {hasReview ? (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm font-medium">리뷰 작성 완료</span>
                            </div>
                          ) : (
                            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                              <Link href={`/pickup-requests/${request.id}/review`}>
                                <Star className="mr-2 h-4 w-4" />
                                리뷰 작성하기
                              </Link>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

