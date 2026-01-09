/**
 * @file actions/trip-arrivals.ts
 * @description 도착 사진 업로드 및 조회 관련 Server Actions
 *
 * 주요 기능:
 * 1. 도착 사진 업로드 (uploadArrivalPhoto)
 * 2. Trip별 도착 사진 목록 조회 (getTripArrivals)
 * 3. 요청자용 도착 사진 조회 (getMyArrivalPhotos)
 *
 * 핵심 구현 로직:
 * - Clerk 인증 확인
 * - Profile ID 조회 (clerk_user_id 기준)
 * - Supabase Storage에 파일 업로드
 * - trip_arrivals 테이블에 경로 저장
 * - 상태 전이 처리 (pickup_requests.status = 'COMPLETED', trips.status = 'COMPLETED')
 * - Phase 8 원칙: 도착 인증 시점에 즉시 서비스 완료 처리
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

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "uploads";

/**
 * 도착 사진 업로드
 *
 * 제공자가 각 참여자별로 도착 사진을 업로드합니다.
 * 사진은 클라이언트에서 Supabase Storage에 업로드되고, 경로만 서버로 전달됩니다.
 * trip_arrivals 테이블에 경로가 기록되고, 도착 인증 시점에 서비스 완료 상태(COMPLETED)로 전환됩니다.
 * (Phase 8 원칙: 도착 인증 시점에 즉시 서비스 완료 처리, 리뷰 작성 여부와 무관)
 *
 * @param tripId - Trip ID
 * @param pickupRequestId - 픽업 요청 ID
 * @param photoPath - Supabase Storage에 업로드된 파일 경로
 * @returns 성공/실패 결과 및 에러 메시지
 */
