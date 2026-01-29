/**
 * @file lib/utils/request-expiration.ts
 * @description Pickup Request 만료 처리 유틸리티 함수
 *
 * 주요 기능:
 * 1. 픽업 예정 시간이 지난 Request를 자동으로 EXPIRED 상태로 전환
 * 2. EXPIRED 상태의 Request는 수정/삭제/초대수락 등이 모두 불가능
 *
 * 핵심 구현 로직:
 * - 픽업 예정 시간(pickup_time)이 지났는지 확인
 * - Request 상태가 REQUESTED 또는 MATCHED인지 확인
 * - Request 상태가 IN_PROGRESS, ARRIVED, COMPLETED, CANCELLED가 아닌지 확인
 * - 조건 충족 시 status를 EXPIRED로 업데이트
 *
 * @dependencies
 * - @/lib/supabase/server: Supabase 클라이언트 타입
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Request 만료 처리
 *
 * 픽업 예정 시간이 지난 Request를 EXPIRED 상태로 전환합니다.
 *
 * 만료 조건:
 * - now > request.pickup_time
 * - request.status in ('REQUESTED', 'MATCHED')
 * - request.status not in ('IN_PROGRESS', 'ARRIVED', 'COMPLETED', 'CANCELLED')
 *
 * @param requestId - Request ID
 * @param supabase - Supabase 클라이언트
 * @returns 만료 처리 성공 여부 및 업데이트된 Request 정보
 */
export async function expireRequestIfPast(
  requestId: string,
  supabase: SupabaseClient<any>
): Promise<{ expired: boolean; request: any | null }> {
  try {
    console.group("⏰ [Request 만료 처리] 시작");
    console.log("1️⃣ Request ID:", requestId);

    // 1. Request 조회
    const { data: request, error: requestError } = await supabase
      .from("pickup_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      console.error("❌ Request 조회 실패:", requestError);
      console.groupEnd();
      return { expired: false, request: null };
    }

    console.log("✅ Request 조회 완료:", {
      requestId: request.id,
      status: request.status,
      pickupTime: request.pickup_time,
    });

    // 2. pickup_time이 없으면 만료 처리 불가
    if (!request.pickup_time) {
      console.log("⚠️ pickup_time이 없음, 만료 처리 건너뜀");
      console.groupEnd();
      return { expired: false, request };
    }

    // 3. 이미 EXPIRED 상태면 처리 불필요
    if (request.status === "EXPIRED") {
      console.log("✅ 이미 EXPIRED 상태");
      console.groupEnd();
      return { expired: true, request };
    }

    // 4. 이미 진행 중이거나 완료된 Request는 만료 처리 불가
    if (["IN_PROGRESS", "ARRIVED", "COMPLETED", "CANCELLED"].includes(request.status)) {
      console.log("✅ 이미 진행 중이거나 완료/취소된 Request, 만료 처리 건너뜀");
      console.groupEnd();
      return { expired: false, request };
    }

    // 5. REQUESTED 또는 MATCHED 상태만 만료 처리 가능
    if (!["REQUESTED", "MATCHED"].includes(request.status)) {
      console.log("⚠️ REQUESTED 또는 MATCHED 상태가 아님, 만료 처리 건너뜀");
      console.groupEnd();
      return { expired: false, request };
    }

    // 6. 만료 시간 확인 (pickup_time이 지났는지)
    const now = new Date();
    const pickupTime = new Date(request.pickup_time);

    console.log("📅 시간 비교:", {
      now: now.toISOString(),
      pickupTime: pickupTime.toISOString(),
      isPast: now > pickupTime,
    });

    // 7. 픽업 시간이 지나지 않았으면 만료 처리 불가
    if (now <= pickupTime) {
      console.log("✅ 아직 픽업 시간이 지나지 않음");
      console.groupEnd();
      return { expired: false, request };
    }

    // 8. 만료 처리: status를 EXPIRED로 업데이트
    console.log("⏰ 픽업 시간 지남, EXPIRED 상태로 전환");


    const { data: updatedRequest, error: updateError } = await supabase
      .from("pickup_requests")
      .update({ status: "EXPIRED" })
      .eq("id", requestId)
      .select()
      .single();



    if (updateError) {

      // 에러 메시지가 enum 관련이면 명확한 안내 메시지 표시
      const isEnumError = updateError.message?.includes('enum') || updateError.code === '22P02';
      const errorMessage = isEnumError
        ? `데이터베이스에 EXPIRED 상태가 없습니다. 마이그레이션을 적용해주세요: ${updateError.message}`
        : updateError.message || "알 수 없는 에러";

      console.error("❌ Request 만료 처리 실패:", {
        requestId,
        message: errorMessage,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        errorFull: JSON.stringify(updateError, Object.getOwnPropertyNames(updateError)),
        ...(isEnumError && {
          migrationHint: "Supabase SQL Editor에서 다음 SQL을 실행하세요: ALTER TYPE request_status ADD VALUE 'EXPIRED';"
        }),
      });
      console.groupEnd();
      return { expired: false, request };
    }

    console.log("✅ Request 만료 처리 완료:", {
      requestId: updatedRequest.id,
      status: updatedRequest.status,
    });
    console.groupEnd();

    return { expired: true, request: updatedRequest };
  } catch (error) {
    console.error("❌ expireRequestIfPast 에러:", error);
    console.groupEnd();
    return { expired: false, request: null };
  }
}

/**
 * 여러 Request를 배치로 만료 처리
 *
 * @param requestIds - Request ID 배열
 * @param supabase - Supabase 클라이언트
 * @returns 만료 처리된 Request ID 배열
 */
export async function expireRequestsIfPast(
  requestIds: string[],
  supabase: SupabaseClient<any>
): Promise<string[]> {
  const expiredRequestIds: string[] = [];

  for (const requestId of requestIds) {
    const result = await expireRequestIfPast(requestId, supabase);
    if (result.expired) {
      expiredRequestIds.push(requestId);
    }
  }

  return expiredRequestIds;
}
