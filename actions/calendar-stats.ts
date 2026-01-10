/**
 * @file actions/calendar-stats.ts
 * @description 달력 집계 관련 Server Actions (read-only)
 *
 * 주요 기능:
 * 1. 요청자 신청 화면: 매칭 가능한 제공자 수 집계
 * 2. 제공자 신청 화면: 매칭되지 않은 요청자 수 집계
 * 3. 마이페이지 요청자: 내가 생성한 픽업 요청 개수 집계
 * 4. 마이페이지 제공자: 내가 생성한 픽업 그룹 개수 집계
 *
 * 핵심 구현 로직:
 * - 날짜별 GROUP BY 사용 (date_trunc('day', ...))
 * - 매칭 여부 확인 (LEFT JOIN trip_participants)
 * - capacity 초과 여부 확인 (서브쿼리)
 * - 만료된 항목 제외 (EXPIRED 상태 필터링)
 * - 한국 시간대 기준 처리
 *
 * @dependencies
 * - @clerk/nextjs/server: 서버 사이드 Clerk 인증
 * - @/lib/supabase/server: Clerk + Supabase 통합 클라이언트
 */

"use server";

import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * 달력 집계 결과 타입
 */
export interface CalendarStat {
  date: string; // YYYY-MM-DD 형식
  count: number;
  statuses?: string[]; // 마이페이지용: 상태 배열
}

/**
 * 요청자 신청 화면: 매칭 가능한 제공자 수 집계
 *
 * 집계 대상:
 * - trips.status IN ('OPEN', 'LOCKED')
 * - trips.scheduled_start_at이 해당 날짜 범위 내
 * - trips.capacity 초과 여부 확인 (trip_participants 조인)
 * - trips.status != 'EXPIRED' (만료 제외)
 *
 * @param month - YYYY-MM 형식의 월 문자열 (예: "2026-01")
 * @returns 날짜별 매칭 가능한 제공자 수
 */
