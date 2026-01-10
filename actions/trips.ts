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
import { expireTripsIfPast, expireTripIfPast } from "@/lib/utils/trip-expiration";

/**
 * Trip 생성 (픽업 그룹 생성)
 * 
 * @param data - 그룹 생성 데이터 (title, scheduled_start_at)
 */
export async function createTrip(data: {
  title: string;
  scheduled_start_at: string;
}) {
  try {
    console.group("🚗 [Trip 생성] 시작");
    console.log("1️⃣ 그룹명:", data.title);
    console.log("2️⃣ 출발 예정 시각:", data.scheduled_start_at);
    
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

    // 3. scheduled_start_at 처리
    // 클라이언트에서 이미 ISO 형식(UTC)으로 변환되어 전송되므로 그대로 사용
    const scheduledStartAt = data.scheduled_start_at;

    // 4. Trip 생성
    const { data: trip, error: insertError } = await supabase
      .from("trips")
      .insert({
        provider_profile_id: profile.id,
        title: data.title,
        scheduled_start_at: scheduledStartAt,
        status: "OPEN",
        is_locked: false,
        capacity: 3,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Trip 생성 실패:", insertError);
      console.error("❌ 에러 상세:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });
      console.groupEnd();
      return {
        success: false,
        error: "픽업 그룹 생성에 실패했습니다. 다시 시도해주세요.",
      };
    }

    console.log("✅ Trip 생성 완료:", {
      tripId: trip.id,
      title: trip.title,
      scheduledStartAt: trip.scheduled_start_at,
      status: trip.status,
    });
    console.groupEnd();

    // 5. 캐시 무효화
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
 * 완료된 Trip 목록 조회
 * 
 * 제공자가 완료한 Trip 목록을 조회합니다.
 * ARRIVED 또는 COMPLETED 상태의 Trip만 반환합니다.
 * 
 * @returns 완료된 Trip 목록 (arrived_at DESC 우선, 없으면 created_at DESC)
 */
export async function getMyCompletedTrips() {
  try {
    console.group("🚗 [완료된 Trip 목록 조회] 시작");
    
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

    // 3. 완료된 Trip 목록 조회 (ARRIVED 또는 COMPLETED 상태)
    const { data: trips, error: selectError } = await supabase
      .from("trips")
      .select("*")
      .eq("provider_profile_id", profile.id)
      .in("status", ["ARRIVED", "COMPLETED"])
      .order("arrived_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (selectError) {
      console.error("❌ 완료된 Trip 목록 조회 실패:", selectError);
      console.groupEnd();
      return {
        success: false,
        error: "완료된 Trip 목록을 불러오는데 실패했습니다.",
        data: [],
      };
    }

    // arrived_at이 있는 Trip을 우선 정렬 (클라이언트 사이드에서 추가 정렬)
    const sortedTrips = (trips || []).sort((a, b) => {
      // arrived_at이 있으면 우선 정렬
      if (a.arrived_at && !b.arrived_at) return -1;
      if (!a.arrived_at && b.arrived_at) return 1;
      if (a.arrived_at && b.arrived_at) {
        return new Date(b.arrived_at).getTime() - new Date(a.arrived_at).getTime();
      }
      // arrived_at이 없으면 created_at 기준
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    console.log("✅ 완료된 Trip 목록 조회 완료:", { count: sortedTrips.length });
    console.groupEnd();

    return {
      success: true,
      data: sortedTrips,
    };
  } catch (error) {
    console.error("❌ getMyCompletedTrips 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

/**
 * 내 Trip 목록 조회 (테스트 카드 포함)
 * 
 * 마이페이지 캘린더 이력에서 사용. 테스트 카드도 포함하여 표시.
 * 
 * @param status - 상태 필터링 (선택사항)
 * @returns Trip 목록 (테스트 카드 포함)
 */
export async function getMyTripsIncludingTest(status?: string) {
  try {
    console.group("🚗 [Trip 목록 조회 (테스트 포함)] 시작");
    
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

    // 3. Trip 목록 조회 (테스트 카드 포함)
    let query = supabase
      .from("trips")
      .select("*")
      .eq("provider_profile_id", profile.id)
      // is_test 필터 없음: 테스트 카드도 포함
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
    console.error("❌ getMyTripsIncludingTest 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

/**
 * 내 Trip 목록 조회
 * 
 * 제공하기 화면 및 일반 목록에서 사용. 테스트 카드는 제외.
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
      .eq("is_test", false)  // 테스트 카드 제외 (제공하기 화면용)
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

    // 4. 출발 시간 지난 Trip 자동 EXPIRED 처리
    const openOrLockedTrips = (trips || []).filter(
      (trip) => trip.status === "OPEN" || trip.status === "LOCKED"
    );
    const tripIds = openOrLockedTrips.map((trip) => trip.id);
    
    if (tripIds.length > 0) {
      console.log("⏰ 만료 처리 대상 Trip:", { count: tripIds.length });
      const expiredTripIds = await expireTripsIfPast(tripIds, supabase);
      
      // 만료된 Trip의 상태를 업데이트
      for (const trip of trips || []) {
        if (expiredTripIds.includes(trip.id)) {
          trip.status = "EXPIRED";
        }
      }
      
      if (expiredTripIds.length > 0) {
        console.log("✅ 만료 처리 완료:", { count: expiredTripIds.length });
      }
    }

    // 5. 출발 30분 전 자동 LOCK 처리
    const now = new Date();
    for (const trip of trips || []) {
      if (!trip.scheduled_start_at || trip.status !== "OPEN") continue;

      const scheduledStart = new Date(trip.scheduled_start_at);
      const lockTime = new Date(scheduledStart.getTime() - 30 * 60 * 1000); // 30분 전

      if (now >= lockTime && trip.status === "OPEN") {
        console.log("🔒 출발 30분 전 도달, 그룹 LOCK 처리:", { tripId: trip.id });

        // 그룹 LOCK
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/528c9e7e-7e59-428c-bfd2-4d73065ea0ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trips.ts:320',message:'Before LOCK update',data:{tripId:trip.id,currentStatus:trip.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        const { error: lockError } = await supabase
          .from("trips")
          .update({
            status: "LOCKED",
            is_locked: true,
          })
          .eq("id", trip.id);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/528c9e7e-7e59-428c-bfd2-4d73065ea0ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trips.ts:328',message:'After LOCK update: error check',data:{hasError:!!lockError,errorMessage:lockError?.message,errorCode:lockError?.code,errorFull:lockError?JSON.stringify(lockError,Object.getOwnPropertyNames(lockError)):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        if (lockError) {
          console.error("❌ 그룹 LOCK 처리 실패:", {
            tripId: trip.id,
            message: lockError.message || "알 수 없는 에러",
            code: lockError.code,
            details: lockError.details,
            hint: lockError.hint,
            errorFull: JSON.stringify(lockError, Object.getOwnPropertyNames(lockError)),
          });
          // 에러가 발생해도 계속 진행
        } else {
          console.log("✅ 그룹 LOCK 처리 완료:", { tripId: trip.id });
          // trip 객체 업데이트
          trip.status = "LOCKED";
          trip.is_locked = true;
        }

        // 남은 PENDING 초대 EXPIRED 처리
        const { error: expireError } = await supabase
          .from("invitations")
          .update({
            status: "EXPIRED",
            responded_at: now.toISOString(),
          })
          .eq("trip_id", trip.id)
          .eq("status", "PENDING");

        if (expireError) {
          console.error("❌ PENDING 초대 EXPIRED 처리 실패:", expireError);
          // 에러가 발생해도 계속 진행
        } else {
          console.log("✅ PENDING 초대 EXPIRED 처리 완료:", { tripId: trip.id });
        }
      }
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

    // 3-1. 만료 처리
    const { expired, trip: updatedTrip } = await expireTripIfPast(tripId, supabase);
    if (expired && updatedTrip) {
      console.log("⏰ Trip 만료 처리 완료:", { tripId: updatedTrip.id, status: updatedTrip.status });
      // 업데이트된 Trip 사용
      trip.status = updatedTrip.status;
    }

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
        pickup_request:pickup_requests!left(
          id,
          pickup_time,
          origin_text,
          origin_lat,
          origin_lng,
          destination_text,
          destination_lat,
          destination_lng,
          status,
          progress_stage
        )
      `
      )
      .eq("trip_id", tripId)
      .order("sequence_order", { ascending: true });

    if (participantsError) {
      // 에러 객체를 개별적으로 로깅
      console.error("❌ 참여자 목록 조회 실패 - 에러 발생");
      console.error("에러 타입:", typeof participantsError);
      console.error("에러 값:", participantsError);
      console.error("에러 코드:", participantsError?.code);
      console.error("에러 메시지:", participantsError?.message);
      console.error("에러 상세:", participantsError?.details);
      console.error("에러 힌트:", participantsError?.hint);
      console.error("에러 키들:", participantsError ? Object.keys(participantsError) : []);
      console.error("Trip ID:", tripId);
      console.error("Profile ID:", profile.id);
      
      // 에러 객체 전체를 JSON으로 직렬화 시도
      try {
        console.error("에러 JSON:", JSON.stringify(participantsError, null, 2));
      } catch (e) {
        console.error("JSON 직렬화 실패:", e);
      }
      
      // 쿼리 결과도 확인
      console.error("참여자 데이터:", participants);
      
      console.groupEnd();
      return {
        success: false,
        error: participantsError?.message || "참여자 목록을 불러오는데 실패했습니다.",
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

    // 3-1. 만료 처리
    const { expired, trip: updatedTrip } = await expireTripIfPast(tripId, supabase);
    if (expired && updatedTrip) {
      console.log("⏰ Trip 만료 처리 완료:", { tripId: updatedTrip.id, status: updatedTrip.status });
      // 업데이트된 Trip 사용
      trip.status = updatedTrip.status;
    }

    // 3-2. EXPIRED 상태 확인
    if (trip.status === "EXPIRED") {
      console.error("❌ Trip이 EXPIRED 상태:", { status: trip.status });
      console.groupEnd();
      return {
        success: false,
        error: "이 그룹은 기간이 만료되어 출발할 수 없습니다.",
      };
    }

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
      console.error("❌ 참여자 조회 실패:", {
        error: participantsError,
        code: participantsError.code,
        message: participantsError.message,
        details: participantsError.details,
        hint: participantsError.hint,
        tripId,
        profileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: participantsError.message || "참여자 정보를 불러오는데 실패했습니다.",
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

    // 7-3. 관련 pickup_requests.status = 'IN_PROGRESS', progress_stage = 'STARTED' 업데이트
    console.log("3️⃣ 픽업 요청 상태 업데이트 중...");
    const pickupRequestIds = participants?.map((p) => p.pickup_request_id) || [];
    const now = new Date().toISOString();
    
    if (pickupRequestIds.length > 0) {
      const { error: updateRequestsError } = await supabase
        .from("pickup_requests")
        .update({
          status: "IN_PROGRESS",
          progress_stage: "STARTED",
          started_at: now,
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

/**
 * 픽업 완료 처리
 * 
 * 제공자가 특정 참여자의 픽업을 완료했음을 표시합니다.
 * progress_stage를 'PICKED_UP'으로 업데이트하고 picked_up_at을 기록합니다.
 * 
 * @param tripId - Trip ID
 * @param pickupRequestId - 픽업 요청 ID
 * @returns 성공/실패 결과 및 에러 메시지
 */
export async function markPickupComplete(
  tripId: string,
  pickupRequestId: string
) {
  try {
    console.group("👋 [픽업 완료 처리] 시작");
    console.log("1️⃣ Trip ID:", tripId);
    console.log("2️⃣ Pickup Request ID:", pickupRequestId);

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

    // 5. Trip이 LOCK 상태인지 확인 (출발한 Trip만 픽업 완료 가능)
    if (!trip.is_locked) {
      console.error("❌ Trip이 아직 출발하지 않음");
      console.groupEnd();
      return {
        success: false,
        error: "출발한 Trip에만 픽업 완료를 표시할 수 있습니다.",
      };
    }
    console.log("✅ Trip LOCK 상태 확인 완료");

    // 6. 참여자 확인 (trip_participants에 존재하는지)
    const { data: participant, error: participantError } = await supabase
      .from("trip_participants")
      .select("id, pickup_request_id")
      .eq("trip_id", tripId)
      .eq("pickup_request_id", pickupRequestId)
      .single();

    if (participantError || !participant) {
      console.error("❌ 참여자 조회 실패:", participantError);
      console.groupEnd();
      return {
        success: false,
        error: "이 픽업 요청은 이 Trip에 포함되지 않았습니다.",
      };
    }
    console.log("✅ 참여자 확인 완료");

    // 7. 픽업 요청 조회 및 progress_stage 확인
    const { data: pickupRequest, error: requestError } = await supabase
      .from("pickup_requests")
      .select("id, progress_stage")
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

    // 8. progress_stage가 'STARTED'인지 확인
    if (pickupRequest.progress_stage !== "STARTED") {
      console.error("❌ 픽업 완료 처리 불가능한 상태:", pickupRequest.progress_stage);
      console.groupEnd();
      return {
        success: false,
        error: "출발한 픽업 요청에만 픽업 완료를 표시할 수 있습니다.",
      };
    }
    console.log("✅ 픽업 요청 상태 확인 완료:", { progressStage: pickupRequest.progress_stage });

    // 9. progress_stage = 'PICKED_UP', picked_up_at 업데이트
    const now = new Date().toISOString();
    console.log("🔄 픽업 요청 progress_stage 업데이트 중...");
    const { error: updateError } = await supabase
      .from("pickup_requests")
      .update({
        progress_stage: "PICKED_UP",
        picked_up_at: now,
      })
      .eq("id", pickupRequestId);

    if (updateError) {
      console.error("❌ 픽업 요청 상태 업데이트 실패:", updateError);
      console.groupEnd();
      return {
        success: false,
        error: "픽업 완료 처리에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ 픽업 요청 상태 업데이트 완료 (PICKED_UP)");

    console.log("✅ 픽업 완료 처리 완료");
    console.groupEnd();

    // 10. 캐시 무효화
    revalidatePath("/trips");
    revalidatePath(`/trips/${tripId}`);
    revalidatePath("/my");

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ markPickupComplete 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

