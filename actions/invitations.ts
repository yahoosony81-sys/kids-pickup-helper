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
 * - PRD Section 4 규칙 준수: 서버에서 초대 제약 강제 검증
 *   - 요청자는 동시에 PENDING 초대 1개만 허용
 *   - 제공자는 수락된 인원이 3명 미만일 때만 초대 가능
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
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

    // 5. Trip LOCK 상태 확인
    if (trip.is_locked) {
      console.error("❌ Trip이 LOCK됨");
      console.groupEnd();
      return {
        success: false,
        error: "이 Trip은 이미 출발했습니다. 초대를 보낼 수 없습니다.",
      };
    }
    console.log("✅ Trip LOCK 상태 확인 완료 (is_locked = false)");

    // 6. 픽업 요청 조회 및 요청자 Profile ID 확인
    const { data: pickupRequest, error: requestError } = await supabase
      .from("pickup_requests")
      .select("id, requester_profile_id, status")
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

    // 7. 픽업 요청 상태 확인 (REQUESTED만 초대 가능)
    if (pickupRequest.status !== "REQUESTED") {
      console.error("❌ 픽업 요청 상태가 REQUESTED가 아님:", { status: pickupRequest.status });
      console.groupEnd();
      return {
        success: false,
        error: "이 픽업 요청은 이미 처리되었거나 취소되었습니다.",
      };
    }
    console.log("✅ 픽업 요청 상태 확인 완료 (REQUESTED)");

    // 8. 요청자 PENDING 초대 1개 제한 검증
    const { data: existingInvitation, error: invitationCheckError } = await supabase
      .from("invitations")
      .select("id")
      .eq("requester_profile_id", pickupRequest.requester_profile_id)
      .eq("status", "PENDING")
      .maybeSingle();

    if (invitationCheckError) {
      console.error("❌ 초대 조회 실패:", invitationCheckError);
      console.groupEnd();
      return {
        success: false,
        error: "초대 상태를 확인하는데 실패했습니다. 다시 시도해주세요.",
      };
    }

    if (existingInvitation) {
      console.error("❌ 요청자가 이미 PENDING 초대를 보유:", {
        existingInvitationId: existingInvitation.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 요청자는 이미 다른 초대를 대기 중입니다.",
      };
    }
    console.log("✅ 요청자 PENDING 초대 1개 제한 검증 완료");

    // 9. 제공자 capacity 제한 검증 (수락된 인원이 3명 미만인지 확인)
    const { data: participants, error: participantsError } = await supabase
      .from("trip_participants")
      .select("id")
      .eq("trip_id", tripId);

    if (participantsError) {
      console.error("❌ 참여자 조회 실패:", participantsError);
      console.groupEnd();
      return {
        success: false,
        error: "참여자 정보를 확인하는데 실패했습니다. 다시 시도해주세요.",
      };
    }

    const participantCount = participants?.length || 0;
    console.log("📊 현재 참여자 수:", { count: participantCount, capacity: trip.capacity });

    if (participantCount >= trip.capacity) {
      console.error("❌ Trip capacity 초과:", {
        participantCount,
        capacity: trip.capacity,
      });
      console.groupEnd();
      return {
        success: false,
        error: `이 Trip은 이미 최대 인원(${trip.capacity}명)에 도달했습니다.`,
      };
    }
    console.log("✅ 제공자 capacity 제한 검증 완료");

    // 10. 초대 레코드 생성
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24시간 후 만료

    const { data: invitation, error: insertError } = await supabase
      .from("invitations")
      .insert({
        trip_id: tripId,
        pickup_request_id: pickupRequestId,
        provider_profile_id: providerProfile.id,
        requester_profile_id: pickupRequest.requester_profile_id,
        status: "PENDING",
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
      status: invitation.status,
      expiresAt: invitation.expires_at,
    });
    console.groupEnd();

    // 11. 캐시 무효화
    revalidatePath(`/trips/${tripId}/invite`);
    revalidatePath("/trips");

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

    // 5. 만료된 PENDING 초대 자동 EXPIRED 처리
    const now = new Date().toISOString();
    const { data: expiredInvitations, error: expiredCheckError } = await supabase
      .from("invitations")
      .select("id")
      .eq("trip_id", tripId)
      .eq("status", "PENDING")
      .lt("expires_at", now);

    if (expiredCheckError) {
      console.error("❌ 만료된 초대 조회 실패:", expiredCheckError);
      // 에러가 발생해도 계속 진행 (조회만 실패한 경우)
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

    // 6. 초대 목록 조회 (픽업 요청 정보 JOIN)
    let query = supabase
      .from("invitations")
      .select(
        `
        id,
        status,
        expires_at,
        responded_at,
        created_at,
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
 * 특정 초대를 조회합니다. 요청자만 자신의 초대를 조회할 수 있습니다.
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

    // 4. 초대 소유자 확인 (요청자만 접근 가능)
    if (invitation.requester_profile_id !== requesterProfile.id) {
      console.error("❌ 초대 소유자가 아님:", {
        invitationRequesterId: invitation.requester_profile_id,
        currentProfileId: requesterProfile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 초대에 대한 접근 권한이 없습니다.",
        data: null,
      };
    }
    console.log("✅ 초대 소유자 확인 완료");

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

    // 8. Trip capacity 초과 여부 확인
    const { data: participants, error: participantsError } = await supabase
      .from("trip_participants")
      .select("id")
      .eq("trip_id", invitation.trip_id);

    if (participantsError) {
      console.error("❌ 참여자 조회 실패:", participantsError);
      console.groupEnd();
      return {
        success: false,
        error: "참여자 정보를 확인하는데 실패했습니다. 다시 시도해주세요.",
      };
    }

    const participantCount = participants?.length || 0;
    console.log("📊 현재 참여자 수:", { count: participantCount, capacity: trip.capacity });

    if (participantCount >= trip.capacity) {
      console.error("❌ Trip capacity 초과:", {
        participantCount,
        capacity: trip.capacity,
      });
      console.groupEnd();
      return {
        success: false,
        error: `이 Trip은 이미 최대 인원(${trip.capacity}명)에 도달했습니다.`,
      };
    }
    console.log("✅ Trip capacity 확인 완료");

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
    // sequence_order는 현재 참여자 수 + 1로 설정
    const { error: insertParticipantError } = await supabase
      .from("trip_participants")
      .insert({
        trip_id: invitation.trip_id,
        pickup_request_id: invitation.pickup_request_id,
        requester_profile_id: requesterProfile.id,
        sequence_order: participantCount + 1,
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

    console.log("✅ 초대 수락 완료:", {
      invitationId: invitation.id,
      tripId: invitation.trip_id,
      pickupRequestId: invitation.pickup_request_id,
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

