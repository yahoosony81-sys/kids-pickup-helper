/**
 * @file actions/trip-reviews.ts
 * @description 리뷰 관련 Server Actions
 *
 * 주요 기능:
 * 1. 리뷰 제출 (submitReview)
 * 2. 요청자 본인의 리뷰 조회 (getMyReview)
 * 3. Trip별 리뷰 목록 조회 (getTripReviews)
 * 4. 리뷰 자동 종료 처리 (autoClosePendingReviews)
 *
 * 핵심 구현 로직:
 * - Clerk 인증 확인
 * - Profile ID 조회 (clerk_user_id 기준)
 * - Phase 8 원칙: 리뷰는 서비스 완료와 분리, 상태 변경 없음
 * - 리뷰 제출 시 pickup_requests.status 또는 trips.status를 변경하지 않음 (이미 COMPLETED)
 * - 중복 리뷰 방지 (pickup_request_id 기준)
 * - 제공자 평균 평점 계산
 * - 에러 처리 및 사용자 친화적 메시지
 *
 * @dependencies
 * - @clerk/nextjs/server: 서버 사이드 Clerk 인증
 * - @/lib/supabase/server: Clerk + Supabase 통합 클라이언트
 */

"use server";

import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TripReviewFormData } from "@/lib/validations/trip-review";

/**
 * 리뷰 제출
 *
 * 요청자가 서비스 완료된 픽업 요청에 대해 리뷰를 작성합니다.
 * Phase 8 원칙: 리뷰 제출 시 상태를 변경하지 않음 (이미 COMPLETED 상태 유지)
 *
 * @param pickupRequestId - 픽업 요청 ID
 * @param data - 리뷰 데이터 (rating, comment)
 * @returns 성공/실패 결과 및 에러 메시지
 */
