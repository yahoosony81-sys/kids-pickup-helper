/**
 * @file actions/invitations.ts
 * @description 초대 관련 Server Actions
 *
 * 주요 기능:
 * 1. 초대 전송 (sendInvitation)
 * 2. Trip별 초대 목록 조회 (getTripInvitations)
 * 3. 요청별 초대 목록 조회 (getInvitationsForRequest)
 * 4. 초대 조회 (getInvitationById)
 * 5. 초대 수락 (acceptInvitation)
 * 6. 초대 거절 (rejectInvitation)
 *
 * 핵심 구현 로직:
 * - Clerk 인증 확인
 * - Profile ID 조회 (clerk_user_id 기준)
 * - 초대장 생성 시 status는 반드시 'PENDING'으로 저장 (중요)
 * - 'REQUESTED' 상태는 초대장에서 사용하지 않음 (픽업 요청의 상태만 사용)
 * - PRD Section 4 규칙 준수: 서버에서 초대 제약 강제 검증
 *   - 요청자는 여러 제공자로부터 동시에 여러 PENDING 초대를 받을 수 있음 (2026-01-19 변경)
 *   - 제공자는 동시에 최대 3개의 PENDING 초대만 보낼 수 있음 (2026-01-19 추가)
 *   - 제공자는 수락된 인원이 3명 미만일 때만 초대 가능 (Trip capacity 검증)
 *   - Trip이 is_locked = false인지 확인
 * - 만료된 초대 자동 EXPIRED 처리
 * - Supabase DB 작업 (INSERT, SELECT, UPDATE)
 * - 에러 처리 및 사용자 친화적 메시지
 *
 * @dependencies
 * - @clerk/nextjs/server: 서버 사이드 Clerk 인증
 * - @/lib/supabase/server: Clerk + Supabase 통합 클라이언트
 */

"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSlotKey } from "@/lib/utils/slot";
import { expireTripIfPast } from "@/lib/utils/trip-expiration";

/**
 * 시간 규칙 정리 함수
 * 
 * 출발 1시간 전 시점에 그룹의 PENDING 초대를 자동으로 EXPIRED 처리합니다.
 * 
 * @param tripId - Trip ID
 * @param supabase - Supabase 클라이언트 (선택사항, 없으면 새로 생성)
 */
async function enforceTimeRules(
  tripId: string,
  supabase?: ReturnType<typeof createClerkSupabaseClient>
) {
  const client = supabase || createClerkSupabaseClient();

  const { data: trip, error: tripError } = await client
    .from("trips")
    .select("scheduled_start_at")
    .eq("id", tripId)
    .single();

  if (tripError || !trip?.scheduled_start_at) {
    console.log("⚠️ 시간 규칙 정리: scheduled_start_at 없음 또는 조회 실패");
    return;
  }

  const now = new Date();
  const scheduledStart = new Date(trip.scheduled_start_at);
  const oneHourBefore = new Date(scheduledStart.getTime() - 60 * 60 * 1000); // 1시간 전

  // 출발 1시간 전이면 PENDING 초대를 EXPIRED 처리
  if (now >= oneHourBefore) {
    console.log("⏰ 출발 1시간 전 도달, PENDING 초대 EXPIRED 처리 시작");

    const { data: pendingInvitations, error: pendingError } = await client
      .from("invitations")
      .select("id")
      .eq("trip_id", tripId)
      .eq("status", "PENDING");

    if (pendingError) {
      console.error("❌ PENDING 초대 조회 실패:", pendingError);
      return;
    }

    if (pendingInvitations && pendingInvitations.length > 0) {
      const { error: updateError } = await client
        .from("invitations")
        .update({
          status: "EXPIRED",
          responded_at: now.toISOString(),
        })
        .in(
          "id",
          pendingInvitations.map((inv) => inv.id)
        );

      if (updateError) {
        console.error("❌ PENDING 초대 EXPIRED 처리 실패:", updateError);
      } else {
        console.log("✅ PENDING 초대 EXPIRED 처리 완료:", {
          count: pendingInvitations.length,
        });
      }
    } else {
      console.log("✅ PENDING 초대 없음");
    }
  }
}

/**
 * 초대 전송
 * 
 * 제공자가 요청자에게 초대를 전송합니다.
 * PRD Section 4 규칙에 따라 서버에서 모든 제약을 검증합니다.
 * 
 * @param tripId - 제공자의 Trip ID
 * @param pickupRequestId - 요청자의 픽업 요청 ID
 * @returns 성공/실패 결과 및 에러 메시지
 */