export async function uploadArrivalPhoto(
  tripId: string,
  pickupRequestId: string,
  photoPath: string
) {
  try {
    console.group("📸 [도착 사진 업로드] 시작");
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

    // 4. Trip 소유자 확인 (제공자만 업로드 가능)
    if (trip.provider_profile_id !== providerProfile.id) {
      console.error("❌ Trip 소유자가 아님:", {
        tripProviderId: trip.provider_profile_id,
        currentProfileId: providerProfile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 Trip에 대한 업로드 권한이 없습니다.",
      };
    }
    console.log("✅ Trip 소유자 확인 완료");

    // 5. Trip 상태 확인 (IN_PROGRESS 이상만 가능)
    if (trip.status !== "IN_PROGRESS" && trip.status !== "COMPLETED") {
      console.error("❌ Trip 상태가 업로드 불가능한 상태:", trip.status);
      console.groupEnd();
      return {
        success: false,
        error: "출발한 Trip에만 도착 사진을 업로드할 수 있습니다.",
      };
    }
    console.log("✅ Trip 상태 확인 완료:", { status: trip.status });

    // 6. Trip LOCK 확인
    if (!trip.is_locked) {
      console.error("❌ Trip이 LOCK되지 않음");
      console.groupEnd();
      return {
        success: false,
        error: "출발한 Trip에만 도착 사진을 업로드할 수 있습니다.",
      };
    }
    console.log("✅ Trip LOCK 확인 완료");

    // 7. 참여자 확인 (trip_participants에 존재하는지)
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

    // 8. 중복 업로드 방지 (이미 trip_arrivals에 레코드가 있는지 확인)
    const { data: existingArrival, error: existingError } = await supabase
      .from("trip_arrivals")
      .select("id")
      .eq("trip_id", tripId)
      .eq("pickup_request_id", pickupRequestId)
      .single();

    if (existingArrival) {
      console.error("❌ 이미 도착 사진이 업로드됨");
      console.groupEnd();
      return {
        success: false,
        error: "이 참여자의 도착 사진이 이미 업로드되었습니다.",
      };
    }
    console.log("✅ 중복 업로드 확인 완료 (없음)");

    // 9. 파일 경로 검증
    if (!photoPath || !photoPath.trim()) {
      console.error("❌ 파일 경로가 없음");
      console.groupEnd();
      return {
        success: false,
        error: "파일 경로가 제공되지 않았습니다.",
      };
    }

    // 경로 형식 검증 (trips/{tripId}/arrivals/{pickupRequestId}/... 형식)
    const expectedPathPrefix = `trips/${tripId}/arrivals/${pickupRequestId}/`;
    if (!photoPath.startsWith(expectedPathPrefix)) {
      console.error("❌ 잘못된 파일 경로 형식:", photoPath);
      console.groupEnd();
      return {
        success: false,
        error: "잘못된 파일 경로입니다.",
      };
    }
    console.log("✅ 파일 경로 검증 완료:", photoPath);

    // 10. trip_arrivals 테이블에 INSERT
    console.log("💾 trip_arrivals 테이블에 INSERT 중...");
    const { data: arrivalData, error: insertError } = await supabase
      .from("trip_arrivals")
      .insert({
        trip_id: tripId,
        pickup_request_id: pickupRequestId,
        photo_path: photoPath,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ trip_arrivals INSERT 실패:", insertError);
      // 업로드된 파일 삭제 시도
      await supabase.storage.from(STORAGE_BUCKET).remove([photoPath]);
      console.groupEnd();
      return {
        success: false,
        error: `도착 사진 정보 저장에 실패했습니다: ${insertError.message}`,
      };
    }
    console.log("✅ trip_arrivals INSERT 완료:", arrivalData.id);

    // 11. 관련 pickup_requests.status = 'COMPLETED', progress_stage = 'ARRIVED' 업데이트 (Phase 8 원칙: 도착 인증 시점에 서비스 완료)
    console.log("🔄 pickup_requests 상태 업데이트 중...");
    const now = new Date().toISOString();
    const { error: updateRequestError } = await supabase
      .from("pickup_requests")
      .update({
        status: "COMPLETED",
        progress_stage: "ARRIVED",
      })
      .eq("id", pickupRequestId);

    if (updateRequestError) {
      console.error("❌ pickup_requests 상태 업데이트 실패:", updateRequestError);
      console.groupEnd();
      return {
        success: false,
        error: "픽업 요청 상태 업데이트에 실패했습니다.",
      };
    }
    console.log("✅ pickup_requests 상태 업데이트 완료 (COMPLETED, ARRIVED)");

    // 12. 모든 참여자 도착 확인
    console.log("📊 모든 참여자 도착 확인 중...");
    const { data: allParticipants, error: participantsCountError } = await supabase
      .from("trip_participants")
      .select("id")
      .eq("trip_id", tripId);

    const { data: allArrivals, error: arrivalsCountError } = await supabase
      .from("trip_arrivals")
      .select("id")
      .eq("trip_id", tripId);

    if (participantsCountError || arrivalsCountError) {
      console.error("❌ 참여자/도착 사진 수 조회 실패");
      console.groupEnd();
      // 에러가 나도 현재 업로드는 성공했으므로 계속 진행
    } else {
      const participantCount = allParticipants?.length || 0;
      const arrivalCount = allArrivals?.length || 0;
      console.log("📊 참여자 수:", participantCount, "도착 사진 수:", arrivalCount);

      // 13. 모든 참여자 도착 시 trips.status = 'COMPLETED', trips.arrived_at 업데이트 (Phase 8 원칙: 도착 인증 시점에 서비스 완료)
      if (participantCount > 0 && arrivalCount >= participantCount) {
        console.log("🎉 모든 참여자가 도착했습니다!");
        const { error: updateTripError } = await supabase
          .from("trips")
          .update({
            status: "COMPLETED",
            arrived_at: new Date().toISOString(),
          })
          .eq("id", tripId);

        if (updateTripError) {
          console.error("❌ Trip 상태 업데이트 실패:", updateTripError);
          // 에러가 나도 현재 업로드는 성공했으므로 계속 진행
        } else {
          console.log("✅ Trip 상태 업데이트 완료 (COMPLETED)");
        }
      }
    }

    console.log("✅ 도착 사진 업로드 완료");
    console.groupEnd();

    // 14. 캐시 무효화
    revalidatePath("/trips");
    revalidatePath(`/trips/${tripId}`);
    revalidatePath(`/pickup-requests`);

    return {
      success: true,
      data: {
        arrivalId: arrivalData.id,
        photoPath: photoPath,
      },
    };
  } catch (error) {
    console.error("❌ uploadArrivalPhoto 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
    };
  }
}

/**
 * Trip별 도착 사진 목록 조회
 *
 * 특정 Trip의 도착 사진 목록을 조회합니다.
 * 제공자 또는 참여자만 조회할 수 있습니다.
 *
 * @param tripId - Trip ID
 * @returns 성공/실패 결과 및 도착 사진 목록
 */
export async function getTripArrivals(tripId: string) {
  try {
    console.group("📸 [Trip 도착 사진 목록 조회] 시작");
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
        data: [],
      };
    }
    console.log("✅ Trip 조회 완료:", { tripId: trip.id });

    // 4. 권한 확인 (제공자 또는 참여자만 조회 가능)
    const isProvider = trip.provider_profile_id === profile.id;

    // 참여자 확인
    const { data: participant, error: participantError } = await supabase
      .from("trip_participants")
      .select("id")
      .eq("trip_id", tripId)
      .eq("requester_profile_id", profile.id)
      .single();

    const isParticipant = !!participant;

    if (!isProvider && !isParticipant) {
      console.error("❌ 권한 없음:", {
        isProvider,
        isParticipant,
        tripProviderId: trip.provider_profile_id,
        currentProfileId: profile.id,
      });
      console.groupEnd();
      return {
        success: false,
        error: "이 Trip에 대한 조회 권한이 없습니다.",
        data: [],
      };
    }
    console.log("✅ 권한 확인 완료:", { isProvider, isParticipant });

    // 5. trip_arrivals 조회 (픽업 요청 정보 JOIN)
    const { data: arrivals, error: arrivalsError } = await supabase
      .from("trip_arrivals")
      .select(
        `
        id,
        trip_id,
        pickup_request_id,
        photo_path,
        created_at,
        pickup_request:pickup_requests!inner(
          id,
          pickup_time,
          origin_text,
          destination_text,
          status,
          requester_profile_id
        )
      `
      )
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (arrivalsError) {
      console.error("❌ 도착 사진 조회 실패:", arrivalsError);
      console.groupEnd();
      return {
        success: false,
        error: "도착 사진 목록을 불러오는데 실패했습니다.",
        data: [],
      };
    }

    // 6. Supabase Storage에서 사진 URL 생성
    const arrivalsWithUrls = await Promise.all(
      (arrivals || []).map(async (arrival) => {
        const { data: urlData } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(arrival.photo_path, 3600); // 1시간 유효

        return {
          ...arrival,
          photoUrl: urlData?.signedUrl || null,
        };
      })
    );

    console.log("✅ 도착 사진 목록 조회 완료:", { count: arrivalsWithUrls.length });
    console.groupEnd();

    return {
      success: true,
      data: arrivalsWithUrls,
    };
  } catch (error) {
    console.error("❌ getTripArrivals 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: [],
    };
  }
}

