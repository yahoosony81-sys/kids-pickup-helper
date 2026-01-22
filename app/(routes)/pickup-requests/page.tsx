/**
 * @file app/(routes)/pickup-requests/page.tsx
 * @description 픽업 요청 생성 페이지
 *
 * 주요 기능:
 * 1. 새 픽업 요청 등록 페이지로 리다이렉트
 * 2. 또는 생성 폼 직접 표시
 *
 * 핵심 구현 로직:
 * - 이 페이지는 "생성 전용" 페이지로 변경됨
 * - 목록은 마이페이지에서 확인
 * - 새 요청 등록 버튼만 표시하거나 생성 페이지로 리다이렉트
 *
 * @dependencies
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PickupRequestsPage() {
  // 생성 페이지로 리다이렉트
  redirect("/pickup-requests/new");
}

