/**
 * @file actions/pickup-requests.ts
 * @description 픽업 요청 관련 Server Actions
 *
 * 주요 기능:
 * 1. 픽업 요청 등록 (createPickupRequest)
 * 2. 내 픽업 요청 목록 조회 (getMyPickupRequests)
 * 3. 초대 가능한 요청자 리스트 조회 (getAvailablePickupRequests)
 *
 * 핵심 구현 로직:
 * - Clerk 인증 확인
 * - Profile ID 조회 (clerk_user_id 기준)
 * - Supabase DB 작업 (INSERT, SELECT)
 * - 에러 처리 및 사용자 친화적 메시지
 * - PRD 규칙 준수: 정확한 주소/좌표는 초대 수락 후에만 공개
 *
 * @dependencies
 * - @clerk/nextjs/server: 서버 사이드 Clerk 인증
 * - @/lib/supabase/server: Clerk + Supabase 통합 클라이언트
 * - @/lib/utils/address: 주소 파싱 유틸리티
 */

"use server";

import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PickupRequestFormData } from "@/lib/validations/pickup-request";
import { extractAreaFromAddress, detectDestinationType } from "@/lib/utils/address";
import { expireRequestsIfPast } from "@/lib/utils/request-expiration";

/**
 * 픽업 요청 등록
 */
