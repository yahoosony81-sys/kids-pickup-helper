/**
 * @file actions/trips.ts
 * @description Trip 관련 Server Actions
 *
 * 주요 기능:
 * 1. Trip 생성 (createTrip)
 * 2. 내 Trip 목록 조회 (getMyTrips)
 * 3. Trip 조회 및 소유자 확인 (getTripById)
 * 4. Trip 참여자 목록 조회 (getTripParticipants)
 * 5. Trip 출발 처리 (startTrip) - LOCK 처리
 *
 * 핵심 구현 로직:
 * - Clerk 인증 확인
 * - Profile ID 조회 (clerk_user_id 기준)
 * - Supabase DB 작업 (INSERT, SELECT, UPDATE)
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

/**
 * Trip 출발 처리 (LOCK)
 * 
 * 제공자가 Trip을 출발시키면 Trip이 LOCK 상태가 되고,
 * 이후 추가 초대나 초대 수락이 불가능해집니다.
 * PRD Section 4의 Trip LOCK 규칙을 준수합니다.
 * 
 * 트랜잭션 처리:
 * 1. Trip 업데이트: is_locked = true, status = 'IN_PROGRESS', start_at = now()
 * 2. 남아있는 모든 PENDING 초대를 EXPIRED 처리
 * 3. 관련 pickup_requests.status = 'IN_PROGRESS' 업데이트
 * 
 * @param tripId - Trip ID
 * @returns 성공/실패 결과 및 에러 메시지
 */
export async function startTrip(tripId: string) {
  try {
    console.group("🚗 [Trip 출발 처리] 시작");
    console.log("1️⃣ Trip ID:", tripId);

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
        error: "프로필 정보를 찾을 수 없습니다.",
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
      };
    }
    console.log("✅ Trip 조회 완료:", { tripId: trip.id, providerId: trip.provider_profile_id });

    // 4. Trip 소유자 확인
    if (trip.provider_profile_id !== profile.id) {
      console.error("❌ Trip 소유자가 아님:", {
        tripProviderId: trip.provider_profile_id,
        currentProfileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 Trip에 대한 접근 권한이 없습니다.",
      };
    }
    console.log("✅ Trip 소유자 확인 완료");

    // 5. Trip is_locked = false 확인
    if (trip.is_locked) {
      console.error("❌ Trip이 이미 LOCK됨");
      console.groupEnd();
      return {
        success: false,
        error: "이미 출발한 Trip입니다.",
      };
    }
    console.log("✅ Trip LOCK 상태 확인 완료 (is_locked = false)");

    // 6. Trip에 참여자 존재 확인
    const { data: participants, error: participantsError } = await supabase
      .from("trip_participants")
      .select("id, pickup_request_id")
      .eq("trip_id", tripId);

    if (participantsError) {
      console.error("❌ 참여자 조회 실패:", participantsError);
      console.groupEnd();
      return {
        success: false,
        error: "참여자 정보를 불러오는데 실패했습니다.",
      };
    }

    const participantCount = participants?.length || 0;
    console.log("📊 참여자 수:", { participantCount });

    if (participantCount === 0) {
      console.error("❌ 참여자가 없음");
      console.groupEnd();
      return {
        success: false,
        error: "참여자가 없어 출발할 수 없습니다.",
      };
    }
    console.log("✅ 참여자 존재 확인 완료");

    // 7. 트랜잭션 처리 (순차 실행)
    console.group("🔄 트랜잭션 처리 시작");

    // 7-1. Trip 업데이트: is_locked = true, status = 'IN_PROGRESS', start_at = now()
    console.log("1️⃣ Trip 업데이트 중...");
    const { error: updateTripError } = await supabase
      .from("trips")
      .update({
        is_locked: true,
        status: "IN_PROGRESS",
        start_at: new Date().toISOString(),
      })
      .eq("id", tripId);

    if (updateTripError) {
      console.error("❌ Trip 업데이트 실패:", updateTripError);
      console.groupEnd();
      console.groupEnd();
      return {
        success: false,
        error: "Trip 출발 처리에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ Trip 업데이트 완료");

    // 7-2. 남아있는 모든 PENDING 초대를 EXPIRED 처리
    console.log("2️⃣ PENDING 초대 EXPIRED 처리 중...");
    const { error: expireInvitationsError } = await supabase
      .from("invitations")
      .update({
        status: "EXPIRED",
      })
      .eq("trip_id", tripId)
      .eq("status", "PENDING");

    if (expireInvitationsError) {
      console.error("❌ 초대 EXPIRED 처리 실패:", expireInvitationsError);
      console.groupEnd();
      console.groupEnd();
      return {
        success: false,
        error: "초대 만료 처리에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ PENDING 초대 EXPIRED 처리 완료");

    // 7-3. 관련 pickup_requests.status = 'IN_PROGRESS' 업데이트
    console.log("3️⃣ 픽업 요청 상태 업데이트 중...");
    const pickupRequestIds = participants?.map((p) => p.pickup_request_id) || [];
    
    if (pickupRequestIds.length > 0) {
      const { error: updateRequestsError } = await supabase
        .from("pickup_requests")
        .update({
          status: "IN_PROGRESS",
        })
        .in("id", pickupRequestIds);

      if (updateRequestsError) {
        console.error("❌ 픽업 요청 상태 업데이트 실패:", updateRequestsError);
        console.groupEnd();
        console.groupEnd();
        return {
          success: false,
          error: "픽업 요청 상태 업데이트에 실패했습니다. 다시 시도해주세요.",
        };
      }
      console.log("✅ 픽업 요청 상태 업데이트 완료:", { count: pickupRequestIds.length });
    } else {
      console.log("⚠️ 업데이트할 픽업 요청이 없음");
    }

    console.groupEnd(); // 트랜잭션 처리 종료
    console.log("✅ 모든 트랜잭션 처리 완료");
    console.groupEnd(); // 전체 함수 종료

    // 8. 캐시 무효화
    revalidatePath("/trips");
    revalidatePath(`/trips/${tripId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ startTrip 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

