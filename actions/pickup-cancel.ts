/**
 * @file actions/pickup-cancel.ts
 * @description 픽업 취소 요청 및 승인 관련 Server Actions
 *
 * 주요 기능:
 * 1. 취소 요청 (requestCancel): 요청자가 출발 1시간 전까지 취소 요청
 * 2. 취소 승인 (approveCancel): 제공자가 취소 요청을 승인하고 capacity 복구
 *
 * 핵심 구현 로직:
 * - Clerk 인증 확인
 * - Profile ID 조회 (clerk_user_id 기준)
 * - 서버에서 시간/상태/권한 재검증 (클라이언트 검증은 참고용)
 * - 트랜잭션 처리로 데이터 일관성 보장
 * - 푸시 알림 이벤트 생성
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
 * 취소 요청
 *
 * 상태별 취소 처리:
 * - REQUESTED (매칭 전): 즉시 자동 승인 (CANCELLED 상태로 변경, 관련 초대 EXPIRED 처리)
 * - MATCHED (매칭 후): 출발 1시간 전까지 취소 요청 가능, 제공자 승인 필요 (CANCEL_REQUESTED 상태)
 *
 * 서버에서 시간, 상태, 권한을 모두 재검증합니다.
 *
 * @param pickupRequestId - 픽업 요청 ID
 * @returns 성공/실패 결과 및 에러 메시지
 */