export async function createPickupRequest(data: PickupRequestFormData) {
  try {
    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: "로그인이 필요합니다.",
      };
    }

    // 2. Profile ID 조회
    const supabase = createClerkSupabaseClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile 조회 실패:", profileError);
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다. 로그아웃 후 다시 로그인해주세요.",
      };
    }

    // 3. 픽업 시간 저장 (한국 시간 기준, 변환 없이 그대로 저장)
    // datetime-local input은 "YYYY-MM-DDTHH:mm" 형식으로 반환됩니다.
    // 데이터베이스의 pickup_time 컬럼은 timestamp 타입이므로 타임존 없이 저장됩니다.
    const pickupTime = data.pickup_time; // "2024-01-01T17:30" 형식 그대로 사용

    // 4. 픽업 요청 등록
    const { data: pickupRequest, error: insertError } = await supabase
      .from("pickup_requests")
      .insert({
        requester_profile_id: profile.id,
        pickup_time: pickupTime,
        origin_text: data.origin_text,
        origin_lat: data.origin_lat,
        origin_lng: data.origin_lng,
        destination_text: data.destination_text,
        destination_lat: data.destination_lat,
        destination_lng: data.destination_lng,
        status: "REQUESTED",
      })
      .select()
      .single();

    if (insertError) {
      console.error("픽업 요청 등록 실패:", insertError);
      return {
        success: false,
        error: "픽업 요청 등록에 실패했습니다. 다시 시도해주세요.",
      };
    }

    // 4. 캐시 무효화
    revalidatePath("/pickup-requests");
    revalidatePath("/my");

    return {
      success: true,
      data: pickupRequest,
    };
  } catch (error) {
    console.error("createPickupRequest 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

/**
 * 내 픽업 요청 목록 조회
 */
export async function getMyPickupRequests(status?: string) {
  try {
    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: "로그인이 필요합니다.",
        data: [],
      };
    }

    // 2. Profile ID 조회
    const supabase = createClerkSupabaseClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile 조회 실패:", profileError);
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다.",
        data: [],
      };
    }

    // 3. 픽업 요청 목록 조회
    let query = supabase
      .from("pickup_requests")
      .select("*")
      .eq("requester_profile_id", profile.id)
      .order("created_at", { ascending: false });

    // 상태 필터링 (선택사항)
    if (status) {
      query = query.eq("status", status);
    }

    const { data: pickupRequests, error: selectError } = await query;

    if (selectError) {
      console.error("픽업 요청 목록 조회 실패:", selectError);
      return {
        success: false,
        error: "픽업 요청 목록을 불러오는데 실패했습니다.",
        data: [],
      };
    }

    // 4. 만료 처리 (lazy cleanup): REQUESTED, MATCHED 상태인 요청만 체크
    const activeRequests = (pickupRequests || []).filter(
      (req) => req.status === "REQUESTED" || req.status === "MATCHED"
    );
    const requestIds = activeRequests.map((req) => req.id);

    if (requestIds.length > 0) {
      console.log("⏰ 만료 처리 대상 Request:", { count: requestIds.length });
      const expiredRequestIds = await expireRequestsIfPast(requestIds, supabase);

      // 만료된 Request의 상태를 업데이트
      for (const request of pickupRequests || []) {
        if (expiredRequestIds.includes(request.id)) {
          request.status = "EXPIRED";
        }
      }

      if (expiredRequestIds.length > 0) {
        console.log("✅ 만료 처리 완료:", { count: expiredRequestIds.length });
      }
    }

    return {
      success: true,
      data: pickupRequests || [],
    };
  } catch (error) {
    console.error("getMyPickupRequests 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

/**
 * 픽업 요청 조회
 * 
 * 특정 픽업 요청을 조회합니다. 요청자만 자신의 요청을 조회할 수 있습니다.
 * 
 * @param pickupRequestId - 픽업 요청 ID
 * @returns 성공/실패 결과 및 픽업 요청 데이터
 */
export async function getPickupRequestById(pickupRequestId: string) {
  try {
    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: "로그인이 필요합니다.",
        data: null,
      };
    }

    // 2. Profile ID 조회
    const supabase = createClerkSupabaseClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile 조회 실패:", profileError);
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다.",
        data: null,
      };
    }

    // 3. 픽업 요청 조회
    const { data: pickupRequest, error: requestError } = await supabase
      .from("pickup_requests")
      .select("*")
      .eq("id", pickupRequestId)
      .single();

    if (requestError || !pickupRequest) {
      console.error("픽업 요청 조회 실패:", requestError);
      return {
        success: false,
        error: "픽업 요청을 찾을 수 없습니다.",
        data: null,
      };
    }

    // 3-1. 만료 처리
    const { expireRequestIfPast } = await import("@/lib/utils/request-expiration");
    const { expired, request: updatedRequest } = await expireRequestIfPast(
      pickupRequestId,
      supabase
    );
    if (expired && updatedRequest) {
      console.log("⏰ Request 만료 처리 완료:", {
        requestId: updatedRequest.id,
        status: updatedRequest.status,
      });
      // 업데이트된 Request 사용
      pickupRequest.status = updatedRequest.status;
    }

    // 4. 소유자 확인
    if (pickupRequest.requester_profile_id !== profile.id) {
      return {
        success: false,
        error: "본인의 픽업 요청만 조회할 수 있습니다.",
        data: null,
      };
    }

    return {
      success: true,
      data: pickupRequest,
    };
  } catch (error) {
    console.error("getPickupRequestById 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: null,
    };
  }
}

/**
 * 초대 가능한 요청자 리스트 조회
 * 
 * 제공자가 초대할 수 있는 요청자 리스트를 조회합니다.
 * PRD 규칙에 따라 정확한 주소와 좌표는 제외하고,
 * 시간대, 대략 위치(구/동), 목적지 유형만 반환합니다.
 */