export async function sendInvitation(tripId: string, pickupRequestId: string) {
  try {
    console.group("📨 [초대 전송] 시작");
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

    // 2. Profile ID 조회 (제공자)
    const supabase = createClerkSupabaseClient();
    const { data: providerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !providerProfile) {
      console.error("❌ Profile 조회 실패:", profileError);
      console.groupEnd();
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다. 로그아웃 후 다시 로그인해주세요.",
      };
    }
    console.log("✅ 제공자 Profile 조회 완료:", { profileId: providerProfile.id });

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
    if (trip.provider_profile_id !== providerProfile.id) {
      console.error("❌ Trip 소유자가 아님:", {
        tripProviderId: trip.provider_profile_id,
        currentProfileId: providerProfile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 Trip에 대한 접근 권한이 없습니다.",
      };
    }
    console.log("✅ Trip 소유자 확인 완료");

    // 4-1. 만료 처리
    const { expired, trip: updatedTrip } = await expireTripIfPast(tripId, supabase);
    if (expired && updatedTrip) {
      console.log("⏰ Trip 만료 처리 완료:", { tripId: updatedTrip.id, status: updatedTrip.status });
      // 업데이트된 Trip 사용
      trip.status = updatedTrip.status;
    }

    // 4-2. EXPIRED 상태 확인
    if (trip.status === "EXPIRED") {
      console.error("❌ Trip이 EXPIRED 상태:", { status: trip.status });
      console.groupEnd();
      return {
        success: false,
        error: "이 그룹은 기간이 만료되었습니다.",
      };
    }

    // 5. Trip LOCK 상태 확인 (status = 'LOCKED' 또는 is_locked = true)
    if (trip.status === "LOCKED" || trip.is_locked) {
      console.error("❌ Trip이 LOCK됨:", { status: trip.status, isLocked: trip.is_locked });
      console.groupEnd();
      return {
        success: false,
        error: "이 그룹은 마감되었습니다. 초대를 보낼 수 없습니다.",
      };
    }
    console.log("✅ Trip LOCK 상태 확인 완료 (status = OPEN, is_locked = false)");

    // 5-1. 출발 30분 전 마감 검증
    if (trip.scheduled_start_at) {
      // 중요: new Date()는 내부적으로 UTC milliseconds를 사용
      // DB의 timestamptz도 UTC로 저장되어 있으므로 둘 다 동일한 기준으로 비교
      const now = new Date();
      const scheduledStart = new Date(trip.scheduled_start_at);
      const timeUntilStart = scheduledStart.getTime() - now.getTime(); // 출발까지 남은 시간 (밀리초)
      const thirtyMinutesInMs = 30 * 60 * 1000; // 30분 (밀리초)

      // 로깅용: 한국 시간으로 변환하여 표시 (Intl API 사용)
      const kstFormatter = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const nowKSTStr = kstFormatter.format(now);
      const scheduledStartKSTStr = kstFormatter.format(scheduledStart);
      const minutesRemaining = Math.floor(timeUntilStart / (60 * 1000));

      if (timeUntilStart <= thirtyMinutesInMs) {
        console.error("❌ 출발 30분 전 마감:", {
          nowUTC: now.toISOString(),
          nowKST: nowKSTStr,
          scheduledStartUTC: scheduledStart.toISOString(),
          scheduledStartKST: scheduledStartKSTStr,
          timeUntilStart: `${minutesRemaining}분`,
        });
        console.groupEnd();
        return {
          success: false,
          error: `출발 30분 전부터는 초대를 보낼 수 없습니다. (현재 출발까지 ${minutesRemaining}분 남음)`,
        };
      }
      console.log("✅ 출발 30분 전 마감 검증 완료:", {
        nowUTC: now.toISOString(),
        nowKST: nowKSTStr,
        scheduledStartUTC: scheduledStart.toISOString(),
        scheduledStartKST: scheduledStartKSTStr,
        timeUntilStart: `${minutesRemaining}분`,
      });
    }

    // 6. 픽업 요청 조회 및 요청자 Profile ID 확인
    const { data: pickupRequest, error: requestError } = await supabase
      .from("pickup_requests")
      .select("id, requester_profile_id, status, pickup_time")
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

    // 7. 픽업 요청 만료 처리 및 상태 확인
    const { expireRequestIfPast } = await import("@/lib/utils/request-expiration");
    const { expired: requestExpired, request: updatedRequest } = await expireRequestIfPast(
      pickupRequestId,
      supabase
    );
    if (requestExpired && updatedRequest) {
      console.log("⏰ Request 만료 처리 완료:", {
        requestId: updatedRequest.id,
        status: updatedRequest.status,
      });
      pickupRequest.status = updatedRequest.status;
    }

    // 7-1. EXPIRED 상태 확인
    if (pickupRequest.status === "EXPIRED") {
      console.error("❌ 픽업 요청이 EXPIRED 상태:", { status: pickupRequest.status });
      console.groupEnd();
      return {
        success: false,
        error: "이미 픽업 시간이 지나 비활성화된 요청입니다.",
      };
    }

    // 7-2. 픽업 요청 상태 확인 (픽업 요청의 status가 'REQUESTED'인지 확인)
    // 주의: 이것은 픽업 요청(pickup_request)의 상태입니다.
    // 초대장(invitation)의 status는 항상 'PENDING'으로 시작합니다.
    if (pickupRequest.status !== "REQUESTED") {
      console.error("❌ 픽업 요청 상태가 REQUESTED가 아님:", { status: pickupRequest.status });
      console.groupEnd();
      return {
        success: false,
        error: "이 픽업 요청은 이미 처리되었거나 취소되었습니다.",
      };
    }
    console.log("✅ 픽업 요청 상태 확인 완료 (픽업 요청의 status: REQUESTED)");

    // 7-1. 날짜 불일치 검증: 그룹 날짜와 요청 날짜가 일치하는지 확인
    if (trip.scheduled_start_at && pickupRequest.pickup_time) {
      const tripDate = new Date(trip.scheduled_start_at);
      const requestDate = new Date(pickupRequest.pickup_time);

      // 날짜만 비교 (YYYY-MM-DD)
      const tripDateStr = tripDate.toISOString().split("T")[0];
      const requestDateStr = requestDate.toISOString().split("T")[0];

      if (tripDateStr !== requestDateStr) {
        console.error("❌ 날짜 불일치:", {
          tripDate: tripDateStr,
          requestDate: requestDateStr,
        });
        console.groupEnd();
        return {
          success: false,
          error: "요청 날짜가 그룹 날짜와 달라 초대할 수 없습니다.",
        };
      }
      console.log("✅ 날짜 일치 확인 완료:", {
        tripDate: tripDateStr,
        requestDate: requestDateStr,
      });
    }

    // 8. [규칙 변경] 요청자 PENDING 초대 제한 제거
    // 이전 규칙: 요청자는 동시에 하나의 PENDING 초대만 받을 수 있음
    // 변경 규칙: 요청자는 여러 제공자로부터 초대를 받을 수 있음 (선택권 보장)
    // 따라서 기존의 중복 체크 로직(requester_profile_id 기준)은 삭제하고,
    // 대신 "동일한 픽업 요청(pickup_request_id)에 대해 동일한 제공자(provider_profile_id)가 중복 초대를 보내는 것"만 방지합니다.

    const { data: duplicateCheck, error: duplicateError } = await supabase
      .from("invitations")
      .select("id")
      .eq("pickup_request_id", pickupRequestId)
      .eq("provider_profile_id", providerProfile.id)
      .eq("status", "PENDING")
      .maybeSingle();

    if (duplicateError) {
      console.error("❌ 중복 초대 확인 실패:", duplicateError);
      return { success: false, error: "중복 초대 확인 중 오류가 발생했습니다." };
    }

    if (duplicateCheck) {
      console.error("❌ 이미 동일한 요청에 초대를 보냄");
      return { success: false, error: "이미 이 요청에 초대를 보냈습니다." };
    }
    console.log("✅ 중복 초대 검증 완료 (동일 제공자 중복 없음)");

    // 8-1. [신규 규칙] 제공자 PENDING 초대 3개 제한
    // 제공자가 무분별하게 많은 초대를 보내는 것을 방지하기 위해
    // "현재 대기 중인(PENDING) 초대"의 개수를 3개로 제한합니다.
    const { count: providerPendingCount, error: countError } = await supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("provider_profile_id", providerProfile.id)
      .eq("status", "PENDING");

    if (countError) {
      console.error("❌ 제공자 초대 수 확인 실패:", countError);
      return { success: false, error: "초대 가능 횟수를 확인하는데 실패했습니다." };
    }

    console.log("📊 제공자 현재 PENDING 초대 수:", providerPendingCount);

    if ((providerPendingCount || 0) >= 3) {
      console.error("❌ 제공자 초대 한도 초과 (최대 3개)");
      return {
        success: false,
        error: "동시에 보낼 수 있는 초대(대기 중)는 최대 3개입니다. 기존 초대가 수락되거나 거절될 때까지 기다려주세요."
      };
    }
    console.log("✅ 제공자 초대 한도 검증 완료");

    // 9. 그룹 인원 제한 검증: (PENDING + ACCEPTED) 합계 <= 3 확인
    const { data: activeInvitations, error: activeInvitationsError } = await supabase
      .from("invitations")
      .select("id, status")
      .eq("trip_id", tripId)
      .in("status", ["PENDING", "ACCEPTED"]);

    if (activeInvitationsError) {
      console.error("❌ 활성 초대 조회 실패:", activeInvitationsError);
      console.groupEnd();
      return {
        success: false,
        error: "초대 상태를 확인하는데 실패했습니다. 다시 시도해주세요.",
      };
    }

    const activeCount = activeInvitations?.length || 0;
    const pendingCount = activeInvitations?.filter((inv) => inv.status === "PENDING").length || 0;
    const acceptedCount = activeInvitations?.filter((inv) => inv.status === "ACCEPTED").length || 0;

    console.log("📊 현재 활성 초대 수:", {
      total: activeCount,
      pending: pendingCount,
      accepted: acceptedCount,
      capacity: trip.capacity,
    });

    if (activeCount >= trip.capacity) {
      console.error("❌ 그룹 인원 초과:", {
        activeCount,
        capacity: trip.capacity,
      });
      console.groupEnd();
      return {
        success: false,
        error: `이 그룹은 이미 최대 인원(${trip.capacity}명)에 도달했습니다.`,
      };
    }
    console.log("✅ 그룹 인원 제한 검증 완료 (PENDING + ACCEPTED < 3)");

    // 10. 초대 레코드 생성
    // 중요: 초대장의 status는 반드시 'PENDING'으로 저장됩니다.
    // 'REQUESTED' 상태는 사용하지 않습니다.
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24시간 후 만료

    console.log("📝 초대 레코드 생성 시작 (status: PENDING):", {
      tripId,
      pickupRequestId,
      requesterProfileId: pickupRequest.requester_profile_id,
      providerProfileId: providerProfile.id,
      status: "PENDING", // 명시적으로 로그에 표시
    });

    const { data: invitation, error: insertError } = await supabase
      .from("invitations")
      .insert({
        trip_id: tripId,
        pickup_request_id: pickupRequestId,
        provider_profile_id: providerProfile.id,
        requester_profile_id: pickupRequest.requester_profile_id,
        status: "PENDING", // 반드시 PENDING으로 저장
        expires_at: expiresAt.toISOString(),
        responded_at: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ 초대 생성 실패:", insertError);

      // DB unique index 위반 시 특별 처리
      if (insertError.code === "23505") {
        // PostgreSQL unique constraint violation
        console.error("❌ DB unique index 위반 (요청자 PENDING 초대 중복)");
        console.groupEnd();
        return {
          success: false,
          error: "이 요청자는 이미 다른 초대를 대기 중입니다.",
        };
      }

      console.groupEnd();
      return {
        success: false,
        error: "초대 전송에 실패했습니다. 다시 시도해주세요.",
      };
    }

    console.log("✅ 초대 생성 완료:", {
      invitationId: invitation.id,
      tripId: invitation.trip_id,
      pickupRequestId: invitation.pickup_request_id,
      requesterProfileId: invitation.requester_profile_id,
      status: invitation.status,
      expiresAt: invitation.expires_at,
    });
    console.log("🔍 생성된 초대 확인: 하나의 초대만 생성되었습니다.");
    console.groupEnd();

    // 11. 캐시 무효화
    revalidatePath(`/trips/${tripId}/invite`);
    revalidatePath("/trips");
    revalidatePath("/my"); // 마이페이지 "내가 제공중인 픽업" 목록 갱신

    return {
      success: true,
      data: invitation,
    };
  } catch (error) {
    console.error("❌ sendInvitation 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

/**
 * Trip별 초대 목록 조회
 * 
 * 특정 Trip에 대해 보낸 초대 목록을 조회합니다.
 * 만료된 PENDING 초대는 자동으로 EXPIRED 처리됩니다.
 * 
 * @param tripId - Trip ID
 * @param status - 초대 상태 필터링 (선택사항)
 * @returns 초대 목록 및 픽업 요청 정보
 */
export async function getTripInvitations(tripId: string, status?: string) {
  try {
    console.group("📋 [초대 목록 조회] 시작");
    console.log("1️⃣ Trip ID:", tripId);
    console.log("2️⃣ 상태 필터:", status || "전체");

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

    // 2. Profile ID 조회 (제공자)
    const supabase = createClerkSupabaseClient();
    const { data: providerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !providerProfile) {
      console.error("❌ Profile 조회 실패:", profileError);
      console.groupEnd();
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다.",
        data: [],
      };
    }
    console.log("✅ 제공자 Profile 조회 완료:", { profileId: providerProfile.id });

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

    // 4. Trip 소유자 확인
    if (trip.provider_profile_id !== providerProfile.id) {
      console.error("❌ Trip 소유자가 아님:", {
        tripProviderId: trip.provider_profile_id,
        currentProfileId: providerProfile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 Trip에 대한 접근 권한이 없습니다.",
        data: [],
      };
    }
    console.log("✅ Trip 소유자 확인 완료");

    // 5. 초대 목록 조회 (픽업 요청 정보 JOIN)
    // 상태 필터가 없으면 PENDING과 ACCEPTED만 조회 (제공자 상세 페이지에서 사용)
    // 상태 필터가 있으면 해당 상태만 조회
    let query = supabase
      .from("invitations")
      .select(
        `
        id,
        status,
        expires_at,
        responded_at,
        created_at,
        pickup_request_id,
        requester_profile_id,
        pickup_request:pickup_requests!inner(
          id,
          pickup_time,
          origin_text,
          destination_text,
          status
        )
      `
      )
      .eq("trip_id", tripId);

    // 상태 필터링 (선택사항)
    if (status) {
      query = query.eq("status", status);
      console.log("📋 상태 필터링 적용:", { status });
    }
    // 상태 필터가 없으면 모든 상태 조회 (초대 페이지에서 사용)

    console.log("🔍 쿼리 실행 전 - trip_id:", tripId);

    // 초대 상태별 정렬 (PENDING → ACCEPTED → REJECTED → EXPIRED)
    // Supabase는 직접적인 enum 정렬이 어려우므로, created_at 기준 내림차순으로 정렬
    query = query.order("created_at", { ascending: false });

    const { data: invitations, error: selectError } = await query;

    if (selectError) {
      console.error("❌ 초대 목록 조회 실패:", selectError);
      console.groupEnd();
      return {
        success: false,
        error: "초대 목록을 불러오는데 실패했습니다.",
        data: [],
      };
    }

    console.log("🔍 초대 목록 조회 결과 (원본):", {
      count: invitations?.length || 0,
      invitations: invitations?.map((inv: any) => ({
        id: inv.id,
        status: inv.status,
        pickup_request_id: inv.pickup_request_id,
        has_pickup_request: !!inv.pickup_request,
      })),
    });

    // 상태별 정렬 (클라이언트 사이드에서 처리)
    const statusOrder: Record<string, number> = {
      PENDING: 1,
      ACCEPTED: 2,
      REJECTED: 3,
      EXPIRED: 4,
    };

    const sortedInvitations = (invitations || []).sort((a, b) => {
      const statusA = statusOrder[a.status] || 99;
      const statusB = statusOrder[b.status] || 99;
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      // 같은 상태면 최신순
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    console.log("✅ 초대 목록 조회 완료:", {
      count: sortedInvitations.length,
      statuses: sortedInvitations.map((inv) => inv.status),
    });
    console.groupEnd();

    return {
      success: true,
      data: sortedInvitations,
    };
  } catch (error) {
    console.error("❌ getTripInvitations 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

/**
 * 요청에 대한 초대 목록 조회
 * 
 * 특정 픽업 요청에 대한 초대 목록을 조회합니다.
 * 요청자만 자신의 요청에 대한 초대를 조회할 수 있습니다.
 * 제공자 프로필 정보(이름, 사진, 한줄소개)를 포함하여 반환합니다.
 * 
 * @param requestId - 픽업 요청 ID
 * @returns 초대 목록 및 제공자 프로필 정보
 */
export async function getInvitationsForRequest(requestId: string) {
  try {
    console.group("📋 [요청 초대 목록 조회] 시작");
    console.log("1️⃣ Request ID:", requestId);

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

    // 2. Profile ID 조회 (요청자)
    const supabase = createClerkSupabaseClient();
    const { data: requesterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !requesterProfile) {
      console.error("❌ Profile 조회 실패:", profileError);
      console.groupEnd();
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다.",
        data: [],
      };
    }
    console.log("✅ 요청자 Profile 조회 완료:", { profileId: requesterProfile.id });

    // 3. 픽업 요청 조회 및 소유자 확인
    const { data: pickupRequest, error: requestError } = await supabase
      .from("pickup_requests")
      .select("id, requester_profile_id")
      .eq("id", requestId)
      .single();

    if (requestError || !pickupRequest) {
      console.error("❌ 픽업 요청 조회 실패:", requestError);
      console.groupEnd();
      return {
        success: false,
        error: "픽업 요청을 찾을 수 없습니다.",
        data: [],
      };
    }

    // 4. 요청자 본인 확인
    if (pickupRequest.requester_profile_id !== requesterProfile.id) {
      console.error("❌ 요청 소유자가 아님:", {
        requestRequesterId: pickupRequest.requester_profile_id,
        currentProfileId: requesterProfile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 요청에 대한 접근 권한이 없습니다.",
        data: [],
      };
    }
    console.log("✅ 요청 소유자 확인 완료");

    // 5. 만료된 PENDING 초대 자동 EXPIRED 처리
    const now = new Date();
    const { error: expireError } = await supabase
      .from("invitations")
      .update({
        status: "EXPIRED",
        responded_at: now.toISOString(),
      })
      .eq("pickup_request_id", requestId)
      .eq("status", "PENDING")
      .lt("expires_at", now.toISOString());

    if (expireError) {
      console.error("❌ 만료된 초대 업데이트 실패:", expireError);
    } else {
      console.log("✅ 만료된 초대 EXPIRED 처리 완료");
    }

    // 6. 초대 목록 조회 (제공자 프로필 정보 포함)
    const { data: invitations, error: selectError } = await supabase
      .from("invitations")
      .select(
        `
        id,
        status,
        expires_at,
        responded_at,
        created_at,
        provider_profile_id,
        provider_profile:profiles!provider_profile_id(
          clerk_user_id
        )
        `
      )
      .eq("pickup_request_id", requestId)
      .eq("requester_profile_id", requesterProfile.id)
      .order("created_at", { ascending: false });

    if (selectError) {
      console.error("❌ 초대 목록 조회 실패:", selectError);
      console.groupEnd();
      return {
        success: false,
        error: "초대 목록을 불러오는데 실패했습니다.",
        data: [],
      };
    }

    console.log("✅ 초대 목록 조회 완료:", {
      count: invitations?.length || 0,
    });

    // 7. 제공자 프로필 정보 조회 (Clerk API)
    const clerk = await clerkClient();
    const invitationsWithProvider = await Promise.all(
      (invitations || []).map(async (invitation: any) => {
        const providerProfile = invitation.provider_profile;
        if (!providerProfile?.clerk_user_id) {
          console.warn("⚠️ 제공자 프로필 정보 없음:", invitation.id);
          return {
            id: invitation.id,
            status: invitation.status,
            provider_profile_id: invitation.provider_profile_id,
            provider: {
              name: "이름 없음",
              imageUrl: null,
              bio: null,
            },
            created_at: invitation.created_at,
            expires_at: invitation.expires_at,
          };
        }

        try {
          const providerUser = await clerk.users.getUser(providerProfile.clerk_user_id);
          const providerInfo = {
            name:
              providerUser.fullName ||
              [providerUser.firstName, providerUser.lastName]
                .filter(Boolean)
                .join(" ") ||
              "이름 없음",
            imageUrl: providerUser.imageUrl,
            bio:
              (providerUser.publicMetadata?.bio as string) ||
              (providerUser.publicMetadata?.introduction as string) ||
              null,
          };

          console.log("✅ 제공자 프로필 조회 완료:", {
            invitationId: invitation.id,
            providerName: providerInfo.name,
          });

          return {
            id: invitation.id,
            status: invitation.status,
            provider_profile_id: invitation.provider_profile_id,
            provider: providerInfo,
            created_at: invitation.created_at,
            expires_at: invitation.expires_at,
          };
        } catch (clerkError) {
          console.error("❌ Clerk 사용자 조회 실패:", clerkError);
          return {
            id: invitation.id,
            status: invitation.status,
            provider_profile_id: invitation.provider_profile_id,
            provider: {
              name: "이름 없음",
              imageUrl: null,
              bio: null,
            },
            created_at: invitation.created_at,
            expires_at: invitation.expires_at,
          };
        }
      })
    );

    // 8. 상태별 정렬 (PENDING 우선)
    const statusOrder: Record<string, number> = {
      PENDING: 1,
      ACCEPTED: 2,
      REJECTED: 3,
      EXPIRED: 4,
    };

    const sortedInvitations = invitationsWithProvider.sort((a, b) => {
      const statusA = statusOrder[a.status] || 99;
      const statusB = statusOrder[b.status] || 99;
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      // 같은 상태면 최신순
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    console.log("✅ 초대 목록 처리 완료:", {
      total: sortedInvitations.length,
      statuses: sortedInvitations.map((inv) => inv.status),
    });
    console.groupEnd();

    return {
      success: true,
      data: sortedInvitations,
    };
  } catch (error) {
    console.error("❌ getInvitationsForRequest 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

/**
 * 초대 조회
 * 
 * 특정 초대를 조회합니다. 요청자 또는 제공자 모두 자신의 초대를 조회할 수 있습니다.
 * 초대 수락 후 정확한 주소/좌표를 포함한 픽업 요청 정보를 반환합니다.
 * 
 * @param invitationId - 초대 ID
 * @returns 초대 정보 및 픽업 요청 정보
 */
export async function getInvitationById(invitationId: string) {
  try {
    console.group("📋 [초대 조회] 시작");
    console.log("1️⃣ Invitation ID:", invitationId);

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
    const { data: requesterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !requesterProfile) {
      console.error("❌ Profile 조회 실패:", profileError);
      console.groupEnd();
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다.",
        data: null,
      };
    }
    console.log("✅ 요청자 Profile 조회 완료:", { profileId: requesterProfile.id });

    // 3. 초대 조회 (픽업 요청 정보 JOIN)
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select(
        `
        id,
        trip_id,
        pickup_request_id,
        provider_profile_id,
        requester_profile_id,
        status,
        expires_at,
        responded_at,
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
        ),
        trip:trips!inner(
          id,
          status,
          is_locked,
          capacity,
          created_at
        )
      `
      )
      .eq("id", invitationId)
      .single();

    if (invitationError || !invitation) {
      console.error("❌ 초대 조회 실패:", invitationError);
      console.groupEnd();
      return {
        success: false,
        error: "초대를 찾을 수 없습니다.",
        data: null,
      };
    }
    console.log("✅ 초대 조회 완료:", {
      invitationId: invitation.id,
      status: invitation.status,
      requesterId: invitation.requester_profile_id,
    });

    // 4. 초대 소유자 확인 (요청자 또는 제공자 모두 접근 가능)
    // 디버깅: 실제 값 확인
    const invitationRequesterId = invitation.requester_profile_id;
    const invitationProviderId = invitation.provider_profile_id;
    const currentProfileId = requesterProfile.id;

    console.log("🔍 소유자 확인 디버깅:", {
      invitationRequesterId,
      invitationProviderId,
      invitationRequesterIdType: typeof invitationRequesterId,
      invitationRequesterIdValue: JSON.stringify(invitationRequesterId),
      invitationProviderIdType: typeof invitationProviderId,
      invitationProviderIdValue: JSON.stringify(invitationProviderId),
      currentProfileId,
      currentProfileIdType: typeof currentProfileId,
      currentProfileIdValue: JSON.stringify(currentProfileId),
      isRequester: invitationRequesterId === currentProfileId,
      isProvider: invitationProviderId === currentProfileId,
    });

    // null/undefined 체크
    if (!invitationRequesterId || !invitationProviderId || !currentProfileId) {
      console.error("❌ 필수 ID 값이 없음:", {
        hasInvitationRequesterId: !!invitationRequesterId,
        hasInvitationProviderId: !!invitationProviderId,
        hasCurrentProfileId: !!currentProfileId,
        invitationRequesterId,
        invitationProviderId,
        currentProfileId,
      });
      console.groupEnd();
      return {
        success: false,
        error: "초대 정보를 불러오는 중 오류가 발생했습니다.",
        data: null,
      };
    }

    // 문자열로 변환하여 비교 (UUID는 문자열이므로)
    const invitationRequesterIdStr = String(invitationRequesterId).trim();
    const invitationProviderIdStr = String(invitationProviderId).trim();
    const profileIdStr = String(currentProfileId).trim();

    // 요청자 또는 제공자 중 하나라도 일치하면 접근 허용
    const isRequester = invitationRequesterIdStr === profileIdStr;
    const isProvider = invitationProviderIdStr === profileIdStr;

    if (!isRequester && !isProvider) {
      console.error("❌ 초대 소유자가 아님:", {
        invitationRequesterId: invitationRequesterIdStr,
        invitationProviderId: invitationProviderIdStr,
        currentProfileId: profileIdStr,
        invitationRequesterIdRaw: invitationRequesterId,
        invitationProviderIdRaw: invitationProviderId,
        currentProfileIdRaw: currentProfileId,
        isRequester,
        isProvider,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 초대에 대한 접근 권한이 없습니다.",
        data: null,
      };
    }
    console.log("✅ 초대 소유자 확인 완료:", {
      role: isRequester ? "requester" : "provider",
    });

    // 5. 만료된 PENDING 초대 자동 EXPIRED 처리
    if (invitation.status === "PENDING") {
      const now = new Date();
      const expiresAt = new Date(invitation.expires_at);
      if (expiresAt < now) {
        console.log("⏰ 만료된 초대 발견, EXPIRED 처리");
        const { error: updateError } = await supabase
          .from("invitations")
          .update({
            status: "EXPIRED",
            responded_at: now.toISOString(),
          })
          .eq("id", invitationId);

        if (updateError) {
          console.error("❌ 만료된 초대 업데이트 실패:", updateError);
        } else {
          console.log("✅ 만료된 초대 EXPIRED 처리 완료");
          invitation.status = "EXPIRED";
          invitation.responded_at = now.toISOString();
        }
      }
    }

    console.log("📋 초대 정보:", {
      status: invitation.status,
      expiresAt: invitation.expires_at,
      respondedAt: invitation.responded_at,
    });
    console.groupEnd();

    return {
      success: true,
      data: invitation,
    };
  } catch (error) {
    console.error("❌ getInvitationById 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: null,
    };
  }
}

/**
 * 초대 수락
 * 
 * 요청자가 초대를 수락하고 Trip에 참여가 확정됩니다.
 * PRD Section 4 규칙에 따라 서버에서 모든 제약을 검증합니다.
 * 
 * 트랜잭션 처리:
 * 1. invitations.status = 'ACCEPTED', responded_at 업데이트
 * 2. trip_participants에 INSERT
 * 3. pickup_requests.status = 'MATCHED' 업데이트
 * 
 * @param invitationId - 초대 ID
 * @returns 성공/실패 결과
 */
export async function acceptInvitation(invitationId: string) {
  try {
    console.group("✅ [초대 수락] 시작");
    console.log("1️⃣ Invitation ID:", invitationId);

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
    const { data: requesterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !requesterProfile) {
      console.error("❌ Profile 조회 실패:", profileError);
      console.groupEnd();
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다. 로그아웃 후 다시 로그인해주세요.",
      };
    }
    console.log("✅ 요청자 Profile 조회 완료:", { profileId: requesterProfile.id });

    // 3. 초대 조회 및 소유자 확인
    let { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select(`
        *,
        pickup_request:pickup_requests!inner(
          id,
          pickup_time,
          status
        )
      `)
      .eq("id", invitationId)
      .single();

    if (invitationError || !invitation) {
      console.error("❌ 초대 조회 실패:", invitationError);
      console.groupEnd();
      return {
        success: false,
        error: "초대를 찾을 수 없습니다.",
      };
    }

    // 3-1. Request 만료 처리 및 EXPIRED 상태 확인
    if (invitation.pickup_request) {
      const { expireRequestIfPast } = await import("@/lib/utils/request-expiration");
      const { expired: requestExpired, request: updatedRequest } = await expireRequestIfPast(
        invitation.pickup_request.id,
        supabase
      );
      if (requestExpired && updatedRequest) {
        console.log("⏰ Request 만료 처리 완료:", {
          requestId: updatedRequest.id,
          status: updatedRequest.status,
        });

        // EXPIRED 상태면 초대 수락 불가
        if (updatedRequest.status === "EXPIRED") {
          console.error("❌ Request가 EXPIRED 상태:", { status: updatedRequest.status });
          console.groupEnd();
          return {
            success: false,
            error: "이미 픽업 시간이 지나 비활성화된 요청입니다.",
          };
        }
      }
    }

    // 3-2. Trip 만료 처리 및 EXPIRED 상태 확인
    const { expired, trip: updatedTrip } = await expireTripIfPast(invitation.trip_id, supabase);
    if (expired && updatedTrip) {
      console.log("⏰ Trip 만료 처리 완료:", { tripId: updatedTrip.id, status: updatedTrip.status });

      // EXPIRED 상태면 초대 수락 불가
      if (updatedTrip.status === "EXPIRED") {
        console.error("❌ Trip이 EXPIRED 상태:", { status: updatedTrip.status });
        console.groupEnd();
        return {
          success: false,
          error: "이 그룹은 기간이 만료되었습니다.",
        };
      }
    }

    // 3-3. 초대 재조회 (최신 상태 확인)
    const { data: updatedInvitation, error: updatedInvitationError } = await supabase
      .from("invitations")
      .select(`
        *,
        pickup_request:pickup_requests!inner(
          id,
          pickup_time,
          status
        )
      `)
      .eq("id", invitationId)
      .single();

    if (updatedInvitationError || !updatedInvitation) {
      console.error("❌ 업데이트된 초대 조회 실패:", updatedInvitationError);
      console.groupEnd();
      return {
        success: false,
        error: "초대를 찾을 수 없습니다.",
      };
    }

    // 3-4. Request EXPIRED 상태 재확인 (시간 규칙 정리 후)
    if (updatedInvitation.pickup_request?.status === "EXPIRED") {
      console.error("❌ Request가 EXPIRED 상태 (시간 규칙 정리 후)");
      console.groupEnd();
      return {
        success: false,
        error: "이미 픽업 시간이 지나 비활성화된 요청입니다.",
      };
    }

    // 3-5. 초대가 EXPIRED로 변경되었으면 실패 처리 (expires_at 기준 만료만 확인)
    if (updatedInvitation.status === "EXPIRED") {
      const expiresAt = new Date(updatedInvitation.expires_at);
      const now = new Date();
      if (expiresAt < now) {
        console.error("❌ 초대가 만료됨 (expires_at 기준)");
        console.groupEnd();
        return {
          success: false,
          error: "이 초대는 만료되었습니다.",
        };
      }
    }

    invitation = updatedInvitation;
    console.log("✅ 초대 조회 완료:", {
      invitationId: invitation.id,
      status: invitation.status,
      requesterId: invitation.requester_profile_id,
    });

    // 4. 초대 소유자 확인
    if (invitation.requester_profile_id !== requesterProfile.id) {
      console.error("❌ 초대 소유자가 아님:", {
        invitationRequesterId: invitation.requester_profile_id,
        currentProfileId: requesterProfile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 초대에 대한 접근 권한이 없습니다.",
      };
    }
    console.log("✅ 초대 소유자 확인 완료");

    // 5. 초대 status = 'PENDING' 확인
    if (invitation.status !== "PENDING") {
      console.error("❌ 초대 상태가 PENDING이 아님:", { status: invitation.status });
      console.groupEnd();
      return {
        success: false,
        error:
          invitation.status === "ACCEPTED"
            ? "이미 수락한 초대입니다."
            : invitation.status === "REJECTED"
              ? "이미 거절한 초대입니다."
              : invitation.status === "EXPIRED"
                ? "만료된 초대입니다."
                : "처리할 수 없는 초대 상태입니다.",
      };
    }
    console.log("✅ 초대 상태 확인 완료 (PENDING)");

    // 6. expires_at 만료 여부 확인
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < now) {
      console.error("❌ 초대 만료됨:", {
        expiresAt: invitation.expires_at,
        now: now.toISOString(),
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 초대는 만료되었습니다.",
      };
    }
    console.log("✅ 초대 만료 여부 확인 완료 (유효함)");

    // 7. Trip 조회 및 is_locked = false 확인
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", invitation.trip_id)
      .single();

    if (tripError || !trip) {
      console.error("❌ Trip 조회 실패:", tripError);
      console.groupEnd();
      return {
        success: false,
        error: "Trip을 찾을 수 없습니다.",
      };
    }
    console.log("✅ Trip 조회 완료:", { tripId: trip.id, isLocked: trip.is_locked });

    if (trip.is_locked) {
      console.error("❌ Trip이 LOCK됨");
      console.groupEnd();
      return {
        success: false,
        error: "이 Trip은 이미 출발했습니다. 초대를 수락할 수 없습니다.",
      };
    }
    console.log("✅ Trip LOCK 상태 확인 완료 (is_locked = false)");

    // 8. 그룹 인원 제한 검증: (PENDING + ACCEPTED) 합계 <= 3 확인
    const { data: activeInvitations, error: activeInvitationsError } = await supabase
      .from("invitations")
      .select("id, status")
      .eq("trip_id", invitation.trip_id)
      .in("status", ["PENDING", "ACCEPTED"]);

    if (activeInvitationsError) {
      console.error("❌ 활성 초대 조회 실패:", activeInvitationsError);
      console.groupEnd();
      return {
        success: false,
        error: "초대 상태를 확인하는데 실패했습니다. 다시 시도해주세요.",
      };
    }

    const activeCount = activeInvitations?.length || 0;
    const pendingCount = activeInvitations?.filter((inv) => inv.status === "PENDING").length || 0;
    const acceptedCount = activeInvitations?.filter((inv) => inv.status === "ACCEPTED").length || 0;

    console.log("📊 현재 활성 초대 수:", {
      total: activeCount,
      pending: pendingCount,
      accepted: acceptedCount,
      capacity: trip.capacity,
    });

    if (activeCount >= trip.capacity) {
      console.error("❌ 그룹 인원 초과:", {
        activeCount,
        capacity: trip.capacity,
      });
      console.groupEnd();
      return {
        success: false,
        error: `이 그룹은 이미 최대 인원(${trip.capacity}명)에 도달했습니다.`,
      };
    }
    console.log("✅ 그룹 인원 제한 검증 완료 (PENDING + ACCEPTED < 3)");

    // 9. 요청자 PENDING 초대 1개 조건 확인 (DB unique index 활용)
    // 이미 invitation이 PENDING이므로, 다른 PENDING 초대가 있는지 확인
    const { data: otherPendingInvitation, error: pendingCheckError } = await supabase
      .from("invitations")
      .select("id")
      .eq("requester_profile_id", requesterProfile.id)
      .eq("status", "PENDING")
      .neq("id", invitationId)
      .maybeSingle();

    if (pendingCheckError) {
      console.error("❌ PENDING 초대 조회 실패:", pendingCheckError);
      console.groupEnd();
      return {
        success: false,
        error: "초대 상태를 확인하는데 실패했습니다. 다시 시도해주세요.",
      };
    }

    if (otherPendingInvitation) {
      console.error("❌ 요청자가 이미 다른 PENDING 초대를 보유:", {
        otherInvitationId: otherPendingInvitation.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이미 다른 초대를 대기 중입니다. 먼저 해당 초대를 처리해주세요.",
      };
    }
    console.log("✅ 요청자 PENDING 초대 1개 조건 확인 완료");

    // 9-1. slot_key 계산 (같은 provider + 같은 slot에서 3명 제한 확인용)
    const pickupRequest = invitation.pickup_request as { id: string; pickup_time: string } | null;
    if (!pickupRequest || !pickupRequest.pickup_time) {
      console.error("❌ 픽업 요청 정보 없음");
      console.groupEnd();
      return {
        success: false,
        error: "픽업 요청 정보를 찾을 수 없습니다.",
      };
    }

    const slotKey = getSlotKey(pickupRequest.pickup_time);
    console.log("📅 Slot Key 계산 완료:", { slotKey, pickupTime: pickupRequest.pickup_time });

    // 9-2. 같은 provider + 같은 slot에서 ACCEPTED가 3명인지 확인
    // 같은 provider의 다른 trip에서 같은 slot의 ACCEPTED 초대 수 확인
    const { data: acceptedInvitations, error: acceptedCheckError } = await supabase
      .from("invitations")
      .select(
        `
        id,
        pickup_request:pickup_requests!inner(
          id,
          pickup_time
        )
      `
      )
      .eq("provider_profile_id", invitation.provider_profile_id)
      .eq("status", "ACCEPTED");

    if (acceptedCheckError) {
      console.error("❌ ACCEPTED 초대 조회 실패:", acceptedCheckError);
      console.groupEnd();
      return {
        success: false,
        error: "초대 상태를 확인하는데 실패했습니다. 다시 시도해주세요.",
      };
    }

    // 같은 slot의 ACCEPTED 초대 수 계산
    const sameSlotAcceptedCount =
      acceptedInvitations?.filter((inv: any) => {
        if (!inv.pickup_request?.pickup_time) return false;
        const invSlotKey = getSlotKey(inv.pickup_request.pickup_time);
        return invSlotKey === slotKey;
      }).length || 0;

    console.log("📊 같은 provider + slot의 ACCEPTED 수:", {
      slotKey,
      acceptedCount: sameSlotAcceptedCount,
      maxCapacity: 3,
    });

    // 3명이면 수락 거절
    if (sameSlotAcceptedCount >= 3) {
      console.error("❌ 같은 slot에서 이미 3명 수락됨:", {
        slotKey,
        acceptedCount: sameSlotAcceptedCount,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 시간대에는 이미 최대 인원(3명)이 수락했습니다.",
      };
    }
    console.log("✅ 같은 slot에서 수락 가능 (현재 ACCEPTED 수 < 3)");

    // 10. 트랜잭션 처리 (순차 실행)
    // 10-1. invitations.status = 'ACCEPTED', responded_at 업데이트
    const { error: updateInvitationError } = await supabase
      .from("invitations")
      .update({
        status: "ACCEPTED",
        responded_at: now.toISOString(),
      })
      .eq("id", invitationId);

    if (updateInvitationError) {
      console.error("❌ 초대 업데이트 실패:", updateInvitationError);
      console.groupEnd();
      return {
        success: false,
        error: "초대 수락 처리에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ 초대 상태 업데이트 완료 (ACCEPTED)");

    // 10-2. trip_participants에 INSERT
    // sequence_order는 현재 ACCEPTED 수로 설정
    const { error: insertParticipantError } = await supabase
      .from("trip_participants")
      .insert({
        trip_id: invitation.trip_id,
        pickup_request_id: invitation.pickup_request_id,
        requester_profile_id: requesterProfile.id,
        sequence_order: acceptedCount + 1,
      });

    if (insertParticipantError) {
      console.error("❌ 참여자 추가 실패:", insertParticipantError);
      // 롤백: 초대 상태를 다시 PENDING으로 되돌림
      await supabase
        .from("invitations")
        .update({
          status: "PENDING",
          responded_at: null,
        })
        .eq("id", invitationId);
      console.error("🔄 롤백: 초대 상태를 PENDING으로 복구");
      console.groupEnd();
      return {
        success: false,
        error: "참여자 추가에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ 참여자 추가 완료");

    // 10-3. pickup_requests.status = 'MATCHED' 업데이트
    const { error: updateRequestError } = await supabase
      .from("pickup_requests")
      .update({
        status: "MATCHED",
      })
      .eq("id", invitation.pickup_request_id);

    if (updateRequestError) {
      console.error("❌ 픽업 요청 업데이트 실패:", updateRequestError);
      // 롤백: 초대 상태와 참여자 삭제
      await supabase
        .from("invitations")
        .update({
          status: "PENDING",
          responded_at: null,
        })
        .eq("id", invitationId);
      await supabase
        .from("trip_participants")
        .delete()
        .eq("trip_id", invitation.trip_id)
        .eq("pickup_request_id", invitation.pickup_request_id);
      console.error("🔄 롤백: 초대 상태와 참여자 정보 복구");
      console.groupEnd();
      return {
        success: false,
        error: "픽업 요청 상태 업데이트에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ 픽업 요청 상태 업데이트 완료 (MATCHED)");

    // 10-4. ACCEPTED 수가 3명이 되면 그룹 LOCK + 나머지 PENDING 초대 EXPIRED 처리
    // 수락 후 다시 ACCEPTED 수 확인
    const { data: updatedAcceptedInvitations, error: updatedAcceptedCheckError } = await supabase
      .from("invitations")
      .select("id")
      .eq("trip_id", invitation.trip_id)
      .eq("status", "ACCEPTED");

    if (!updatedAcceptedCheckError && updatedAcceptedInvitations) {
      const updatedAcceptedCount = updatedAcceptedInvitations.length || 0;

      console.log("📊 업데이트 후 그룹의 ACCEPTED 수:", {
        acceptedCount: updatedAcceptedCount,
        capacity: trip.capacity,
      });

      // 3명이 되면 그룹 LOCK + 나머지 PENDING 초대 EXPIRED 처리
      if (updatedAcceptedCount >= trip.capacity) {
        console.log("🔒 그룹에서 3명 수락 완료, 그룹 LOCK 및 남은 PENDING 초대 EXPIRED 처리");

        // 그룹 LOCK
        const { error: lockError } = await supabase
          .from("trips")
          .update({
            status: "LOCKED",
            is_locked: true,
          })
          .eq("id", invitation.trip_id);

        if (lockError) {
          console.error("❌ 그룹 LOCK 처리 실패:", lockError);
          // 에러가 발생해도 계속 진행 (이미 수락은 완료되었으므로)
        } else {
          console.log("✅ 그룹 LOCK 처리 완료");
        }

        // 같은 그룹의 남은 PENDING 초대 EXPIRED 처리
        const { data: pendingInvitations, error: pendingFetchError } = await supabase
          .from("invitations")
          .select("id")
          .eq("trip_id", invitation.trip_id)
          .eq("status", "PENDING");

        if (!pendingFetchError && pendingInvitations && pendingInvitations.length > 0) {
          const pendingInvitationIds = pendingInvitations.map((inv) => inv.id);

          console.log("📋 EXPIRED 처리할 PENDING 초대:", {
            count: pendingInvitationIds.length,
            ids: pendingInvitationIds,
          });

          const { error: expireError } = await supabase
            .from("invitations")
            .update({
              status: "EXPIRED",
              responded_at: now.toISOString(),
            })
            .in("id", pendingInvitationIds);

          if (expireError) {
            console.error("❌ PENDING 초대 EXPIRED 처리 실패:", expireError);
            // 에러가 발생해도 계속 진행 (이미 수락은 완료되었으므로)
          } else {
            console.log("✅ PENDING 초대 EXPIRED 처리 완료:", {
              count: pendingInvitationIds.length,
            });
          }
        } else {
          console.log("✅ 그룹의 PENDING 초대 없음");
        }
      } else {
        console.log("✅ 그룹의 ACCEPTED 수 < 3, PENDING 초대 유지");
      }
    }

    console.log("✅ 초대 수락 완료:", {
      invitationId: invitation.id,
      tripId: invitation.trip_id,
      pickupRequestId: invitation.pickup_request_id,
      slotKey,
    });
    console.groupEnd();

    // 11. 캐시 무효화
    revalidatePath(`/invitations/${invitationId}`);
    revalidatePath("/pickup-requests");
    revalidatePath("/my");
    revalidatePath(`/trips/${invitation.trip_id}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ acceptInvitation 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

/**
 * 초대 거절
 * 
 * 요청자가 초대를 거절합니다.
 * 
 * @param invitationId - 초대 ID
 * @returns 성공/실패 결과
 */
export async function rejectInvitation(invitationId: string) {
  try {
    console.group("❌ [초대 거절] 시작");
    console.log("1️⃣ Invitation ID:", invitationId);

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
    const { data: requesterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !requesterProfile) {
      console.error("❌ Profile 조회 실패:", profileError);
      console.groupEnd();
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다. 로그아웃 후 다시 로그인해주세요.",
      };
    }
    console.log("✅ 요청자 Profile 조회 완료:", { profileId: requesterProfile.id });

    // 3. 초대 조회 및 소유자 확인
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (invitationError || !invitation) {
      console.error("❌ 초대 조회 실패:", invitationError);
      console.groupEnd();
      return {
        success: false,
        error: "초대를 찾을 수 없습니다.",
      };
    }
    console.log("✅ 초대 조회 완료:", {
      invitationId: invitation.id,
      status: invitation.status,
      requesterId: invitation.requester_profile_id,
    });

    // 4. 초대 소유자 확인
    if (invitation.requester_profile_id !== requesterProfile.id) {
      console.error("❌ 초대 소유자가 아님:", {
        invitationRequesterId: invitation.requester_profile_id,
        currentProfileId: requesterProfile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 초대에 대한 접근 권한이 없습니다.",
      };
    }
    console.log("✅ 초대 소유자 확인 완료");

    // 5. 초대 status = 'PENDING' 확인
    if (invitation.status !== "PENDING") {
      console.error("❌ 초대 상태가 PENDING이 아님:", { status: invitation.status });
      console.groupEnd();
      return {
        success: false,
        error:
          invitation.status === "ACCEPTED"
            ? "이미 수락한 초대입니다."
            : invitation.status === "REJECTED"
              ? "이미 거절한 초대입니다."
              : invitation.status === "EXPIRED"
                ? "만료된 초대입니다."
                : "처리할 수 없는 초대 상태입니다.",
      };
    }
    console.log("✅ 초대 상태 확인 완료 (PENDING)");

    // 6. expires_at 만료 여부 확인 (만료된 초대도 거절 가능)
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < now) {
      console.log("⏰ 초대 만료됨 (만료된 초대도 거절 가능)");
    } else {
      console.log("✅ 초대 만료 여부 확인 완료 (유효함)");
    }

    // 7. invitations.status = 'REJECTED', responded_at 업데이트
    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        status: "REJECTED",
        responded_at: now.toISOString(),
      })
      .eq("id", invitationId);

    if (updateError) {
      console.error("❌ 초대 업데이트 실패:", updateError);
      console.groupEnd();
      return {
        success: false,
        error: "초대 거절 처리에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ 초대 상태 업데이트 완료 (REJECTED)");

    console.log("✅ 초대 거절 완료:", {
      invitationId: invitation.id,
    });
    console.groupEnd();

    // 8. 캐시 무효화
    revalidatePath(`/invitations/${invitationId}`);
    revalidatePath("/pickup-requests");

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ rejectInvitation 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

/**
 * 내가 보낸 초대 목록 조회
 * 
 * 현재 로그인한 제공자가 보낸 초대 목록을 조회합니다.
 * 진행중 초대만 조회 (PENDING, ACCEPTED 상태).
 * 픽업 요청 정보를 JOIN하여 함께 반환합니다.
 * 
 * @returns 초대 목록 및 픽업 요청 정보
 */
export async function getMyInvitations() {
  try {
    console.group("📋 [내가 보낸 초대 목록 조회] 시작");

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

    // 2. Profile ID 조회 (제공자)
    const supabase = createClerkSupabaseClient();
    const { data: providerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !providerProfile) {
      console.error("❌ Profile 조회 실패:", profileError);
      console.groupEnd();
      return {
        success: false,
        error: "프로필 정보를 찾을 수 없습니다.",
        data: [],
      };
    }
    console.log("✅ 제공자 Profile 조회 완료:", { profileId: providerProfile.id });

    // 3. 만료된 PENDING 초대 자동 EXPIRED 처리
    const now = new Date().toISOString();
    const { data: expiredInvitations, error: expiredCheckError } = await supabase
      .from("invitations")
      .select("id")
      .eq("provider_profile_id", providerProfile.id)
      .eq("status", "PENDING")
      .lt("expires_at", now);

    if (expiredCheckError) {
      console.error("❌ 만료된 초대 조회 실패:", expiredCheckError);
      // 에러가 발생해도 계속 진행
    } else if (expiredInvitations && expiredInvitations.length > 0) {
      console.log("⏰ 만료된 초대 발견:", { count: expiredInvitations.length });

      const { error: updateError } = await supabase
        .from("invitations")
        .update({
          status: "EXPIRED",
          responded_at: now,
        })
        .in(
          "id",
          expiredInvitations.map((inv) => inv.id)
        );

      if (updateError) {
        console.error("❌ 만료된 초대 업데이트 실패:", updateError);
        // 에러가 발생해도 계속 진행
      } else {
        console.log("✅ 만료된 초대 EXPIRED 처리 완료:", {
          count: expiredInvitations.length,
        });
      }
    } else {
      console.log("✅ 만료된 초대 없음");
    }

    // 4. 진행중 초대 목록 조회 (PENDING, ACCEPTED, EXPIRED 포함) - trip 정보 JOIN
    const { data: invitations, error: selectError } = await supabase
      .from("invitations")
      .select(
        `
        id,
        status,
        expires_at,
        responded_at,
        created_at,
        trip_id,
        trip:trips!inner(
          id,
          title,
          scheduled_start_at,
          status,
          is_locked
        ),
        pickup_request:pickup_requests!inner(
          id,
          pickup_time,
          origin_text,
          destination_text,
          status
        )
      `
      )
      .eq("provider_profile_id", providerProfile.id)
      .in("status", ["PENDING", "ACCEPTED", "EXPIRED"])
      .order("created_at", { ascending: false });

    if (selectError) {
      console.error("❌ 초대 목록 조회 실패:", selectError);
      console.groupEnd();
      return {
        success: false,
        error: "초대 목록을 불러오는데 실패했습니다.",
        data: [],
      };
    }

    console.log("✅ 초대 목록 조회 완료:", {
      count: invitations?.length || 0,
      statuses: invitations?.map((inv: any) => inv.status) || [],
    });
    console.groupEnd();

    return {
      success: true,
      data: invitations || [],
    };
  } catch (error) {
    console.error("❌ getMyInvitations 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