export async function submitReview(
  pickupRequestId: string,
  data: TripReviewFormData
) {
  try {
    console.group("⭐ [리뷰 제출] 시작");
    console.log("1️⃣ Pickup Request ID:", pickupRequestId);
    console.log("2️⃣ 리뷰 데이터:", data);

    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ 인증되지 않은 사용자");
      console.groupEnd();
      return {
        success: false,
        error: "로그인이 필요합니다.",
      };
    }
    console.log("✅ 인증 확인 완료:", { userId });

    // 2. Profile ID 조회 (요청자)
    const supabase = createClerkSupabaseClient();
    const { data: reviewerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !reviewerProfile) {
      console.error("❌ Profile 조회 실패:", profileError);
      console.groupEnd();
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다. 로그아웃 후 다시 로그인해주세요.",
      };
    }
    console.log("✅ 요청자 Profile 조회 완료:", { profileId: reviewerProfile.id });

    // 3. 픽업 요청 조회 및 소유자 확인
    const { data: pickupRequest, error: requestError } = await supabase
      .from("pickup_requests")
      .select("*")
      .eq("id", pickupRequestId)
      .single();

    if (requestError || !pickupRequest) {
      console.error("❌ 픽업 요청 조회 실패:", requestError);
      console.groupEnd();
      return {
        success: false,
        error: "픽업 요청을 찾을 수 없습니다.",
      };
    }
    console.log("✅ 픽업 요청 조회 완료:", {
      requestId: pickupRequest.id,
      requesterId: pickupRequest.requester_profile_id,
      status: pickupRequest.status,
    });

    // 4. 소유자 확인
    if (pickupRequest.requester_profile_id !== reviewerProfile.id) {
      console.error("❌ 픽업 요청 소유자가 아님:", {
        requestRequesterId: pickupRequest.requester_profile_id,
        currentUserId: reviewerProfile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "본인의 픽업 요청만 리뷰를 작성할 수 있습니다.",
      };
    }

    // 5. 상태 확인 (COMPLETED만 허용)
    if (pickupRequest.status !== "COMPLETED") {
      console.error("❌ 서비스 완료되지 않은 요청:", {
        status: pickupRequest.status,
      });
      console.groupEnd();
      return {
        success: false,
        error: "서비스가 완료된 요청만 리뷰를 작성할 수 있습니다.",
      };
    }

    // 6. 중복 리뷰 방지
    const { data: existingReview, error: reviewCheckError } = await supabase
      .from("trip_reviews")
      .select("id")
      .eq("pickup_request_id", pickupRequestId)
      .single();

    if (reviewCheckError && reviewCheckError.code !== "PGRST116") {
      // PGRST116은 "no rows returned" 에러이므로 무시
      console.error("❌ 리뷰 조회 실패:", reviewCheckError);
      console.groupEnd();
      return {
        success: false,
        error: "리뷰 확인 중 오류가 발생했습니다.",
      };
    }

    if (existingReview) {
      console.error("❌ 이미 리뷰 작성됨:", { reviewId: existingReview.id });
      console.groupEnd();
      return {
        success: false,
        error: "이미 리뷰를 작성하셨습니다.",
      };
    }
    console.log("✅ 중복 리뷰 확인 완료 (리뷰 없음)");

    // 7. Trip ID 및 제공자 Profile ID 조회
    const { data: participant, error: participantError } = await supabase
      .from("trip_participants")
      .select("trip_id")
      .eq("pickup_request_id", pickupRequestId)
      .single();

    if (participantError || !participant) {
      console.error("❌ Trip 참여자 조회 실패:", participantError);
      console.groupEnd();
      return {
        success: false,
        error: "Trip 정보를 찾을 수 없습니다.",
      };
    }
    console.log("✅ Trip 참여자 조회 완료:", { tripId: participant.trip_id });

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("provider_profile_id")
      .eq("id", participant.trip_id)
      .single();

    if (tripError || !trip) {
      console.error("❌ Trip 조회 실패:", tripError);
      console.groupEnd();
      return {
        success: false,
        error: "Trip 정보를 찾을 수 없습니다.",
      };
    }
    console.log("✅ Trip 조회 완료:", { providerId: trip.provider_profile_id });

    // 8. 리뷰 INSERT
    const { data: newReview, error: insertError } = await supabase
      .from("trip_reviews")
      .insert({
        trip_id: participant.trip_id,
        pickup_request_id: pickupRequestId,
        reviewer_profile_id: reviewerProfile.id,
        provider_profile_id: trip.provider_profile_id,
        rating: data.rating,
        comment: data.comment || null,
      })
      .select()
      .single();

    if (insertError || !newReview) {
      console.error("❌ 리뷰 INSERT 실패:", insertError);
      console.groupEnd();
      return {
        success: false,
        error: "리뷰 작성에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ 리뷰 INSERT 완료:", { reviewId: newReview.id });

    // 9. 캐시 무효화
    revalidatePath("/pickup-requests");
    revalidatePath(`/pickup-requests/${pickupRequestId}/review`);
    revalidatePath(`/trips/${participant.trip_id}`);

    console.log("✅ 리뷰 제출 완료");
    console.groupEnd();

    return {
      success: true,
      data: newReview,
    };
  } catch (error) {
    console.error("❌ submitReview 예상치 못한 에러:", error);
    console.groupEnd();
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

/**
 * 요청자 본인의 리뷰 조회
 *
 * 특정 픽업 요청에 대한 요청자 본인의 리뷰를 조회합니다.
 *
 * @param pickupRequestId - 픽업 요청 ID
 * @returns 성공/실패 결과 및 리뷰 데이터
 */
export async function getMyReview(pickupRequestId: string) {
  try {
    console.group("🔍 [리뷰 조회] 시작");
    console.log("1️⃣ Pickup Request ID:", pickupRequestId);

    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ 인증되지 않은 사용자");
      console.groupEnd();
      return {
        success: false,
        error: "로그인이 필요합니다.",
        data: null,
      };
    }
    console.log("✅ 인증 확인 완료:", { userId });

    // 2. Profile ID 조회 (요청자)
    const supabase = createClerkSupabaseClient();
    const { data: reviewerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !reviewerProfile) {
      console.error("❌ Profile 조회 실패:", profileError);
      console.groupEnd();
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다.",
        data: null,
      };
    }
    console.log("✅ 요청자 Profile 조회 완료:", { profileId: reviewerProfile.id });

    // 3. 픽업 요청 조회 및 소유자 확인
    const { data: pickupRequest, error: requestError } = await supabase
      .from("pickup_requests")
      .select("id, requester_profile_id")
      .eq("id", pickupRequestId)
      .single();

    if (requestError || !pickupRequest) {
      console.error("❌ 픽업 요청 조회 실패:", requestError);
      console.groupEnd();
      return {
        success: false,
        error: "픽업 요청을 찾을 수 없습니다.",
        data: null,
      };
    }

    // 소유자 확인
    if (pickupRequest.requester_profile_id !== reviewerProfile.id) {
      console.error("❌ 픽업 요청 소유자가 아님");
      console.groupEnd();
      return {
        success: false,
        error: "본인의 픽업 요청만 조회할 수 있습니다.",
        data: null,
      };
    }

    // 4. 리뷰 조회
    const { data: review, error: reviewError } = await supabase
      .from("trip_reviews")
      .select("*")
      .eq("pickup_request_id", pickupRequestId)
      .single();

    if (reviewError && reviewError.code !== "PGRST116") {
      // PGRST116은 "no rows returned" 에러이므로 무시
      console.error("❌ 리뷰 조회 실패:", reviewError);
      console.groupEnd();
      return {
        success: false,
        error: "리뷰 조회 중 오류가 발생했습니다.",
        data: null,
      };
    }

    console.log("✅ 리뷰 조회 완료:", { hasReview: !!review });
    console.groupEnd();

    return {
      success: true,
      data: review || null,
    };
  } catch (error) {
    console.error("❌ getMyReview 예상치 못한 에러:", error);
    console.groupEnd();
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: null,
    };
  }
}

