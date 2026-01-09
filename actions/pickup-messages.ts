/**
 * @file actions/pickup-messages.ts
 * @description 픽업 메시지 관련 Server Actions
 *
 * 주요 기능:
 * 1. 메시지 조회 (getMessagesByInvite)
 * 2. 메시지 전송 (sendMessageToInvite)
 * 3. 읽지 않은 메시지 개수 조회 (getUnreadCountsForInvites)
 * 4. 메시지 스레드 읽음 처리 (markThreadAsRead)
 *
 * 핵심 구현 로직:
 * - Clerk 인증 확인
 * - Profile ID 조회 (clerk_user_id 기준)
 * - invitation 조회 및 권한 확인 (provider_id 또는 requester_id만 접근 가능)
 * - Supabase DB 작업 (SELECT, INSERT, UPSERT)
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
 * 특정 invitation의 메시지 목록 조회
 * 
 * @param inviteId - Invitation ID (스레드 키)
 * @returns 메시지 목록 (created_at ASC 정렬)
 */
export async function getMessagesByInvite(inviteId: string) {
  try {
    console.group("💬 [메시지 조회] 시작");
    console.log("1️⃣ Invitation ID:", inviteId);

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

    // 3. Invitation 조회 및 권한 확인
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select(
        `
        id,
        provider_profile_id,
        requester_profile_id,
        trip_id,
        pickup_request_id
        `
      )
      .eq("id", inviteId)
      .single();

    if (invitationError || !invitation) {
      console.error("❌ Invitation 조회 실패:", invitationError);
      console.groupEnd();
      return {
        success: false,
        error: "초대를 찾을 수 없습니다.",
        data: [],
      };
    }
    console.log("✅ Invitation 조회 완료:", {
      invitationId: invitation.id,
      providerId: invitation.provider_profile_id,
      requesterId: invitation.requester_profile_id,
    });

    // 4. 권한 확인 (provider_id 또는 requester_id만 접근 가능)
    if (
      invitation.provider_profile_id !== profile.id &&
      invitation.requester_profile_id !== profile.id
    ) {
      console.error("❌ 권한 없음:", {
        invitationProviderId: invitation.provider_profile_id,
        invitationRequesterId: invitation.requester_profile_id,
        currentProfileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 메시지 스레드에 대한 접근 권한이 없습니다.",
        data: [],
      };
    }
    console.log("✅ 권한 확인 완료");

    // 5. 메시지 목록 조회 (created_at ASC 정렬)
    const { data: messages, error: messagesError } = await supabase
      .from("pickup_messages")
      .select("*")
      .eq("invite_id", inviteId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("❌ 메시지 목록 조회 실패:", {
        error: messagesError,
        code: messagesError.code,
        message: messagesError.message,
        details: messagesError.details,
        hint: messagesError.hint,
        inviteId,
        profileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: messagesError.message || "메시지 목록을 불러오는데 실패했습니다.",
        data: [],
      };
    }

    console.log("✅ 메시지 목록 조회 완료:", {
      count: messages?.length || 0,
    });
    console.groupEnd();

    return {
      success: true,
      data: messages || [],
    };
  } catch (error) {
    console.error("❌ getMessagesByInvite 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

/**
 * 특정 invitation에 메시지 전송
 * 
 * @param inviteId - Invitation ID (스레드 키)
 * @param body - 메시지 본문
 * @returns 성공/실패 결과
 */
export async function sendMessageToInvite({
  inviteId,
  body,
}: {
  inviteId: string;
  body: string;
}) {
  try {
    console.group("📤 [메시지 전송] 시작");
    console.log("1️⃣ Invitation ID:", inviteId);
    console.log("2️⃣ 메시지 본문:", body);

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

    // 3. Invitation 조회
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select(
        `
        id,
        provider_profile_id,
        requester_profile_id,
        trip_id,
        pickup_request_id
        `
      )
      .eq("id", inviteId)
      .single();

    if (invitationError || !invitation) {
      console.error("❌ Invitation 조회 실패:", invitationError);
      console.groupEnd();
      return {
        success: false,
        error: "초대를 찾을 수 없습니다.",
      };
    }
    console.log("✅ Invitation 조회 완료:", {
      invitationId: invitation.id,
      providerId: invitation.provider_profile_id,
      requesterId: invitation.requester_profile_id,
      tripId: invitation.trip_id,
      pickupRequestId: invitation.pickup_request_id,
    });

    // 4. 권한 확인 (provider_id 또는 requester_id만 전송 가능)
    if (
      invitation.provider_profile_id !== profile.id &&
      invitation.requester_profile_id !== profile.id
    ) {
      console.error("❌ 권한 없음:", {
        invitationProviderId: invitation.provider_profile_id,
        invitationRequesterId: invitation.requester_profile_id,
        currentProfileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 메시지 스레드에 메시지를 보낼 권한이 없습니다.",
      };
    }
    console.log("✅ 권한 확인 완료");

    // 5. sender_role 결정
    const senderRole =
      invitation.provider_profile_id === profile.id ? "PROVIDER" : "REQUESTER";
    console.log("✅ 발신자 역할 결정:", { senderRole });

    // 6. 메시지 INSERT
    const { data: message, error: insertError } = await supabase
      .from("pickup_messages")
      .insert({
        invite_id: inviteId,
        pickup_group_id: invitation.trip_id,
        pickup_request_id: invitation.pickup_request_id,
        provider_id: invitation.provider_profile_id,
        requester_id: invitation.requester_profile_id,
        sender_id: profile.id,
        sender_role: senderRole,
        body: body.trim(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ 메시지 INSERT 실패:", {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        inviteId,
        profileId: profile.id,
        senderRole,
      });
      console.error("❌ INSERT 시도한 데이터:", {
        invite_id: inviteId,
        pickup_group_id: invitation.trip_id,
        pickup_request_id: invitation.pickup_request_id,
        provider_id: invitation.provider_profile_id,
        requester_id: invitation.requester_profile_id,
        sender_id: profile.id,
        sender_role: senderRole,
        body: body.trim(),
      });
      console.groupEnd();
      return {
        success: false,
        error: insertError.message || "메시지 전송에 실패했습니다. 다시 시도해주세요.",
      };
    }
    console.log("✅ 메시지 INSERT 완료:", { messageId: message.id });

    // 7. 캐시 무효화
    revalidatePath(`/trips/${invitation.trip_id}/messages/${inviteId}`);
    revalidatePath(`/trips/${invitation.trip_id}`);
    // 요청 상세 페이지와 마이페이지도 무효화하여 메시지 알림이 즉시 표시되도록 함
    if (invitation.pickup_request_id) {
      revalidatePath(`/pickup-requests/${invitation.pickup_request_id}`);
    }
    revalidatePath(`/my`);
    // 더 넓은 범위로 무효화하여 확실하게 반영되도록 함
    revalidatePath(`/trips`);

    console.log("✅ 메시지 전송 완료");
    console.groupEnd();

    return {
      success: true,
      data: message,
    };
  } catch (error) {
    console.error("❌ sendMessageToInvite 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
    };
  }
}

/**
 * 여러 invitation에 대한 읽지 않은 메시지 개수 조회
 * 
 * @param inviteIds - Invitation ID 배열
 * @returns inviteId별 unread count 맵 { [inviteId]: number }
 */
export async function getUnreadCountsForInvites(inviteIds: string[]) {
  try {
    console.group("📊 [읽지 않은 메시지 개수 조회] 시작");
    console.log("1️⃣ Invitation IDs:", inviteIds);

    // 빈 배열 처리
    if (!inviteIds || inviteIds.length === 0) {
      console.log("✅ 빈 배열, 빈 객체 반환");
      console.groupEnd();
      return {
        success: true,
        data: {},
      };
    }

    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ 인증되지 않은 사용자");
      console.groupEnd();
      return {
        success: false,
        error: "로그인이 필요합니다.",
        data: {},
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
        data: {},
      };
    }
    console.log("✅ Profile 조회 완료:", { profileId: profile.id });

    // 3. 각 inviteId별 last_read_at 조회
    const { data: reads, error: readsError } = await supabase
      .from("pickup_message_reads")
      .select("invite_id, last_read_at")
      .eq("user_id", profile.id)
      .in("invite_id", inviteIds);

    if (readsError) {
      console.error("❌ 읽음 처리 조회 실패:", readsError);
      console.groupEnd();
      return {
        success: false,
        error: "읽음 처리 정보를 불러오는데 실패했습니다.",
        data: {},
      };
    }

    // 4. last_read_at 맵 생성 (없으면 '1970-01-01'로 간주)
    const lastReadMap = new Map<string, Date>();
    reads?.forEach((read) => {
      lastReadMap.set(read.invite_id, new Date(read.last_read_at));
    });

    // 5. 각 inviteId별로 unread count 계산
    const unreadCounts: { [inviteId: string]: number } = {};

    for (const inviteId of inviteIds) {
      const lastReadAt = lastReadMap.get(inviteId) || new Date("1970-01-01");
      // 시간대 문제를 방지하기 위해 ISO 문자열로 변환
      const lastReadAtISO = lastReadAt.toISOString();

      console.log(`🔍 [${inviteId}] 읽지 않은 메시지 조회:`, {
        lastReadAt: lastReadAtISO,
        profileId: profile.id,
      });

      // 메시지 조회: created_at > last_read_at AND sender_id != currentUserId
      // 1초를 빼서 비교하여 경계 조건 문제를 방지 (밀리초 단위 차이로 인한 누락 방지)
      const lastReadAtForQuery = new Date(lastReadAt.getTime() - 1000).toISOString();
      
      console.log(`🔍 [${inviteId}] 쿼리 조건:`, {
        lastReadAtForQuery,
        profileId: profile.id,
        inviteId,
      });

      // 먼저 모든 메시지를 조회해서 디버깅
      const { data: allMessages, error: allMessagesError } = await supabase
        .from("pickup_messages")
        .select("id, created_at, sender_id")
        .eq("invite_id", inviteId)
        .order("created_at", { ascending: false });

      if (!allMessagesError && allMessages) {
        console.log(`📋 [${inviteId}] 모든 메시지:`, allMessages.map(m => ({
          id: m.id,
          created_at: m.created_at,
          sender_id: m.sender_id,
          isCurrentUser: m.sender_id === profile.id,
          isAfterLastRead: new Date(m.created_at) > new Date(lastReadAtForQuery),
        })));
      }

      const { data: unreadMessages, error: messagesError } = await supabase
        .from("pickup_messages")
        .select("id", { count: "exact", head: false })
        .eq("invite_id", inviteId)
        .gt("created_at", lastReadAtForQuery)
        .neq("sender_id", profile.id);

      if (messagesError) {
        console.error(`❌ inviteId ${inviteId} 메시지 조회 실패:`, messagesError);
        unreadCounts[inviteId] = 0;
      } else {
        const count = unreadMessages?.length || 0;
        console.log(`✅ [${inviteId}] 읽지 않은 메시지 개수:`, count, {
          unreadMessageIds: unreadMessages?.map(m => m.id),
        });
        unreadCounts[inviteId] = count;
      }
    }

    console.log("✅ 읽지 않은 메시지 개수 조회 완료:", unreadCounts);
    console.groupEnd();

    return {
      success: true,
      data: unreadCounts,
    };
  } catch (error) {
    console.error("❌ getUnreadCountsForInvites 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: {},
    };
  }
}

/**
 * 메시지 스레드를 읽음 처리
 * 
 * @param inviteId - Invitation ID (스레드 키)
 * @returns 성공/실패 결과
 */
export async function markThreadAsRead(inviteId: string) {
  try {
    console.group("✅ [메시지 읽음 처리] 시작");
    console.log("1️⃣ Invitation ID:", inviteId);

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

    // 3. Invitation 조회 및 권한 확인
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select(
        `
        id,
        provider_profile_id,
        requester_profile_id,
        trip_id
        `
      )
      .eq("id", inviteId)
      .single();

    if (invitationError || !invitation) {
      console.error("❌ Invitation 조회 실패:", invitationError);
      console.groupEnd();
      return {
        success: false,
        error: "초대를 찾을 수 없습니다.",
      };
    }
    console.log("✅ Invitation 조회 완료:", {
      invitationId: invitation.id,
      providerId: invitation.provider_profile_id,
      requesterId: invitation.requester_profile_id,
    });

    // 4. 권한 확인 (provider_id 또는 requester_id만 읽음 처리 가능)
    if (
      invitation.provider_profile_id !== profile.id &&
      invitation.requester_profile_id !== profile.id
    ) {
      console.error("❌ 권한 없음:", {
        invitationProviderId: invitation.provider_profile_id,
        invitationRequesterId: invitation.requester_profile_id,
        currentProfileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 메시지 스레드에 대한 접근 권한이 없습니다.",
      };
    }
    console.log("✅ 권한 확인 완료");

    // 5. UPSERT: (invite_id, user_id) 기준으로 last_read_at 업데이트
    const { error: upsertError } = await supabase
      .from("pickup_message_reads")
      .upsert(
        {
          invite_id: inviteId,
          user_id: profile.id,
          last_read_at: new Date().toISOString(),
        },
        {
          onConflict: "invite_id,user_id",
        }
      );

    if (upsertError) {
      console.error("❌ 읽음 처리 UPSERT 실패:", {
        error: upsertError,
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
        inviteId,
        profileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: upsertError.message || "읽음 처리에 실패했습니다.",
      };
    }
    console.log("✅ 읽음 처리 UPSERT 완료");

    // 6. 캐시 무효화
    revalidatePath(`/trips/${invitation.trip_id}/messages/${inviteId}`);
    revalidatePath(`/trips/${invitation.trip_id}`);
    // 요청 상세 페이지와 마이페이지도 무효화하여 메시지 알림이 즉시 업데이트되도록 함
    revalidatePath(`/pickup-requests`);
    revalidatePath(`/my`);
    revalidatePath(`/trips`);

    console.log("✅ 메시지 읽음 처리 완료");
    console.groupEnd();

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ markThreadAsRead 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
    };
  }
}

