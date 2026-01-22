/**
 * @file app/(routes)/trips/[tripId]/messages/[inviteId]/page.tsx
 * @description 메시지 스레드 페이지
 *
 * 주요 기능:
 * 1. 특정 invitation(inviteId)의 메시지 목록 조회 및 표시
 * 2. 메시지 전송
 * 3. 상대방 정보 및 픽업 요청 정보 표시
 *
 * 핵심 구현 로직:
 * - Server Component로 구현
 * - getMessagesByInvite로 메시지 목록 조회
 * - sendMessageToInvite로 메시지 전송
 * - sender_role에 따라 메시지 좌/우 정렬
 *
 * @dependencies
 * - @/actions/pickup-messages: getMessagesByInvite, sendMessageToInvite Server Actions
 * - @/actions/invitations: getInvitationById Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 * - @/components/ui/textarea: 텍스트 영역 컴포넌트
 */

import { getMessagesByInvite } from "@/actions/pickup-messages";
import { getInvitationById } from "@/actions/invitations";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageForm } from "@/components/pickup-messages/message-form";
import { MessageList } from "@/components/pickup-messages/message-list";
import { MarkReadOnMount } from "@/components/pickup-messages/mark-read-on-mount";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, User } from "lucide-react";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface MessageThreadPageProps {
  params: Promise<{ tripId: string; inviteId: string }>;
}

export default async function MessageThreadPage({
  params,
}: MessageThreadPageProps) {
  const { tripId, inviteId } = await params;

  // 1. 인증 확인
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  // 2. Invitation 조회
  const invitationResult = await getInvitationById(inviteId);
  if (!invitationResult.success || !invitationResult.data) {
    notFound();
  }

  const invitation = invitationResult.data;
  const pickupRequest = invitation.pickup_request as any;

  // 3. 현재 사용자 Profile ID 조회
  const supabase = createClerkSupabaseClient();
  const { data: currentProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (profileError || !currentProfile) {
    notFound();
  }

  // 4. 현재 사용자가 provider인지 requester인지 확인
  const isProvider = invitation.provider_profile_id === currentProfile.id;
  const otherProfileId = isProvider
    ? invitation.requester_profile_id
    : invitation.provider_profile_id;

  // 5. 상대방 Profile 정보 조회
  const { data: otherProfile, error: otherProfileError } = await supabase
    .from("profiles")
    .select("clerk_user_id")
    .eq("id", otherProfileId)
    .single();

  if (otherProfileError || !otherProfile) {
    notFound();
  }

  // 6. 상대방 Clerk 사용자 정보 조회
  let otherUserName = "사용자";
  try {
    const client = await clerkClient();
    const otherUser = await client.users.getUser(otherProfile.clerk_user_id);
    otherUserName =
      otherUser.fullName ||
      [otherUser.firstName, otherUser.lastName].filter(Boolean).join(" ") ||
      "사용자";
  } catch (error) {
    console.error("❌ 상대방 Clerk 사용자 조회 실패:", error);
  }

  // 7. 메시지 목록 조회
  const messagesResult = await getMessagesByInvite(inviteId);
  const messages = messagesResult.success ? messagesResult.data || [] : [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 메시지 스레드 읽음 처리 (Client Component에서 처리) */}
      <MarkReadOnMount inviteId={inviteId} />
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href={`/trips/${tripId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            상세보기로 돌아가기
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* 상대방 정보 및 픽업 요청 요약 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {otherUserName}님과의 메시지
            </CardTitle>
            <CardDescription>
              매칭 완료된 픽업 요청에 대한 메시지입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pickupRequest && (
              <>
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground">픽업 시간:</span>
                    <span className="font-medium ml-2">
                      {formatDateTime(pickupRequest.pickup_time)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div>
                      <span className="text-muted-foreground">출발지:</span>
                      <span className="font-medium ml-2">
                        {pickupRequest.origin_text}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-muted-foreground">목적지:</span>
                      <span className="font-medium ml-2">
                        {pickupRequest.destination_text}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 메시지 목록 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>메시지</CardTitle>
          </CardHeader>
          <CardContent>
            <MessageList
              messages={messages}
              currentProfileId={currentProfile.id}
            />
          </CardContent>
        </Card>

        {/* 메시지 입력 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>메시지 작성</CardTitle>
          </CardHeader>
          <CardContent>
            <MessageForm inviteId={inviteId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