/**
 * Trip별 리뷰 목록 조회
 *
 * 특정 Trip의 모든 리뷰를 조회하고 제공자 평균 평점을 계산합니다.
 * 제공자 또는 참여자만 조회 가능합니다.
 *
 * @param tripId - Trip ID
 * @returns 성공/실패 결과 및 리뷰 목록, 평균 평점
 */
export async function getTripReviews(tripId: string) {
  try {
    console.group("📊 [Trip 리뷰 목록 조회] 시작");
    console.log("1️⃣ Trip ID:", tripId);

    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ 인증되지 않은 사용자");
      console.groupEnd();
      return {
        success: false,
        error: "로그인이 필요합니다.",
        data: null,
      };
    }
    console.log("✅ 인증 확인 완료:", { userId });

    // 2. Profile ID 조회
    const supabase = createClerkSupabaseClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile 조회 실패:", profileError);
      console.groupEnd();
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다.",
        data: null,
      };
    }
    console.log("✅ Profile 조회 완료:", { profileId: profile.id });

    // 3. Trip 조회 및 권한 확인
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("provider_profile_id")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      console.error("❌ Trip 조회 실패:", tripError);
      console.groupEnd();
      return {
        success: false,
        error: "Trip을 찾을 수 없습니다.",
        data: null,
      };
    }

    // 권한 확인: 제공자 또는 참여자만 조회 가능
    const isProvider = trip.provider_profile_id === profile.id;
    let isParticipant = false;

    if (!isProvider) {
      const { data: participant } = await supabase
        .from("trip_participants")
        .select("id")
        .eq("trip_id", tripId)
        .eq("requester_profile_id", profile.id)
        .single();

      isParticipant = !!participant;
    }

    if (!isProvider && !isParticipant) {
      console.error("❌ 권한 없음 (제공자 또는 참여자 아님)");
      console.groupEnd();
      return {
        success: false,
        error: "이 Trip의 리뷰를 조회할 권한이 없습니다.",
        data: null,
      };
    }
    console.log("✅ 권한 확인 완료:", { isProvider, isParticipant });

    // 4. 리뷰 목록 조회
    const { data: reviews, error: reviewsError } = await supabase
      .from("trip_reviews")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error("❌ 리뷰 목록 조회 실패:", reviewsError);
      console.groupEnd();
      return {
        success: false,
        error: "리뷰 목록을 불러오는데 실패했습니다.",
        data: null,
      };
    }

    // 5. 평균 평점 계산
    const averageRating =
      reviews && reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

    console.log("✅ 리뷰 목록 조회 완료:", {
      reviewCount: reviews?.length || 0,
      averageRating: averageRating.toFixed(2),
    });
    console.groupEnd();

    return {
      success: true,
      data: {
        reviews: reviews || [],
        averageRating: Math.round(averageRating * 10) / 10, // 소수점 첫째 자리까지
        reviewCount: reviews?.length || 0,
      },
    };
  } catch (error) {
    console.error("❌ getTripReviews 예상치 못한 에러:", error);
    console.groupEnd();
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: null,
    };
  }
}