export async function getAvailablePickupRequests() {
  try {
    console.group("📋 [요청자 리스트 조회] 시작");
    
    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ 인증되지 않은 사용자");
      console.groupEnd();
      return {
        success: false,
        error: "로그인이 필요합니다.",
        data: [],
      };
    }
    console.log("✅ 인증 확인 완료:", { userId });

    // 2. Profile ID 조회 (제공자 확인용)
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
        data: [],
      };
    }
    console.log("✅ Profile 조회 완료:", { profileId: profile.id });

    // 3. REQUESTED 상태인 픽업 요청만 조회 (requester_profile_id 포함)
    const { data: pickupRequests, error: selectError } = await supabase
      .from("pickup_requests")
      .select("id, pickup_time, origin_text, destination_text, requester_profile_id, status")
      .eq("status", "REQUESTED")
      .order("pickup_time", { ascending: true });

    // 3-1. 만료 처리 (lazy cleanup)
    if (pickupRequests && pickupRequests.length > 0) {
      const requestIds = pickupRequests.map((req) => req.id);
      const expiredRequestIds = await expireRequestsIfPast(requestIds, supabase);

      // 만료된 Request 제외
      const validRequests = pickupRequests.filter(
        (req) => !expiredRequestIds.includes(req.id)
      );

      if (expiredRequestIds.length > 0) {
        console.log("✅ 만료된 Request 제외:", {
          total: pickupRequests.length,
          expired: expiredRequestIds.length,
          valid: validRequests.length,
        });
      }

      // 만료되지 않은 Request만 사용
      pickupRequests.length = 0;
      pickupRequests.push(...validRequests);
    }

    if (selectError) {
      console.error("❌ 픽업 요청 목록 조회 실패:", selectError);
      console.groupEnd();
      return {
        success: false,
        error: "요청자 목록을 불러오는데 실패했습니다.",
        data: [],
      };
    }

    console.log("✅ 픽업 요청 조회 완료:", { count: pickupRequests?.length || 0 });

    // 4. 각 요청자에 대해 PENDING 초대 존재 여부 확인 (requester_profile_id 기준, 배치 쿼리로 최적화)
    // sendInvitation()과 동일한 기준 사용: requester_profile_id 기준으로 PENDING 초대 확인
    const requesterIds = [
      ...new Set((pickupRequests || []).map((req) => req.requester_profile_id)),
    ];
    const { data: pendingInvitations, error: pendingCheckError } = await supabase
      .from("invitations")
      .select("requester_profile_id")
      .in("requester_profile_id", requesterIds)
      .eq("status", "PENDING");

    if (pendingCheckError) {
      console.error("❌ PENDING 초대 조회 실패:", pendingCheckError);
      // 에러가 발생해도 계속 진행 (hasPendingInvite는 false로 처리)
    }

    // PENDING 초대가 있는 requester_profile_id 집합 생성
    const pendingRequesterIds = new Set(
      (pendingInvitations || []).map((inv) => inv.requester_profile_id)
    );

    console.log("✅ PENDING 초대 확인 완료:", {
      totalRequesters: requesterIds.length,
      pendingCount: pendingRequesterIds.size,
    });

    // 5. 주소 파싱 및 제한된 정보만 반환 (hasPendingInvite 포함)
    const availableRequests = (pickupRequests || []).map((request) => {
      const originArea = extractAreaFromAddress(request.origin_text);
      const destinationArea = extractAreaFromAddress(request.destination_text);
      const destinationType = detectDestinationType(request.destination_text);

      // 픽업 시간 포맷팅 (한국 시간 기준, 변환 없이 그대로 사용)
      // 데이터베이스에 저장된 시간은 이미 한국 시간이므로 변환 불필요
      const date = new Date(request.pickup_time);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeLabel = hours < 12 
        ? `오전 ${hours === 0 ? 12 : hours}시${minutes > 0 ? ` ${minutes}분` : ""}`
        : `오후 ${hours === 12 ? 12 : hours - 12}시${minutes > 0 ? ` ${minutes}분` : ""}`;

      return {
        id: request.id,
        pickup_time: timeLabel,
        pickup_time_raw: request.pickup_time, // 날짜 비교용 원본 값
        origin_area: originArea,
        destination_area: destinationArea,
        destination_type: destinationType,
        hasPendingInvite: pendingRequesterIds.has(request.requester_profile_id),
      };
    });

    console.log("✅ 주소 파싱 및 PENDING 상태 확인 완료:", { count: availableRequests.length });
    console.groupEnd();

    return {
      success: true,
      data: availableRequests,
    };
  } catch (error) {
    console.error("❌ getAvailablePickupRequests 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

/**
 * 도착 확인 처리
 *
 * 요청자가 도착 완료를 확인합니다.
 * progress_stage를 'COMPLETED'로 업데이트합니다 (선택사항, MVP에서는 변경 안 해도 됨).
 *
 * @param pickupRequestId - 픽업 요청 ID
 * @returns 성공/실패 결과 및 에러 메시지
 */
export async function confirmArrival(pickupRequestId: string) {
  try {
    console.group("✅ [도착 확인 처리] 시작");
    console.log("1️⃣ Pickup Request ID:", pickupRequestId);

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
      };
    }
    console.log("✅ Profile 조회 완료:", { profileId: profile.id });

    // 3. 픽업 요청 조회 및 소유자 확인
    const { data: pickupRequest, error: requestError } = await supabase
      .from("pickup_requests")
      .select("id, requester_profile_id, progress_stage")
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

    if (pickupRequest.requester_profile_id !== profile.id) {
      console.error("❌ 픽업 요청 소유자가 아님");
      console.groupEnd();
      return {
        success: false,
        error: "이 픽업 요청에 대한 접근 권한이 없습니다.",
      };
    }
    console.log("✅ 픽업 요청 소유자 확인 완료");

    // 4. progress_stage가 'ARRIVED'인지 확인
    if (pickupRequest.progress_stage !== "ARRIVED") {
      console.error("❌ 도착 확인 불가능한 상태:", pickupRequest.progress_stage);
      console.groupEnd();
      return {
        success: false,
        error: "도착 완료된 픽업 요청에만 확인할 수 있습니다.",
      };
    }
    console.log("✅ 픽업 요청 상태 확인 완료:", { progressStage: pickupRequest.progress_stage });

    // 5. progress_stage = 'COMPLETED' 업데이트 (선택사항, MVP에서는 변경 안 해도 됨)
    // 현재는 주석 처리하여 변경하지 않음

    console.log("✅ 도착 확인 처리 완료");
    console.groupEnd();

    // 6. 캐시 무효화
    revalidatePath("/my");
    revalidatePath(`/pickup-requests/${pickupRequestId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ confirmArrival 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

/**
 * 픽업 요청 취소
 *
 * PRD Section 4의 취소/노쇼 규칙에 따라:
 * - 취소와 노쇼는 모두 CANCELLED 상태로 처리
 * - cancel_reason_code로 구분: CANCEL 또는 NO_SHOW
 * - cancel_reason_text에 상세 사유 저장
 *
 * 취소 가능 조건:
 * - status가 IN_PROGRESS 이전 (REQUESTED, MATCHED만 허용)
 * - 요청자 본인만 취소 가능
 *
 * 취소 시 처리:
 * 1. pickup_requests.status = 'CANCELLED', cancel_reason_code, cancel_reason_text 업데이트
 * 2. 관련 PENDING 초대 EXPIRED 처리
 * 3. 관련 trip_participants 삭제 (capacity 자동 복구)
 *
 * @param pickupRequestId - 픽업 요청 ID
 * @param cancelReasonCode - 취소 사유 코드 (CANCEL 또는 NO_SHOW)
 * @param cancelReasonText - 취소 상세 사유 (선택사항)
 * @returns 성공/실패 결과 및 에러 메시지
 */
export async function cancelPickupRequest(
  pickupRequestId: string,
  cancelReasonCode: "CANCEL" | "NO_SHOW",
  cancelReasonText?: string
) {
  try {
    console.group("🚫 [픽업 요청 취소] 시작");
    console.log("1️⃣ Pickup Request ID:", pickupRequestId);
    console.log("2️⃣ Cancel Reason Code:", cancelReasonCode);
    console.log("3️⃣ Cancel Reason Text:", cancelReasonText || "(없음)");

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
        error: "프로필 정보를 찾을 수 없습니다. 로그아웃 후 다시 로그인해주세요.",
      };
    }
    console.log("✅ Profile 조회 완료:", { profileId: profile.id });

    // 3. 픽업 요청 조회
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
      status: pickupRequest.status,
      requesterId: pickupRequest.requester_profile_id,
    });

    // 4. 소유자 확인
    if (pickupRequest.requester_profile_id !== profile.id) {
      console.error("❌ 픽업 요청 소유자가 아님:", {
        requestRequesterId: pickupRequest.requester_profile_id,
        currentProfileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "본인의 픽업 요청만 취소할 수 있습니다.",
      };
    }
    console.log("✅ 소유자 확인 완료");

    // 5. 상태 검증 (IN_PROGRESS 이전만 취소 가능)
    if (
      pickupRequest.status !== "REQUESTED" &&
      pickupRequest.status !== "MATCHED"
    ) {
      console.error("❌ 취소 불가능한 상태:", { status: pickupRequest.status });
      console.groupEnd();
      
      if (pickupRequest.status === "CANCELLED") {
        return {
          success: false,
          error: "이미 취소된 픽업 요청입니다.",
        };
      }
      
      return {
        success: false,
        error: "이미 진행 중이거나 완료된 픽업 요청은 취소할 수 없습니다.",
      };
    }
    console.log("✅ 상태 검증 완료:", { status: pickupRequest.status });

    // 6. 트랜잭션 처리 (순차 실행)
    console.group("🔄 트랜잭션 처리 시작");

    // 6-1. pickup_requests 업데이트
    console.log("1️⃣ 픽업 요청 상태 업데이트 중...");
    const { data: updateResult, error: updateError } = await supabase
      .from("pickup_requests")
      .update({
        status: "CANCELLED",
        cancel_reason_code: cancelReasonCode,
        cancel_reason_text: cancelReasonText || null,
      })
      .eq("id", pickupRequestId)
      .eq("requester_profile_id", profile.id)
      .eq("status", pickupRequest.status) // 동시성 문제 방지
      .select("id, status");

    if (updateError) {
      console.error("❌ 픽업 요청 상태 업데이트 실패:", updateError);
      console.groupEnd();
      console.groupEnd();
      return {
        success: false,
        error: "취소 처리에 실패했습니다. 다시 시도해주세요.",
      };
    }

    if (!updateResult || updateResult.length === 0) {
      console.error("❌ 업데이트된 행이 없음 (상태가 변경되었을 수 있음)");
      console.groupEnd();
      console.groupEnd();
      return {
        success: false,
        error: "취소 처리에 실패했습니다. 요청 상태가 변경되었을 수 있습니다.",
      };
    }

    console.log("✅ 픽업 요청 상태 업데이트 완료 (CANCELLED)");

    // 6-2. 관련 PENDING 초대 EXPIRED 처리
    console.log("2️⃣ 관련 PENDING 초대를 EXPIRED 처리 중...");
    const { error: expireInvitationError } = await supabase
      .from("invitations")
      .update({
        status: "EXPIRED",
        responded_at: new Date().toISOString(),
      })
      .eq("pickup_request_id", pickupRequestId)
      .eq("status", "PENDING");

    if (expireInvitationError) {
      // invitation이 없을 수도 있으므로 경고만
      console.warn("⚠️ invitations 업데이트 실패 (계속 진행):", expireInvitationError);
    } else {
      console.log("✅ 관련 PENDING 초대 EXPIRED 처리 완료");
    }

    // 6-3. 관련 trip_participants 삭제
    console.log("3️⃣ 관련 trip_participants 삭제 중 (capacity 자동 복구)...");
    const { error: deleteParticipantError } = await supabase
      .from("trip_participants")
      .delete()
      .eq("pickup_request_id", pickupRequestId);

    if (deleteParticipantError) {
      // trip_participants가 없을 수도 있으므로 경고만
      console.warn("⚠️ trip_participants 삭제 실패 (계속 진행):", deleteParticipantError);
    } else {
      console.log("✅ 관련 trip_participants 삭제 완료 (capacity 자동 복구)");
    }

    console.groupEnd(); // 트랜잭션 처리 종료
    console.log("✅ 모든 트랜잭션 처리 완료");
    console.groupEnd();

    // 7. 캐시 무효화
    revalidatePath("/pickup-requests");
    revalidatePath(`/pickup-requests/${pickupRequestId}`);
    revalidatePath("/my");

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ cancelPickupRequest 에러:", error);
    console.groupEnd();
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

