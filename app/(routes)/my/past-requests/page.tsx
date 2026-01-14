/**
 * @file app/(routes)/my/past-requests/page.tsx
 * @description 지난 픽업 요청 페이지
 *
 * 주요 기능:
 * 1. 완료된 픽업 요청 목록 조회 (ARRIVED, COMPLETED)
 * 2. 최신순 정렬
 * 3. 빈 상태 처리
 * 4. 상세 페이지 링크 제공
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getMyPickupRequests Server Action 호출
 * - 완료 상태만 필터링 (ARRIVED, COMPLETED)
 * - 최신순 정렬 (created_at DESC)
 *
 * @dependencies
 * - @/actions/pickup-requests: getMyPickupRequests Server Action
 * - @/components/ui/card: 카드 컴포넌트
 */

import { getMyPickupRequests } from "@/actions/pickup-requests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { formatDateTime, formatDateTimeShort } from "@/lib/utils";

// 상태별 배지 스타일
const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  EXPIRED: {
    label: "픽업시간 지남",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  CANCELLED: {
    label: "취소됨",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  ARRIVED: {
    label: "도착",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  COMPLETED: {
    label: "완료",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
};

export const dynamic = "force-dynamic";

export default async function PastRequestsPage() {
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

  // 지난 픽업 요청 필터링 (EXPIRED, CANCELLED, ARRIVED, COMPLETED)
  const pastRequests = (result.data || [])
    .filter((req: any) => ["EXPIRED", "CANCELLED", "ARRIVED", "COMPLETED"].includes(req.status))
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button asChild variant="outline" className="mb-4">
          <Link href="/my">
            <ArrowLeft className="mr-2 h-4 w-4" />
            마이페이지로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">지난 픽업 요청</h1>
        <p className="text-muted-foreground text-sm mt-1">
          완료되거나 만료된 픽업 요청 목록을 확인할 수 있습니다.
        </p>
      </div>

      {pastRequests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground mb-4">
              지난 픽업 요청이 없습니다.
            </p>
            <Button asChild variant="outline">
              <Link href="/my">마이페이지로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pastRequests.map((request: any) => {
            const statusInfo = statusConfig[request.status] || {
              label: request.status,
              className: "bg-gray-100 text-gray-800",
            };

            return (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Link
                      href={`/pickup-requests/${request.id}`}
                      className="flex-1"
                    >
                      <CardTitle className="text-lg hover:text-primary transition-colors">
                        {formatDateTime(request.pickup_time)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {formatDateTimeShort(request.created_at)}
                      </CardDescription>
                    </Link>
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
                    {/* 취소 사유 표시 (CANCELLED 상태인 경우) */}
                    {request.status === "CANCELLED" && request.cancel_reason_code && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-muted-foreground">
                          취소 사유: {request.cancel_reason_code === "CANCEL" ? "일반 취소" : "노쇼"}
                        </p>
                        {request.cancel_reason_text && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {request.cancel_reason_text}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/pickup-requests/${request.id}`}>
                        상세 보기
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}




