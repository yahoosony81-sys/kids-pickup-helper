/**
 * @file lib/utils/trip-expiration.ts
 * @description Trip 만료 처리 유틸리티 함수
 *
 * 주요 기능:
 * 1. 출발 예정 시간이 지난 Trip을 자동으로 EXPIRED 상태로 전환
 * 2. EXPIRED 상태의 Trip은 초대/수락/출발이 모두 불가능
 *
 * 핵심 구현 로직:
 * - 출발 예정 시간 + 30분(grace period)이 지났는지 확인
 * - Trip 상태가 OPEN 또는 LOCKED인지 확인
 * - Trip 상태가 IN_PROGRESS, ARRIVED, COMPLETED가 아닌지 확인
 * - 조건 충족 시 status를 EXPIRED로 업데이트
 *
 * @dependencies
 * - @/lib/supabase/server: Supabase 클라이언트 타입
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Trip 만료 처리
 *
 * 출발 예정 시간이 지났는데도 출발하지 않은 Trip을 EXPIRED 상태로 전환합니다.
 *
 * 만료 조건:
 * - now > trip.scheduled_start_at + 30분 (grace period)
 * - trip.status in ('OPEN', 'LOCKED')
 * - trip.status not in ('IN_PROGRESS', 'ARRIVED', 'COMPLETED')
 *
 * @param tripId - Trip ID
 * @param supabase - Supabase 클라이언트
 * @returns 만료 처리 성공 여부 및 업데이트된 Trip 정보
 */
export async function expireTripIfPast(
  tripId: string,
  supabase: SupabaseClient<any>
): Promise<{ expired: boolean; trip: any | null }> {
  try {
    console.group("⏰ [Trip 만료 처리] 시작");
    console.log("1️⃣ Trip ID:", tripId);

    // 1. Trip 조회
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      console.error("❌ Trip 조회 실패:", tripError);
      console.groupEnd();
      return { expired: false, trip: null };
    }

    console.log("✅ Trip 조회 완료:", {
      tripId: trip.id,
      status: trip.status,
      scheduledStartAt: trip.scheduled_start_at,
    });

    // 2. scheduled_start_at이 없으면 만료 처리 불가
    if (!trip.scheduled_start_at) {
      console.log("⚠️ scheduled_start_at이 없음, 만료 처리 건너뜀");
      console.groupEnd();
      return { expired: false, trip };
    }

    // 3. 이미 EXPIRED 상태면 처리 불필요
    if (trip.status === "EXPIRED") {
      console.log("✅ 이미 EXPIRED 상태");
      console.groupEnd();
      return { expired: true, trip };
    }

    // 4. 이미 진행 중이거나 완료된 Trip은 만료 처리 불가
    if (["IN_PROGRESS", "ARRIVED", "COMPLETED"].includes(trip.status)) {
      console.log("✅ 이미 진행 중이거나 완료된 Trip, 만료 처리 건너뜀");
      console.groupEnd();
      return { expired: false, trip };
    }

    // 5. OPEN 또는 LOCKED 상태만 만료 처리 가능
    if (!["OPEN", "LOCKED"].includes(trip.status)) {
      console.log("⚠️ OPEN 또는 LOCKED 상태가 아님, 만료 처리 건너뜀");
      console.groupEnd();
      return { expired: false, trip };
    }

    // 6. 만료 시간 계산 (scheduled_start_at + 30분 grace period)
    const now = new Date();
    const scheduledStart = new Date(trip.scheduled_start_at);
    const expireTime = new Date(scheduledStart.getTime() + 30 * 60 * 1000); // 30분 후

    console.log("📅 시간 비교:", {
      now: now.toISOString(),
      scheduledStart: scheduledStart.toISOString(),
      expireTime: expireTime.toISOString(),
      isPast: now > expireTime,
    });

    // 7. 만료 시간이 지나지 않았으면 만료 처리 불가
    if (now <= expireTime) {
      console.log("✅ 아직 만료 시간이 지나지 않음");
      console.groupEnd();
      return { expired: false, trip };
    }

    // 8. 만료 처리: status를 EXPIRED로 업데이트
    console.log("⏰ 만료 시간 지남, EXPIRED 상태로 전환");
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/528c9e7e-7e59-428c-bfd2-4d73065ea0ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trip-expiration.ts:110',message:'Before update: trip state',data:{tripId,currentStatus:trip.status,scheduledStartAt:trip.scheduled_start_at,tripExists:!!trip},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const { data: updatedTrip, error: updateError } = await supabase
      .from("trips")
      .update({ status: "EXPIRED" })
      .eq("id", tripId)
      .select()
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/528c9e7e-7e59-428c-bfd2-4d73065ea0ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trip-expiration.ts:118',message:'After update: error check',data:{hasError:!!updateError,errorType:updateError?.constructor?.name,errorKeys:updateError?Object.keys(updateError):[],errorString:String(updateError),errorJSON:updateError?JSON.stringify(updateError):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (updateError) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/528c9e7e-7e59-428c-bfd2-4d73065ea0ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trip-expiration.ts:119',message:'Update error details',data:{tripId,errorMessage:updateError.message,errorCode:updateError.code,errorDetails:updateError.details,errorHint:updateError.hint,errorFull:JSON.stringify(updateError,Object.getOwnPropertyNames(updateError))},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // 에러 메시지가 enum 관련이면 명확한 안내 메시지 표시
      const isEnumError = updateError.message?.includes('enum') || updateError.code === '22P02';
      const errorMessage = isEnumError 
        ? `데이터베이스에 EXPIRED 상태가 없습니다. 마이그레이션을 적용해주세요: ${updateError.message}`
        : updateError.message || "알 수 없는 에러";
      
      console.error("❌ Trip 만료 처리 실패:", {
        tripId,
        message: errorMessage,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        errorFull: JSON.stringify(updateError, Object.getOwnPropertyNames(updateError)),
        ...(isEnumError && {
          migrationHint: "Supabase SQL Editor에서 다음 SQL을 실행하세요: ALTER TYPE trip_status ADD VALUE 'EXPIRED';"
        }),
      });
      console.groupEnd();
      return { expired: false, trip };
    }

    console.log("✅ Trip 만료 처리 완료:", {
      tripId: updatedTrip.id,
      status: updatedTrip.status,
    });
    console.groupEnd();

    return { expired: true, trip: updatedTrip };
  } catch (error) {
    console.error("❌ expireTripIfPast 에러:", error);
    console.groupEnd();
    return { expired: false, trip: null };
  }
}

/**
 * 여러 Trip을 배치로 만료 처리
 *
 * @param tripIds - Trip ID 배열
 * @param supabase - Supabase 클라이언트
 * @returns 만료 처리된 Trip ID 배열
 */
export async function expireTripsIfPast(
  tripIds: string[],
  supabase: SupabaseClient<any>
): Promise<string[]> {
  const expiredTripIds: string[] = [];

  for (const tripId of tripIds) {
    const result = await expireTripIfPast(tripId, supabase);
    if (result.expired) {
      expiredTripIds.push(tripId);
    }
  }

  return expiredTripIds;
}