export async function getCalendarStatsForRequestCreate(
  month: string
): Promise<{ success: boolean; data: CalendarStat[]; error?: string }> {
  try {
    console.group("📊 [요청자 신청 화면 집계] 시작");
    console.log("1️⃣ 월:", month);

    // 1. 인증 확인 (선택사항 - 공개 데이터이므로)
    const { userId } = await auth();
    if (!userId) {
      console.log("⚠️ 인증되지 않은 사용자 (공개 데이터 조회)");
    }

    // 2. Supabase 클라이언트 생성
    const supabase = createClerkSupabaseClient();

    // 3. 월의 시작일과 종료일 계산
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    console.log("📅 날짜 범위:", {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // 4. SQL 쿼리: 날짜별 매칭 가능한 제공자 수 집계
    // 조건:
    // - status IN ('OPEN', 'LOCKED')
    // - status != 'EXPIRED'
    // - scheduled_start_at이 해당 월 범위 내
    // - capacity 초과 여부 확인 (trip_participants 조인)
    const { data, error } = await supabase.rpc("get_available_providers_by_date", {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    });

    if (error) {
      // RPC 함수가 없으면 직접 쿼리 실행
      console.log("⚠️ RPC 함수 없음, 직접 쿼리 실행");

      // 먼저 trips 조회
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("id, scheduled_start_at, status, capacity")
        .in("status", ["OPEN", "LOCKED"])
        .neq("status", "EXPIRED")
        .gte("scheduled_start_at", startDate.toISOString())
        .lte("scheduled_start_at", endDate.toISOString())
        .not("scheduled_start_at", "is", null);

      if (tripsError) {
        console.error("❌ trips 쿼리 실패:", tripsError);
        console.groupEnd();
        return {
          success: false,
          data: [],
          error: "집계 조회에 실패했습니다.",
        };
      }

      if (!trips || trips.length === 0) {
        console.log("✅ 집계 완료: 데이터 없음");
        console.groupEnd();
        return {
          success: true,
          data: [],
        };
      }

      // 각 trip의 participant count 조회 (배치)
      const tripIds = trips.map((t) => t.id);
      const { data: participants, error: participantsError } = await supabase
        .from("trip_participants")
        .select("trip_id")
        .in("trip_id", tripIds);

      if (participantsError) {
        console.error("❌ participants 쿼리 실패:", participantsError);
        console.groupEnd();
        return {
          success: false,
          data: [],
          error: "집계 조회에 실패했습니다.",
        };
      }

      // trip_id별 participant count 계산
      const participantCountMap = new Map<string, number>();
      for (const participant of participants || []) {
        const count = participantCountMap.get(participant.trip_id) || 0;
        participantCountMap.set(participant.trip_id, count + 1);
      }

      // 날짜별 집계 처리
      const statsMap = new Map<string, number>();

      for (const trip of trips) {
        if (!trip.scheduled_start_at) continue;

        const tripDate = new Date(trip.scheduled_start_at);
        const dateKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, "0")}-${String(tripDate.getDate()).padStart(2, "0")}`;

        // capacity 초과 여부 확인
        const participantCount = participantCountMap.get(trip.id) || 0;

        if (participantCount < trip.capacity) {
          const currentCount = statsMap.get(dateKey) || 0;
          statsMap.set(dateKey, currentCount + 1);
        }
      }

      const stats: CalendarStat[] = Array.from(statsMap.entries()).map(
        ([date, count]) => ({
          date,
          count,
        })
      );

      console.log("✅ 집계 완료:", { count: stats.length });
      console.groupEnd();

      return {
        success: true,
        data: stats,
      };
    }

    console.log("✅ 집계 완료:", { count: data?.length || 0 });
    console.groupEnd();

    return {
      success: true,
      data: (data || []).map((item: any) => ({
        date: item.date,
        count: item.count || 0,
      })),
    };
  } catch (error) {
    console.error("❌ getCalendarStatsForRequestCreate 에러:", error);
    return {
      success: false,
      data: [],
      error: "예상치 못한 오류가 발생했습니다.",
    };
  }
}

/**
 * 제공자 신청 화면: 매칭되지 않은 요청자 수 집계
 *
 * 집계 대상:
 * - pickup_requests.status = 'REQUESTED'
 * - pickup_requests.pickup_time이 해당 날짜 범위 내
 * - trip_participants에 없는 요청 (매칭 안 된 것만)
 * - pickup_requests.status != 'EXPIRED' (만료 제외)
 *
 * @param month - YYYY-MM 형식의 월 문자열 (예: "2026-01")
 * @returns 날짜별 매칭되지 않은 요청자 수
 */
export async function getCalendarStatsForProvideCreate(
  month: string
): Promise<{ success: boolean; data: CalendarStat[]; error?: string }> {
  try {
    console.group("📊 [제공자 신청 화면 집계] 시작");
    console.log("1️⃣ 월:", month);

    // 1. 인증 확인 (선택사항)
    const { userId } = await auth();
    if (!userId) {
      console.log("⚠️ 인증되지 않은 사용자 (공개 데이터 조회)");
    }

    // 2. Supabase 클라이언트 생성
    const supabase = createClerkSupabaseClient();

    // 3. 월의 시작일과 종료일 계산
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    console.log("📅 날짜 범위:", {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // 4. SQL 쿼리: 날짜별 매칭되지 않은 요청자 수 집계
    // 조건:
    // - status = 'REQUESTED'
    // - status != 'EXPIRED'
    // - pickup_time이 해당 월 범위 내
    // - trip_participants에 없는 요청 (서브쿼리로 확인)
    const { data: requests, error: queryError } = await supabase
      .from("pickup_requests")
      .select("id, pickup_time, status")
      .eq("status", "REQUESTED")
      .neq("status", "EXPIRED")
      .gte("pickup_time", startDate.toISOString())
      .lte("pickup_time", endDate.toISOString());

    if (queryError) {
      console.error("❌ 쿼리 실패:", queryError);
      console.groupEnd();
      return {
        success: false,
        data: [],
        error: "집계 조회에 실패했습니다.",
      };
    }

    if (!requests || requests.length === 0) {
      console.log("✅ 집계 완료: 데이터 없음");
      console.groupEnd();
      return {
        success: true,
        data: [],
      };
    }

    // 5. 매칭된 요청 ID 조회 (trip_participants에 있는 요청)
    const requestIds = requests.map((r) => r.id);
    const { data: matchedRequests, error: matchedError } = await supabase
      .from("trip_participants")
      .select("pickup_request_id")
      .in("pickup_request_id", requestIds);

    if (matchedError) {
      console.error("❌ 매칭된 요청 조회 실패:", matchedError);
      console.groupEnd();
      return {
        success: false,
        data: [],
        error: "집계 조회에 실패했습니다.",
      };
    }

    // 매칭된 요청 ID 집합 생성
    const matchedRequestIds = new Set(
      (matchedRequests || []).map((p) => p.pickup_request_id)
    );

    // 6. 날짜별 집계 처리 (매칭되지 않은 요청만)
    const statsMap = new Map<string, number>();

    for (const request of requests) {
      if (!request.pickup_time) continue;

      // 매칭된 요청이면 제외
      if (matchedRequestIds.has(request.id)) {
        continue;
      }

      const requestDate = new Date(request.pickup_time);
      const dateKey = `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, "0")}-${String(requestDate.getDate()).padStart(2, "0")}`;

      const currentCount = statsMap.get(dateKey) || 0;
      statsMap.set(dateKey, currentCount + 1);
    }

    const stats: CalendarStat[] = Array.from(statsMap.entries()).map(
      ([date, count]) => ({
        date,
        count,
      })
    );

    console.log("✅ 집계 완료:", { count: stats.length });
    console.groupEnd();

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("❌ getCalendarStatsForProvideCreate 에러:", error);
    return {
      success: false,
      data: [],
      error: "예상치 못한 오류가 발생했습니다.",
    };
  }
}

/**
 * 마이페이지 요청자: 내가 생성한 픽업 요청 개수 집계
 *
 * 집계 대상:
 * - pickup_requests.requester_profile_id = userId
 * - pickup_requests.pickup_time이 해당 날짜 범위 내
 * - 모든 상태 포함 (진행중/완료/만료 구분은 클라이언트에서)
 *
 * @param month - YYYY-MM 형식의 월 문자열 (예: "2026-01")
 * @returns 날짜별 내가 생성한 픽업 요청 개수 및 상태 배열
 */
export async function getMyRequestCalendarStats(
  month: string
): Promise<{ success: boolean; data: CalendarStat[]; error?: string }> {
  try {
    console.group("📊 [마이페이지 요청자 집계] 시작");
    console.log("1️⃣ 월:", month);

    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ 인증되지 않은 사용자");
      console.groupEnd();
      return {
        success: false,
        data: [],
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
        data: [],
        error: "프로필 정보를 찾을 수 없습니다.",
      };
    }
    console.log("✅ Profile 조회 완료:", { profileId: profile.id });

    // 3. 월의 시작일과 종료일 계산
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    console.log("📅 날짜 범위:", {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // 4. SQL 쿼리: 날짜별 내가 생성한 픽업 요청 개수 집계
    const { data: requests, error: queryError } = await supabase
      .from("pickup_requests")
      .select("id, pickup_time, status")
      .eq("requester_profile_id", profile.id)
      .gte("pickup_time", startDate.toISOString())
      .lte("pickup_time", endDate.toISOString());

    if (queryError) {
      console.error("❌ 쿼리 실패:", queryError);
      console.groupEnd();
      return {
        success: false,
        data: [],
        error: "집계 조회에 실패했습니다.",
      };
    }

    // 5. 날짜별 집계 처리
    const statsMap = new Map<
      string,
      { count: number; statuses: Set<string> }
    >();

    for (const request of requests || []) {
      if (!request.pickup_time) continue;

      const requestDate = new Date(request.pickup_time);
      const dateKey = `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, "0")}-${String(requestDate.getDate()).padStart(2, "0")}`;

      const current = statsMap.get(dateKey) || {
        count: 0,
        statuses: new Set<string>(),
      };
      current.count += 1;
      if (request.status) {
        current.statuses.add(request.status);
      }
      statsMap.set(dateKey, current);
    }

    const stats: CalendarStat[] = Array.from(statsMap.entries()).map(
      ([date, { count, statuses }]) => ({
        date,
        count,
        statuses: Array.from(statuses),
      })
    );

    console.log("✅ 집계 완료:", { count: stats.length });
    console.groupEnd();

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("❌ getMyRequestCalendarStats 에러:", error);
    return {
      success: false,
      data: [],
      error: "예상치 못한 오류가 발생했습니다.",
    };
  }
}

/**
 * 마이페이지 제공자: 내가 생성한 픽업 그룹 개수 집계
 *
 * 집계 대상:
 * - trips.provider_profile_id = userId
 * - trips.scheduled_start_at이 해당 날짜 범위 내
 * - 모든 상태 포함
 * - 테스트 카드(is_test=true)도 포함 (마이페이지 캘린더 이력용)
 *
 * 날짜 기준: trips.scheduled_start_at (요청자 시간 무시)
 *
 * @param month - YYYY-MM 형식의 월 문자열 (예: "2026-01")
 * @returns 날짜별 내가 생성한 픽업 그룹 개수 및 상태 배열
 */
export async function getMyProvideCalendarStats(
  month: string
): Promise<{ success: boolean; data: CalendarStat[]; error?: string }> {
  try {
    console.group("📊 [마이페이지 제공자 집계] 시작");
    console.log("1️⃣ 월:", month);

    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ 인증되지 않은 사용자");
      console.groupEnd();
      return {
        success: false,
        data: [],
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
        data: [],
        error: "프로필 정보를 찾을 수 없습니다.",
      };
    }
    console.log("✅ Profile 조회 완료:", { profileId: profile.id });

    // 3. 월의 시작일과 종료일 계산
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    console.log("📅 날짜 범위:", {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // 4. SQL 쿼리: 날짜별 내가 생성한 픽업 그룹 개수 집계
    // 테스트 카드(is_test=true)도 포함하여 마이페이지 캘린더 이력에 표시
    // scheduled_start_at이 NULL인 경우 fallback으로 created_at 사용
    // 모든 trips를 가져온 후 클라이언트 사이드에서 날짜 범위 필터링
    const { data: trips, error: queryError } = await supabase
      .from("trips")
      .select("id, scheduled_start_at, created_at, status, is_test")
      .eq("provider_profile_id", profile.id);
      // is_test 필터 없음: 테스트 카드도 포함
      // 날짜 필터링은 클라이언트 사이드에서 처리 (scheduled_start_at 또는 created_at fallback)

    if (queryError) {
      console.error("❌ 쿼리 실패:", queryError);
      console.groupEnd();
      return {
        success: false,
        data: [],
        error: "집계 조회에 실패했습니다.",
      };
    }

    // 5. 날짜별 집계 처리
    // scheduled_start_at이 NULL인 경우 fallback으로 created_at 사용
    const statsMap = new Map<
      string,
      { count: number; statuses: Set<string> }
    >();

    for (const trip of trips || []) {
      // scheduled_start_at이 있으면 사용, 없으면 created_at을 fallback으로 사용
      const dateToUse = trip.scheduled_start_at || trip.created_at;
      if (!dateToUse) continue;

      const tripDate = new Date(dateToUse);
      
      // 날짜 범위 필터링 (해당 월 내에 있는지 확인)
      if (tripDate < startDate || tripDate > endDate) continue;

      const dateKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, "0")}-${String(tripDate.getDate()).padStart(2, "0")}`;

      const current = statsMap.get(dateKey) || {
        count: 0,
        statuses: new Set<string>(),
      };
      current.count += 1;
      if (trip.status) {
        current.statuses.add(trip.status);
      }
      statsMap.set(dateKey, current);
    }

    const stats: CalendarStat[] = Array.from(statsMap.entries()).map(
      ([date, { count, statuses }]) => ({
        date,
        count,
        statuses: Array.from(statuses),
      })
    );

    console.log("✅ 집계 완료:", { count: stats.length });
    console.groupEnd();

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("❌ getMyProvideCalendarStats 에러:", error);
    return {
      success: false,
      data: [],
      error: "예상치 못한 오류가 발생했습니다.",
    };
  }
}
