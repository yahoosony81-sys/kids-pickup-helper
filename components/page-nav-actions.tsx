/**
 * @file components/page-nav-actions.tsx
 * @description 상세/서브 페이지용 공통 네비게이션 헤더 컴포넌트
 *
 * 주요 기능:
 * 1. 좌측: 뒤로가기 버튼 (브라우저 히스토리 기반, fallback 지원)
 * 2. 우측: 마이페이지 이동 버튼
 *
 * 핵심 구현 로직:
 * - Client Component로 구현 (router 사용을 위해)
 * - useRouter의 back() 메서드로 브라우저 히스토리 기반 뒤로가기
 * - 히스토리가 없을 경우 fallbackHref로 이동
 * - 두 버튼을 같은 줄에 좌우 배치
 *
 * @dependencies
 * - next/navigation: useRouter
 * - @/components/ui/button: Button 컴포넌트
 * - lucide-react: ArrowLeft, User 아이콘
 */

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";

interface PageNavActionsProps {
  /**
   * 뒤로가기 히스토리가 없을 때 이동할 경로
   * @default "/trips"
   */
  fallbackHref?: string;
  /**
   * 뒤로가기 버튼 표시 여부
   * @default true
   */
  showBack?: boolean;
  /**
   * 마이페이지 버튼 표시 여부
   * @default true
   */
  showMyPage?: boolean;
}

export function PageNavActions({
  fallbackHref = "/trips",
  showBack = true,
  showMyPage = true,
}: PageNavActionsProps) {
  const router = useRouter();

  const handleBack = () => {
    // 브라우저 히스토리가 있는지 확인
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // 히스토리가 없으면 fallback 경로로 이동
      router.push(fallbackHref);
    }
  };

  const handleMyPage = () => {
    router.push("/my");
  };

  return (
    <div className="mb-6 flex justify-between items-center">
      {showBack && (
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로가기
        </Button>
      )}
      {showMyPage && (
        <Button variant="outline" onClick={handleMyPage}>
          <User className="mr-2 h-4 w-4" />
          마이페이지 이동
        </Button>
      )}
    </div>
  );
}