/**
 * 리뷰 자동 종료 처리 (24시간 후)
 *
 * 24시간 경과 후 리뷰 미작성인 요청을 확인합니다.
 * MVP에서는 수동 실행 가능하며, 레코드는 생성하지 않습니다 (리뷰 미작성 상태는 레코드 없음으로 간주).
 *
 * @returns 성공/실패 결과 및 처리된 요청 수
 */
export async function autoClosePendingReviews() {
  try {
    console.group("⏰ [리뷰 자동 종료 처리] 시작");

    // 1. 인증 확인 (관리자 또는 시스템)
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ 인증되지 않은 사용자");
      console.groupEnd();
      return {
        success: false,
        error: "로그인이 필요합니다.",
        data: null,
      };
    }

    const supabase = createClerkSupabaseClient();

    // 2. 24시간 경과 후 리뷰 미작성인 요청 찾기
    const { data: expiredRequests, error: queryError } = await supabase
      .from("pickup_requests")
      .select(
        `
        id,
        status,
        trip_arrivals!inner(created_at)
      `
      )
      .eq("status", "COMPLETED")
      .lt("trip_arrivals.created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (queryError) {
      console.error("❌ 만료된 요청 조회 실패:", queryError);
      console.groupEnd();
      return {
        success: false,
        error: "만료된 요청을 조회하는데 실패했습니다.",
        data: null,
      };
    }

    // 3. 리뷰 미작성인 요청 필터링
    const requestIds = expiredRequests?.map((r) => r.id) || [];
    let expiredWithoutReview: string[] = [];

    if (requestIds.length > 0) {
      const { data: reviews } = await supabase
        .from("trip_reviews")
        .select("pickup_request_id")
        .in("pickup_request_id", requestIds);

      const reviewedRequestIds = new Set(
        reviews?.map((r) => r.pickup_request_id) || []
      );
      expiredWithoutReview = requestIds.filter((id) => !reviewedRequestIds.has(id));
    }

    console.log("✅ 자동 종료 처리 완료:", {
      totalExpired: expiredRequests?.length || 0,
      withoutReview: expiredWithoutReview.length,
    });
    console.groupEnd();

    // 참고: 레코드는 생성하지 않음 (리뷰 미작성 상태는 레코드 없음으로 간주)
    return {
      success: true,
      data: {
        expiredCount: expiredWithoutReview.length,
        expiredRequestIds: expiredWithoutReview,
      },
    };
  } catch (error) {
    console.error("❌ autoClosePendingReviews 예상치 못한 에러:", error);
    console.groupEnd();
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: null,
    };
  }
}




