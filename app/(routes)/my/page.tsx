/**
 * @file app/(routes)/my/page.tsx
 * @description 마이페이지
 *
 * 주요 기능:
 * 1. 진행중 픽업 요청 목록 (탭 1)
 * 2. 진행중 픽업 제공 목록 (탭 2)
 * 3. 지난 픽업 요청/제공 버튼
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - 탭 구조로 진행중 항목 관리
 * - 각 탭에서 진행중 상태만 필터링하여 표시
 *
 * @dependencies
 * - @/actions/pickup-requests: getMyPickupRequests Server Action
 * - @/actions/invitations: getMyInvitations Server Action
 * - @/components/ui/tabs: 탭 컴포넌트
 */

import { getMyPickupRequests } from "@/actions/pickup-requests";
import { getMyInvitations } from "@/actions/invitations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { History } from "lucide-react";
import { OngoingRequestsTab } from "@/components/my/ongoing-requests-tab";
import { OngoingInvitationsTab } from "@/components/my/ongoing-invitations-tab";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  // 진행중 픽업 요청 조회 (REQUESTED, MATCHED, IN_PROGRESS만)
  const requestsResult = await getMyPickupRequests();
  const ongoingRequests = requestsResult.success
    ? (requestsResult.data || []).filter(
        (req: any) =>
          !["ARRIVED", "COMPLETED", "CANCELLED"].includes(req.status)
      )
    : [];

  // 진행중 초대 조회 (내가 보낸 초대 목록)
  const invitationsResult = await getMyInvitations();
  const ongoingInvitations = invitationsResult.success
    ? invitationsResult.data || []
    : [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">마이페이지</h1>
        <p className="text-muted-foreground text-sm mt-1">
          내 픽업 요청과 제공을 관리할 수 있습니다.
        </p>
      </div>

      {/* 지난 기록 버튼 */}
      <div className="mb-6 flex gap-2">
        <Button asChild variant="outline">
          <Link href="/my/past-requests">
            <History className="mr-2 h-4 w-4" />
            지난 픽업 요청
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/my/past-trips">
            <History className="mr-2 h-4 w-4" />
            지난 픽업 제공
          </Link>
        </Button>
      </div>

      {/* 탭 구조 */}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests">
            내가 신청한 픽업 요청 ({ongoingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="trips">
            내가 제공한 픽업 ({ongoingInvitations.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-6">
          <OngoingRequestsTab requests={ongoingRequests} />
        </TabsContent>
        <TabsContent value="trips" className="mt-6">
          <OngoingInvitationsTab invitations={ongoingInvitations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

