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

    // 3. REQUESTED 상태인 픽업 요청만 조회
    const { data: pickupRequests, error: selectError } = await supabase
      .from("pickup_requests")
      .select("id, pickup_time, origin_text, destination_text")
      .eq("status", "REQUESTED")
      .order("pickup_time", { ascending: true });

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

    // 4. 주소 파싱 및 제한된 정보만 반환
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
        origin_area: originArea,
        destination_area: destinationArea,
        destination_type: destinationType,
      };
    });

    console.log("✅ 주소 파싱 완료:", { count: availableRequests.length });
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

