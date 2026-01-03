"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";

/**
 * 현재 사용자의 profile 정보를 조회하는 훅
 *
 * @file hooks/use-profile.ts
 * @description 현재 로그인한 사용자의 Supabase profile 정보 조회
 *
 * 주요 기능:
 * 1. Clerk 인증 상태 확인
 * 2. Supabase profiles 테이블에서 clerk_user_id로 조회
 * 3. 로딩 상태 및 에러 처리
 *
 * @dependencies
 * - @clerk/nextjs: Clerk 클라이언트 인증
 * - @/lib/supabase/clerk-client: Clerk + Supabase 통합 클라이언트
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { useProfile } from '@/hooks/use-profile';
 *
 * export default function MyComponent() {
 *   const { profile, isLoading, error } = useProfile();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!profile) return <div>No profile found</div>;
 *
 *   return <div>Profile ID: {profile.id}</div>;
 * }
 * ```
 */
export function useProfile() {
  const { isLoaded, userId } = useAuth();
  const supabase = useClerkSupabaseClient();
  const [profile, setProfile] = useState<{
    id: string;
    clerk_user_id: string;
    created_at: string;
    updated_at: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 인증이 로드되지 않았거나, 사용자가 로그인하지 않은 경우
    if (!isLoaded || !userId) {
      setIsLoading(false);
      setProfile(null);
      setError(null);
      return;
    }

    // Profile 조회
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("id, clerk_user_id, created_at, updated_at")
          .eq("clerk_user_id", userId)
          .single();

        if (fetchError) {
          // 404는 profile이 아직 생성되지 않은 경우 (정상)
          if (fetchError.code === "PGRST116") {
            setProfile(null);
            setError(null);
          } else {
            throw new Error(fetchError.message);
          }
        } else {
          setProfile(data);
          // 콘솔에 profile 정보 출력 (TODO.md 40번 항목 확인용)
          console.log('✅ Profile 조회 성공:', data);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isLoaded, userId, supabase]);

  return { profile, isLoading, error };
}

