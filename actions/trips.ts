/**
 * @file actions/trips.ts
 * @description Trip 관련 Server Actions
 *
 * 주요 기능:
 * 1. Trip 생성 (createTrip)
 * 2. 내 Trip 목록 조회 (getMyTrips)
 * 3. Trip 조회 및 소유자 확인 (getTripById)
 * 4. Trip 참여자 목록 조회 (getTripParticipants)
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

/**
 * Trip 생성
 */
export async function createTrip() {
  try {
    console.group("🚗 [Trip 생성] 시작");
    
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
        error: "프로필 정보를 찾을 수 없습니다. 로그아웃 후 다시 로그인해주세요.",
      };
    }
    console.log("✅ Profile 조회 완료:", { profileId: profile.id });

    // 3. Trip 생성
    const { data: trip, error: insertError } = await supabase
      .from("trips")
      .insert({
        provider_profile_id: profile.id,
        status: "OPEN",
        is_locked: false,
        capacity: 3,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Trip 생성 실패:", insertError);
      console.groupEnd();
      return {
        success: false,
        error: "Trip 생성에 실패했습니다. 다시 시도해주세요.",
      };
    }

    console.log("✅ Trip 생성 완료:", { tripId: trip.id, status: trip.status });
    console.groupEnd();

    // 4. 캐시 무효화
    revalidatePath("/trips");

    return {
      success: true,
      data: trip,
    };
  } catch (error) {
    console.error("❌ createTrip 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

/**
 * 내 Trip 목록 조회
 */
export async function getMyTrips(status?: string) {
  try {
    console.group("🚗 [Trip 목록 조회] 시작");
    
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
        data: [],
      };
    }
    console.log("✅ Profile 조회 완료:", { profileId: profile.id });

    // 3. Trip 목록 조회
    let query = supabase
      .from("trips")
      .select("*")
      .eq("provider_profile_id", profile.id)
      .order("created_at", { ascending: false });

    // 상태 필터링 (선택사항)
    if (status) {
      query = query.eq("status", status);
      console.log("📋 상태 필터링:", { status });
    }

    const { data: trips, error: selectError } = await query;

    if (selectError) {
      console.error("❌ Trip 목록 조회 실패:", selectError);
      console.groupEnd();
      return {
        success: false,
        error: "Trip 목록을 불러오는데 실패했습니다.",
        data: [],
      };
    }

    console.log("✅ Trip 목록 조회 완료:", { count: trips?.length || 0 });
    console.groupEnd();

    return {
      success: true,
      data: trips || [],
    };
  } catch (error) {
    console.error("❌ getMyTrips 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

/**
 * Trip 조회 및 소유자 확인
 * 
 * 특정 Trip을 조회하고, 현재 사용자가 소유자인지 확인합니다.
 * 초대 페이지에서 사용됩니다.
 */
export async function getTripById(tripId: string) {
  try {
    console.group("🚗 [Trip 조회] 시작");
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

    // 3. Trip 조회
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
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
    console.log("✅ Trip 조회 완료:", { tripId: trip.id, providerId: trip.provider_profile_id });

    // 4. 소유자 확인
    if (trip.provider_profile_id !== profile.id) {
      console.error("❌ Trip 소유자가 아님:", {
        tripProviderId: trip.provider_profile_id,
        currentProfileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 Trip에 대한 접근 권한이 없습니다.",
        data: null,
      };
    }
    console.log("✅ 소유자 확인 완료");

    // 5. Trip 상태 확인 (LOCK 여부는 UI에서 처리)
    console.log("📋 Trip 상태:", {
      status: trip.status,
      isLocked: trip.is_locked,
      capacity: trip.capacity,
    });
    console.groupEnd();

    return {
      success: true,
      data: trip,
    };
  } catch (error) {
    console.error("❌ getTripById 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: null,
    };
  }
}

/**
 * Trip 참여자 목록 조회
 * 
 * 특정 Trip의 참여자 목록을 조회합니다.
 * 제공자만 자신의 Trip 참여자 목록을 조회할 수 있습니다.
 * 
 * @param tripId - Trip ID
 * @returns 참여자 목록 및 픽업 요청 정보
 */
export async function getTripParticipants(tripId: string) {
  try {
    console.group("👥 [Trip 참여자 목록 조회] 시작");
    console.log("1️⃣ Trip ID:", tripId);

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
        data: [],
      };
    }
    console.log("✅ Profile 조회 완료:", { profileId: profile.id });

    // 3. Trip 조회 및 소유자 확인
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      console.error("❌ Trip 조회 실패:", tripError);
      console.groupEnd();
      return {
        success: false,
        error: "Trip을 찾을 수 없습니다.",
        data: [],
      };
    }
    console.log("✅ Trip 조회 완료:", { tripId: trip.id, providerId: trip.provider_profile_id });

    // 4. Trip 소유자 확인 (제공자만 조회 가능)
    if (trip.provider_profile_id !== profile.id) {
      console.error("❌ Trip 소유자가 아님:", {
        tripProviderId: trip.provider_profile_id,
        currentProfileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 Trip에 대한 접근 권한이 없습니다.",
        data: [],
      };
    }
    console.log("✅ Trip 소유자 확인 완료");

    // 5. 참여자 목록 조회 (픽업 요청 정보 JOIN)
    const { data: participants, error: participantsError } = await supabase
      .from("trip_participants")
      .select(
        `
        id,
        trip_id,
        pickup_request_id,
        requester_profile_id,
        sequence_order,
        created_at,
        pickup_request:pickup_requests!inner(
          id,
          pickup_time,
          origin_text,
          origin_lat,
          origin_lng,
          destination_text,
          destination_lat,
          destination_lng,
          status
        )
      `
      )
      .eq("trip_id", tripId)
      .order("sequence_order", { ascending: true });

    if (participantsError) {
      console.error("❌ 참여자 목록 조회 실패:", participantsError);
      console.groupEnd();
      return {
        success: false,
        error: "참여자 목록을 불러오는데 실패했습니다.",
        data: [],
      };
    }

    console.log("✅ 참여자 목록 조회 완료:", {
      count: participants?.length || 0,
    });
    console.groupEnd();

    return {
      success: true,
      data: participants || [],
    };
  } catch (error) {
    console.error("❌ getTripParticipants 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

