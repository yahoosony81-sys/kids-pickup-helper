/**
 * @file app/(routes)/pickup-requests/[requestId]/review/page.tsx
 * @description 리뷰 작성 페이지
 *
 * 주요 기능:
 * 1. 픽업 요청 조회 및 소유자 확인
 * 2. 리뷰 작성 여부 확인
 * 3. 리뷰 작성 폼 표시 (평점, 코멘트)
 * 4. 리뷰 제출 처리
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getPickupRequestById, getMyReview Server Action 호출
 * - COMPLETED 상태만 리뷰 가능
 * - 이미 작성한 경우 수정 불가 안내
 * - React Hook Form + Zod resolver 사용
 *
 * @dependencies
 * - @/actions/pickup-requests: getPickupRequestById Server Action
 * - @/actions/trip-reviews: getMyReview Server Action
 * - @/components/trip-reviews/submit-review-button: 리뷰 제출 버튼
 * - @/components/ui/form: 폼 컴포넌트
 */

import { getPickupRequestById } from "@/actions/pickup-requests";
import { getMyReview } from "@/actions/trip-reviews";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle2, Star } from "lucide-react";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { ReviewForm } from "@/components/trip-reviews/review-form";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ReviewPageProps {
  params: Promise<{ requestId: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
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

  // 2. 상태 확인 (COMPLETED만 허용)
  if (pickupRequest.status !== "COMPLETED") {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>서비스가 완료된 요청만 리뷰를 작성할 수 있습니다.</p>
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

  // 3. 리뷰 작성 여부 확인
  const reviewResult = await getMyReview(requestId);
  const existingReview = reviewResult.success ? reviewResult.data : null;

  // 4. Trip ID 및 제공자 Profile ID 조회
  const supabase = createClerkSupabaseClient();
  const { data: participant } = await supabase
    .from("trip_participants")
    .select("trip_id")
    .eq("pickup_request_id", requestId)
    .single();

  let tripId: string | null = null;
  let providerProfileId: string | null = null;

  if (participant) {
    tripId = participant.trip_id;
    const { data: trip } = await supabase
      .from("trips")
      .select("provider_profile_id")
      .eq("id", tripId)
      .single();

    if (trip) {
      providerProfileId = trip.provider_profile_id;
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/pickup-requests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            픽업 요청 목록으로
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* 픽업 요청 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>픽업 요청 정보</CardTitle>
            <CardDescription>
              리뷰를 작성할 픽업 요청 정보입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">픽업 시간</p>
              <p className="text-base">{formatDateTime(pickupRequest.pickup_time)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">출발지</p>
              <p className="text-base">{pickupRequest.origin_text}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">목적지</p>
              <p className="text-base">{pickupRequest.destination_text}</p>
            </div>
          </CardContent>
        </Card>

        {/* 리뷰 작성 여부에 따른 분기 */}
        {existingReview ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <CardTitle>리뷰 작성 완료</CardTitle>
              </div>
              <CardDescription>
                이미 리뷰를 작성하셨습니다. 리뷰는 수정할 수 없습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">평점</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= existingReview.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {existingReview.rating}점
                  </span>
                </div>
              </div>
              {existingReview.comment && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">코멘트</p>
                  <p className="text-base">{existingReview.comment}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">작성 일시</p>
                <p className="text-base">{formatDateTime(existingReview.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>리뷰 작성</CardTitle>
              <CardDescription>
                서비스에 대한 리뷰를 작성해주세요. 리뷰는 한 번만 작성할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tripId && providerProfileId ? (
                <ReviewForm
                  pickupRequestId={requestId}
                  tripId={tripId}
                  providerProfileId={providerProfileId}
                />
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p>Trip 정보를 찾을 수 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


