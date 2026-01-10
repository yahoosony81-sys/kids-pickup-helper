/**
 * @file app/(routes)/trips/page.tsx
 * @description Trip 목록 페이지
 *
 * 주요 기능:
 * 1. 현재 제공자의 Trip 목록 조회
 * 2. 최신순 정렬
 * 3. 상태별 표시 (배지/색상)
 * 4. 빈 목록 처리
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getMyTrips Server Action 호출
 * - 카드 형태로 각 Trip 표시
 * - "새 Trip 생성" 버튼 제공
 *
 * @dependencies
 * - @/actions/trips: Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  // 픽업 제공 화면은 달력 기반으로 '생성만' 하는 곳
  // 생성된 제공 그룹은 모두 마이페이지 달력에서만 조회되도록 변경
  // 따라서 이 페이지에서는 카드 리스트를 제거하고 생성 버튼만 제공

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">픽업제공</h1>
        <p className="text-muted-foreground text-sm mt-1">
          새로운 픽업 그룹을 생성할 수 있습니다. 생성된 그룹은 마이페이지 달력에서 확인할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 text-center py-12">
          <p className="text-muted-foreground mb-4">
            픽업 제공 그룹을 생성하려면 아래 버튼을 클릭하세요.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            생성된 제공 그룹은 마이페이지의 달력에서 확인할 수 있습니다.
          </p>
          <Button asChild size="lg">
            <Link href="/trips/new">
              <Plus className="mr-2 h-4 w-4" />
              새 픽업 제공 생성하기
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