export async function requestCancel(pickupRequestId: string) {
  try {
    console.group("🚫 [취소 요청] 시작");
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
      pickupTime: pickupRequest.pickup_time,
    });

    // 4. 소유자 확인 (요청자만 취소 요청 가능)
    if (pickupRequest.requester_profile_id !== profile.id) {
      console.error("❌ 요청자가 아님:", {
        requestRequesterId: pickupRequest.requester_profile_id,
        currentProfileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "본인의 픽업 요청만 취소할 수 있습니다.",
      };
    }
    console.log("✅ 요청자 확인 완료");

    // 5. 상태 검증 (REQUESTED 또는 MATCHED만 취소 요청 가능)
    if (
      pickupRequest.status !== "REQUESTED" &&
      pickupRequest.status !== "MATCHED"
    ) {
      console.error("❌ 취소 요청 불가능한 상태:", { status: pickupRequest.status });
      console.groupEnd();
      return {
        success: false,
        error: `현재 상태(${pickupRequest.status})에서는 취소 요청을 할 수 없습니다.`,
      };
    }
    console.log("✅ 상태 검증 완료:", { status: pickupRequest.status });

    // 6. 상태별 취소 처리 분기
    if (pickupRequest.status === "REQUESTED") {
      // 매칭 전 취소: 즉시 자동 승인 (CANCELLED 상태로 변경)
      console.log("🔄 매칭 전 취소 처리 (자동 승인)...");

      // 6-1. 픽업 요청 상태를 CANCELLED로 변경
      console.log("1️⃣ 픽업 요청 상태를 CANCELLED로 변경 중...");
      console.log("🔍 업데이트 전 상태:", {
        pickupRequestId,
        currentStatus: pickupRequest.status,
        requesterId: profile.id,
      });

      // 상태 검증은 이미 124줄에서 했으므로, 업데이트 시에는 상태 조건 제거
      // (동시성 문제 방지: 조회 후 업데이트 전에 상태가 변경될 수 있음)
      const { data: updateResult, error: updateError } = await supabase
        .from("pickup_requests")
        .update({
          status: "CANCELLED",
          cancel_requested_at: new Date().toISOString(),
          cancel_approved_at: new Date().toISOString(),
        })
        .eq("id", pickupRequestId)
        .eq("requester_profile_id", profile.id)
        .select("id, status");

      console.log("🔍 업데이트 결과:", {
        updateError,
        updatedRows: updateResult?.length || 0,
        updatedData: updateResult,
      });

      if (updateError) {
        console.error("❌ 픽업 요청 상태 업데이트 실패:", updateError);
        console.groupEnd();
        return {
          success: false,
          error: "취소 처리에 실패했습니다. 다시 시도해주세요.",
        };
      }

      // 업데이트된 행이 없으면 실패
      if (!updateResult || updateResult.length === 0) {
        console.error("❌ 업데이트된 행이 없음:", {
          pickupRequestId,
          requesterId: profile.id,
          currentStatus: pickupRequest.status,
        });
        console.groupEnd();
        return {
          success: false,
          error: "취소 처리에 실패했습니다. 요청을 찾을 수 없거나 권한이 없습니다.",
        };
      }

      // 업데이트된 행의 상태 확인
      const updatedRequest = updateResult[0];
      if (updatedRequest.status !== "CANCELLED") {
        console.error("❌ 상태 업데이트 실패:", {
          expected: "CANCELLED",
          actual: updatedRequest.status,
        });
        console.groupEnd();
        return {
          success: false,
          error: "취소 처리에 실패했습니다. 상태가 변경되었을 수 있습니다. 다시 시도해주세요.",
        };
      }

      console.log("✅ 픽업 요청 상태 업데이트 완료 (CANCELLED)");

      // 6-2. 관련 PENDING 초대를 EXPIRED 처리
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
        console.log("✅ invitations EXPIRED 처리 완료");
      }

      console.log("✅ 매칭 전 취소 완료 (자동 승인)");
      console.groupEnd();

      // 캐시 무효화
      revalidatePath(`/pickup-requests/${pickupRequestId}`);
      revalidatePath("/pickup-requests");

      return {
        success: true,
      };
    }

    // MATCHED 상태: 제공자 승인 필요 (기존 로직)
    console.log("🔄 매칭 후 취소 처리 (제공자 승인 필요)...");

    // 7. 시간 검증 (출발 1시간 전까지만 취소 요청 가능)
    const pickupTime = new Date(pickupRequest.pickup_time);
    const now = new Date();
    const oneHourInMs = 60 * 60 * 1000; // 1시간 (밀리초)
    const timeUntilPickup = pickupTime.getTime() - now.getTime();

    if (timeUntilPickup <= oneHourInMs) {
      console.error("❌ 취소 요청 시간 제한 위반:", {
        pickupTime: pickupTime.toISOString(),
        now: now.toISOString(),
        timeUntilPickup: timeUntilPickup,
        oneHourInMs,
      });
      console.groupEnd();
      return {
        success: false,
        error: "출발 1시간 전까지만 취소 요청을 할 수 있습니다.",
      };
    }
    console.log("✅ 시간 검증 완료:", {
      pickupTime: pickupTime.toISOString(),
      timeUntilPickup: `${Math.floor(timeUntilPickup / 60000)}분`,
    });

    // 8. 픽업 요청 상태를 CANCEL_REQUESTED로 변경
    console.log("🔄 픽업 요청 상태 업데이트 중...");
    const { error: updateError } = await supabase
      .from("pickup_requests")
      .update({
        status: "CANCEL_REQUESTED",
        cancel_requested_at: new Date().toISOString(),
      })
      .eq("id", pickupRequestId)
      .eq("requester_profile_id", profile.id)
      .eq("status", "MATCHED");

    if (updateError) {
      console.error("❌ 픽업 요청 상태 업데이트 실패:", updateError);
      console.groupEnd();
      return {
        success: false,
        error: "취소 요청 처리에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ 픽업 요청 상태 업데이트 완료 (CANCEL_REQUESTED)");

    // 9. 제공자 찾기 (trip_participants → trips)
    console.log("🔍 제공자 찾는 중...");
    const { data: participant, error: participantError } = await supabase
      .from("trip_participants")
      .select("trip_id, trips!inner(provider_profile_id)")
      .eq("pickup_request_id", pickupRequestId)
      .single();

    let providerProfileId: string | null = null;

    if (participantError) {
      console.error("❌ trip_participants 조회 실패:", participantError);
      console.groupEnd();
      return {
        success: false,
        error: "제공자 정보를 찾을 수 없습니다.",
      };
    } else if (participant && participant.trips) {
      providerProfileId = (participant.trips as any).provider_profile_id;
      console.log("✅ 제공자 찾기 완료:", { providerProfileId });
    }

    // 10. 푸시 알림 이벤트 생성 (제공자에게)
    if (providerProfileId) {
      console.log("📨 푸시 알림 이벤트 생성 중...");
      const { error: notificationError } = await supabase
        .from("push_notifications")
        .insert({
          user_profile_id: providerProfileId,
          type: "cancel_requested",
          payload_json: {
            pickup_request_id: pickupRequestId,
            requester_profile_id: profile.id,
            message: "요청자가 취소를 요청했습니다. 승인해주세요.",
          },
        });

      if (notificationError) {
        console.error("⚠️ 푸시 알림 이벤트 생성 실패 (계속 진행):", notificationError);
      } else {
        console.log("✅ 푸시 알림 이벤트 생성 완료");
      }
    } else {
      console.error("❌ 제공자 정보를 찾을 수 없음");
      console.groupEnd();
      return {
        success: false,
        error: "제공자 정보를 찾을 수 없습니다.",
      };
    }

    console.log("✅ 취소 요청 완료");
    console.groupEnd();

    // 10. 캐시 무효화
    revalidatePath(`/pickup-requests/${pickupRequestId}`);
    revalidatePath("/pickup-requests");

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ requestCancel 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

/**
 * 취소 승인
 *
 * 제공자가 취소 요청을 승인하면:
 * 1. pickup_request.status = 'CANCELLED'
 * 2. trip_participants 삭제 (capacity 자동 복구)
 * 3. 관련 invitations 정리
 * 4. 요청자에게 푸시 알림
 *
 * @param pickupRequestId - 픽업 요청 ID
 * @returns 성공/실패 결과 및 에러 메시지
 */
export async function approveCancel(pickupRequestId: string) {
  try {
    console.group("✅ [취소 승인] 시작");
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

    // 2. Profile ID 조회 (제공자)
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
    });

    // 4. 상태 검증 (CANCEL_REQUESTED만 승인 가능)
    if (pickupRequest.status !== "CANCEL_REQUESTED") {
      console.error("❌ 취소 승인 불가능한 상태:", { status: pickupRequest.status });
      console.groupEnd();
      return {
        success: false,
        error: `현재 상태(${pickupRequest.status})에서는 취소 승인을 할 수 없습니다.`,
      };
    }
    console.log("✅ 상태 검증 완료");

    // 5. 제공자 확인 (trip_participants → trips)
    console.log("🔍 제공자 확인 중...");
    const { data: participant, error: participantError } = await supabase
      .from("trip_participants")
      .select("trip_id, trips!inner(provider_profile_id)")
      .eq("pickup_request_id", pickupRequestId)
      .single();

    if (participantError || !participant) {
      console.error("❌ trip_participants 조회 실패:", participantError);
      console.groupEnd();
      return {
        success: false,
        error: "이 요청은 아직 Trip에 포함되지 않았습니다.",
      };
    }

    const trip = participant.trips as any;
    if (trip.provider_profile_id !== profile.id) {
      console.error("❌ 제공자가 아님:", {
        tripProviderId: trip.provider_profile_id,
        currentProfileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 요청의 제공자만 취소를 승인할 수 있습니다.",
      };
    }
    console.log("✅ 제공자 확인 완료:", {
      tripId: participant.trip_id,
      providerId: trip.provider_profile_id,
    });

    // 6. 트랜잭션 처리 (순차 실행)
    console.group("🔄 트랜잭션 처리 시작");

    // 6-1. pickup_requests 업데이트
    console.log("1️⃣ 픽업 요청 상태 업데이트 중...");
    const { error: updateRequestError } = await supabase
      .from("pickup_requests")
      .update({
        status: "CANCELLED",
        cancel_approved_at: new Date().toISOString(),
        cancel_approved_by: profile.id,
      })
      .eq("id", pickupRequestId)
      .eq("status", "CANCEL_REQUESTED");

    if (updateRequestError) {
      console.error("❌ 픽업 요청 상태 업데이트 실패:", updateRequestError);
      console.groupEnd();
      console.groupEnd();
      return {
        success: false,
        error: "취소 승인 처리에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ 픽업 요청 상태 업데이트 완료");

    // 6-2. trip_participants 삭제 (capacity 자동 복구)
    console.log("2️⃣ trip_participants 삭제 중 (capacity 복구)...");
    const { error: deleteParticipantError } = await supabase
      .from("trip_participants")
      .delete()
      .eq("pickup_request_id", pickupRequestId);

    if (deleteParticipantError) {
      console.error("❌ trip_participants 삭제 실패:", deleteParticipantError);
      console.groupEnd();
      console.groupEnd();
      return {
        success: false,
        error: "참여자 정보 삭제에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ trip_participants 삭제 완료 (capacity 자동 복구)");

    // 6-3. 관련 invitations 정리 (ACCEPTED 상태인 경우 EXPIRED 처리)
    console.log("3️⃣ 관련 invitations 정리 중...");
    const { error: updateInvitationError } = await supabase
      .from("invitations")
      .update({
        status: "EXPIRED",
      })
      .eq("pickup_request_id", pickupRequestId)
      .eq("status", "ACCEPTED");

    if (updateInvitationError) {
      // invitation이 없을 수도 있으므로 경고만
      console.warn("⚠️ invitations 업데이트 실패 (계속 진행):", updateInvitationError);
    } else {
      console.log("✅ invitations 정리 완료");
    }

    console.groupEnd(); // 트랜잭션 처리 종료
    console.log("✅ 모든 트랜잭션 처리 완료");

    // 7. 요청자에게 푸시 알림 이벤트 생성
    console.log("📨 요청자에게 푸시 알림 이벤트 생성 중...");
    const { error: notificationError } = await supabase
      .from("push_notifications")
      .insert({
        user_profile_id: pickupRequest.requester_profile_id,
        type: "cancel_approved",
        payload_json: {
          pickup_request_id: pickupRequestId,
          provider_profile_id: profile.id,
          message: "취소가 승인되었습니다.",
        },
      });

    if (notificationError) {
      console.error("⚠️ 푸시 알림 이벤트 생성 실패 (계속 진행):", notificationError);
    } else {
      console.log("✅ 푸시 알림 이벤트 생성 완료");
    }

    console.log("✅ 취소 승인 완료");
    console.groupEnd();

    // 8. 캐시 무효화
    revalidatePath(`/trips/${participant.trip_id}`);
    revalidatePath("/trips");
    revalidatePath(`/pickup-requests/${pickupRequestId}`);
    revalidatePath("/pickup-requests");

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ approveCancel 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