/**
 * 특정 픽업 요청의 도착 사진 존재 여부 확인
 *
 * @param tripId - Trip ID
 * @param pickupRequestId - 픽업 요청 ID
 * @returns 도착 사진 존재 여부 및 사진 URL
 */
export async function checkArrivalPhoto(
  tripId: string,
  pickupRequestId: string
) {
  try {
    const supabase = createClerkSupabaseClient();

    // trip_arrivals 조회
    const { data: arrival, error: arrivalError } = await supabase
      .from("trip_arrivals")
      .select("id, photo_path")
      .eq("trip_id", tripId)
      .eq("pickup_request_id", pickupRequestId)
      .single();

    if (arrivalError || !arrival) {
      return {
        success: true,
        data: null,
      };
    }

    // Supabase Storage에서 사진 URL 생성
    const { data: urlData } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(arrival.photo_path, 3600); // 1시간 유효

    return {
      success: true,
      data: {
        photoUrl: urlData?.signedUrl || null,
      },
    };
  } catch (error) {
    console.error("❌ checkArrivalPhoto 에러:", error);
    return {
      success: false,
      data: null,
    };
  }
}

/**
 * 요청자용 도착 사진 조회
 *
 * 요청자가 자신의 픽업 요청에 대한 도착 사진을 조회합니다.
 *
 * @param pickupRequestId - 픽업 요청 ID
 * @returns 성공/실패 결과 및 도착 사진 정보
 */
export async function getMyArrivalPhotos(pickupRequestId: string) {
  try {
    console.group("📸 [내 도착 사진 조회] 시작");
    console.log("1️⃣ Pickup Request ID:", pickupRequestId);

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

    // 3. 픽업 요청 조회 및 소유자 확인
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
        data: null,
      };
    }

    if (pickupRequest.requester_profile_id !== profile.id) {
      console.error("❌ 픽업 요청 소유자가 아님");
      console.groupEnd();
      return {
        success: false,
        error: "이 픽업 요청에 대한 조회 권한이 없습니다.",
        data: null,
      };
    }
    console.log("✅ 픽업 요청 소유자 확인 완료");

    // 4. 도착 사진 조회
    const { data: arrival, error: arrivalError } = await supabase
      .from("trip_arrivals")
      .select(
        `
        id,
        trip_id,
        pickup_request_id,
        photo_path,
        created_at,
        trip:trips!inner(
          id,
          provider_profile_id,
          status
        )
      `
      )
      .eq("pickup_request_id", pickupRequestId)
      .single();

    if (arrivalError || !arrival) {
      console.log("ℹ️ 도착 사진이 아직 업로드되지 않음");
      console.groupEnd();
      return {
        success: true,
        data: null,
      };
    }

    // 5. Supabase Storage에서 사진 URL 생성
    const { data: urlData } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(arrival.photo_path, 3600); // 1시간 유효

    console.log("✅ 도착 사진 조회 완료");
    console.groupEnd();

    return {
      success: true,
      data: {
        ...arrival,
        photoUrl: urlData?.signedUrl || null,
      },
    };
  } catch (error) {
    console.error("❌ getMyArrivalPhotos 에러:", error);
    return {
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
      data: null,
    };
  }
}

