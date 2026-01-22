/**
 * @file app/(routes)/my/page.tsx
 * @description 마이페이지
 *
 * 주요 기능:
 * 1. 진행중 픽업 요청 목록 (탭 1)
 * 2. 진행중 픽업 제공 목록 (탭 2)
 * 3. 달력 기반 이력 조회
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - 탭 구조로 진행중 항목 관리
 * - 각 탭에서 진행중 상태만 필터링하여 표시
 * - 달력에서 날짜 클릭 시 상세 리스트 표시
 *
 * @dependencies
 * - @/actions/pickup-requests: getMyPickupRequests Server Action
 * - @/actions/invitations: getMyInvitations Server Action
 * - @/components/ui/tabs: 탭 컴포넌트
 * - @/components/my/calendar-view: 달력 뷰 컴포넌트
 */

import { getMyPickupRequests } from "@/actions/pickup-requests";
import { getMyInvitations } from "@/actions/invitations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from "@/components/my/calendar-view";

export const dynamic = "force-dynamic";

interface MyPageProps {
  searchParams: Promise<{
    month?: string;
    date?: string;
    tab?: string;
  }>;
}

export default async function MyPage({ searchParams }: MyPageProps) {
  const params = await searchParams;
  const { month, date, tab } = params;
  // 진행중 픽업 요청 조회 (REQUESTED, MATCHED, IN_PROGRESS만, EXPIRED 제외)
  const requestsResult = await getMyPickupRequests();
  const ongoingRequests = requestsResult.success
    ? (requestsResult.data || []).filter(
      (req: any) =>
        !["ARRIVED", "COMPLETED", "CANCELLED", "EXPIRED"].includes(req.status)
    )
    : [];

  // 진행중 초대 조회 (내가 보낸 초대 목록, EXPIRED trip 제외)
  const invitationsResult = await getMyInvitations();
  const ongoingInvitations = invitationsResult.success
    ? (invitationsResult.data || []).filter(
      (inv: any) => {
        // trip이 EXPIRED 상태인 경우 제외
        const trip = inv.trip;
        return !trip || trip.status !== "EXPIRED";
      }
    )
    : [];

  // 쿼리 파라미터에서 초기값 파싱
  let initialMonth: Date | undefined;
  let initialSelectedDate: Date | null | undefined;

  if (month) {
    try {
      const [year, monthNum] = month.split("-").map(Number);
      if (year && monthNum) {
        initialMonth = new Date(year, monthNum - 1, 1);
      }
    } catch {
      console.error("Invalid month parameter:", month);
    }
  }

  if (date) {
    try {
      const [year, monthNum, day] = date.split("-").map(Number);
      if (year && monthNum && day) {
        initialSelectedDate = new Date(year, monthNum - 1, day);
      }
    } catch {
      console.error("Invalid date parameter:", date);
    }
  }

  // 기본 탭 설정 (쿼리 파라미터 또는 기본값)
  const defaultTab = tab === "trips" ? "trips" : "requests";

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">마이페이지</h1>
        <p className="text-muted-foreground text-sm mt-1">
          내 픽업 요청과 제공을 관리할 수 있습니다. 달력에서 날짜를 클릭하면 해당 날짜의 상세 내역을 확인할 수 있습니다.
        </p>
      </div>

      {/* 탭 구조 */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests">
            내가 신청한 픽업 요청 ({ongoingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="trips">
            내가 제공중인 픽업 ({ongoingInvitations.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-6">
          <CalendarView
            mode="requests"
            initialMonth={initialMonth}
            initialSelectedDate={initialSelectedDate}
          />
        </TabsContent>
        <TabsContent value="trips" className="mt-6">
          <CalendarView
            mode="provides"
            initialMonth={initialMonth}
            initialSelectedDate={initialSelectedDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

