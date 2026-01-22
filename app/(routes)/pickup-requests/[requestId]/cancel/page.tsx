/**
 * @file app/(routes)/pickup-requests/[requestId]/cancel/page.tsx
 * @description 픽업 요청 취소 페이지
 *
 * 주요 기능:
 * 1. 픽업 요청 조회 및 소유자 확인
 * 2. 취소 가능 조건 검증 (status가 IN_PROGRESS 이전)
 * 3. 취소 폼 표시
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getPickupRequestById Server Action 호출
 * - 요청자 본인만 접근 가능
 * - 취소 불가능한 경우 안내 메시지 표시
 *
 * @dependencies
 * - @/actions/pickup-requests: getPickupRequestById Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 * - @/components/pickup-requests/cancel-form: 취소 폼 컴포넌트
 */

import { getPickupRequestById } from "@/actions/pickup-requests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, AlertCircle, X } from "lucide-react";
import { CancelForm } from "@/components/pickup-requests/cancel-form";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface CancelPageProps {
  params: Promise<{ requestId: string }>;
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
  EXPIRED: { label: "픽업시간 지남", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export default async function CancelPage({ params }: CancelPageProps) {
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
                <Link href="/pickup-requests">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  픽업 요청 목록으로
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

  // 2. 취소 가능 조건 검증
  const canCancel = pickupRequest.status === "REQUESTED" || pickupRequest.status === "MATCHED";
  const isCancelled = pickupRequest.status === "CANCELLED";

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href={`/pickup-requests/${requestId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            상세 페이지로
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* 픽업 요청 정보 카드 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl">픽업 요청 취소</CardTitle>
                <CardDescription className="mt-1">
                  픽업 요청을 취소하시겠습니까?
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
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">픽업 시간:</p>
              <p>{formatDateTime(pickupRequest.pickup_time)}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">출발지:</p>
              <p>{pickupRequest.origin_text}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">목적지:</p>
              <p>{pickupRequest.destination_text}</p>
            </div>
          </CardContent>
        </Card>

        {/* 취소 불가능한 경우 안내 */}
        {!canCancel && !isCancelled && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    취소 불가능
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    이미 진행 중이거나 완료된 픽업 요청은 취소할 수 없습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 이미 취소된 경우 안내 */}
        {isCancelled && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <X className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    이미 취소됨
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    이 픽업 요청은 이미 취소되었습니다.
                    {pickupRequest.cancel_reason_code && (
                      <>
                        <br />
                        취소 사유: {pickupRequest.cancel_reason_code === "CANCEL" ? "일반 취소" : "노쇼"}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 취소 폼 (취소 가능한 경우만) */}
        {canCancel && (
          <Card>
            <CardHeader>
              <CardTitle>취소 사유 입력</CardTitle>
              <CardDescription>
                취소 사유를 선택하고 상세 내용을 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CancelForm pickupRequestId={requestId} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
