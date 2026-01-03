/**
 * @file actions/pickup-requests.ts
 * @description 픽업 요청 관련 Server Actions
 *
 * 주요 기능:
 * 1. 픽업 요청 등록 (createPickupRequest)
 * 2. 내 픽업 요청 목록 조회 (getMyPickupRequests)
 *
 * 핵심 구현 로직:
 * - Clerk 인증 확인
 * - Profile ID 조회 (clerk_user_id 기준)
 * - Supabase DB 작업 (INSERT, SELECT)
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
import type { PickupRequestFormData } from "@/lib/validations/pickup-request";

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

    // 3. 픽업 요청 등록
    const { data: pickupRequest, error: insertError } = await supabase
      .from("pickup_requests")
      .insert({
        requester_profile_id: profile.id,
        pickup_time: data.pickup_time,
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

