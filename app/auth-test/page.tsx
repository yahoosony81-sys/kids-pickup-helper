"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { Button } from "@/components/ui/button";
import { LuShield, LuCheck, LuX, LuTriangleAlert } from "react-icons/lu";
import Link from "next/link";

interface ProfileData {
  id: string;
  clerk_user_id: string;
  created_at: string;
  updated_at: string;
}

export default function AuthTestPage() {
  const { user, isLoaded } = useUser();
  const supabase = useClerkSupabaseClient();

  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  // Supabase 연결 테스트
  const testConnection = useCallback(async () => {
    try {
      setConnectionStatus("testing");
      setError(null);

      // profiles 테이블로 연결 테스트
      const { error } = await supabase.from("profiles").select("count");

      if (error) {
        throw new Error(error.message || "연결 실패");
      }

      setConnectionStatus("success");
    } catch (err) {
      setConnectionStatus("error");
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null && 'message' in err
        ? String(err.message)
        : "연결 테스트 실패";
      setError(errorMessage);
      console.error("Connection test error:", err);
    }
  }, [supabase]);

  // Profile 데이터 가져오기
  const fetchProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Profile 조회
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("clerk_user_id", user.id)
        .single();

      if (fetchError) {
        // 404는 profile이 아직 생성되지 않은 경우 (정상)
        if (fetchError.code === "PGRST116") {
          setProfileData(null);
          setError("Profile이 아직 생성되지 않았습니다. /api/sync-user를 통해 동기화하세요.");
        } else {
          throw new Error(fetchError.message || "Profile 조회 실패");
        }
      } else {
        setProfileData(data);
        // 콘솔에 profile 정보 출력 (TODO.md 40번 항목 확인용)
        console.log('✅ Profile 조회 성공:', data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null && 'message' in err
        ? String(err.message)
        : "Profile 데이터 조회 실패";
      setError(errorMessage);
      console.error("Fetch profile error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);


  useEffect(() => {
    if (isLoaded && user) {
      testConnection();
      fetchProfile();
    }
  }, [user, isLoaded, testConnection, fetchProfile]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <LuTriangleAlert className="w-16 h-16 text-yellow-500" />
        <h1 className="text-2xl font-bold">로그인이 필요합니다</h1>
        <p className="text-gray-600">
          인증 연동 테스트를 하려면 먼저 로그인해주세요.
        </p>
        <Link href="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <Link
          href="/"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← 홈으로 돌아가기
        </Link>
        <h1 className="text-4xl font-bold mb-2">
          Clerk + Supabase 인증 연동 테스트
        </h1>
        <p className="text-gray-600">
          Clerk 인증과 Supabase RLS 정책이 올바르게 작동하는지 테스트합니다.
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <LuTriangleAlert className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">에러</h3>
            <p className="text-sm text-red-700">{error}</p>
            <p className="text-xs text-red-600 mt-2">
              💡 <strong>해결 방법:</strong>
              <br />
              1. Supabase Dashboard에서 <code>profiles</code> 테이블이 생성되었는지 확인
              <br />
              2. /api/sync-user API가 정상 작동하는지 확인
              <br />
              3. Clerk와 Supabase 통합이 활성화되었는지 확인
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="text-red-600"
          >
            닫기
          </Button>
        </div>
      )}

      {/* 연결 상태 */}
      <div className="mb-8 p-6 border rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Supabase 연결 상태</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={connectionStatus === "testing"}
          >
            {connectionStatus === "testing" ? "테스트 중..." : "다시 테스트"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {connectionStatus === "idle" && (
            <>
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-600">대기 중</span>
            </>
          )}
          {connectionStatus === "testing" && (
            <>
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-600">연결 테스트 중...</span>
            </>
          )}
          {connectionStatus === "success" && (
            <>
              <LuCheck className="w-6 h-6 text-green-600" />
              <span className="text-green-600 font-semibold">연결 성공!</span>
            </>
          )}
          {connectionStatus === "error" && (
            <>
              <LuX className="w-6 h-6 text-red-600" />
              <span className="text-red-600 font-semibold">연결 실패</span>
            </>
          )}
        </div>
      </div>

      {/* Clerk 사용자 정보 */}
      <div className="mb-8 p-6 border rounded-lg bg-gray-50">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <LuShield className="w-6 h-6" />
          Clerk 사용자 정보
        </h2>
        <div className="space-y-2">
          <div className="flex gap-2">
            <span className="font-semibold min-w-[100px]">User ID:</span>
            <code className="bg-white px-2 py-1 rounded text-sm">
              {user.id}
            </code>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold min-w-[100px]">Email:</span>
            <span>{user.emailAddresses[0]?.emailAddress}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold min-w-[100px]">이름:</span>
            <span>
              {user.fullName ||
                [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                "이름 없음"}
            </span>
          </div>
        </div>
      </div>

      {/* Supabase Profile 데이터 */}
      <div className="border rounded-lg">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold mb-2">
            Supabase Profiles 테이블 데이터
          </h2>
          <p className="text-sm text-gray-600">
            Supabase의 profiles 테이블에 저장된 데이터입니다.
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-gray-500">로딩 중...</div>
          ) : profileData ? (
            <div className="space-y-4">
              <div className="p-4 bg-white border rounded-lg">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <span className="font-semibold min-w-[120px]">DB ID:</span>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {profileData.id}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold min-w-[120px]">
                      Clerk User ID:
                    </span>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {profileData.clerk_user_id}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold min-w-[120px]">
                      생성 시간:
                    </span>
                    <span className="text-sm">
                      {new Date(profileData.created_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold min-w-[120px]">
                      수정 시간:
                    </span>
                    <span className="text-sm">
                      {new Date(profileData.updated_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p>Profile 데이터가 없습니다.</p>
              <p className="text-xs mt-2">
                페이지를 새로고침하면 /api/sync-user가 자동으로 호출되어 profile이 생성됩니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 설명 */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold mb-2">💡 이 페이지의 작동 원리</h3>
        <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
          <li>Clerk로 인증된 사용자 정보를 가져옵니다</li>
          <li>
            Clerk의 JWT 토큰을 Supabase에 전달합니다 (2025 네이티브 통합 방식)
          </li>
          <li>
            SyncUserProvider가 로그인 시 자동으로 /api/sync-user를 호출하여 profiles 테이블에 레코드를 생성합니다
          </li>
          <li>각 사용자는 자신의 profile만 조회할 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
}
