/**
 * @file components/pickup-messages/message-list.tsx
 * @description 메시지 목록 컴포넌트
 *
 * 주요 기능:
 * 1. 메시지 목록 표시
 * 2. sender_role에 따라 좌/우 정렬
 * 3. 빈 상태 메시지 표시
 *
 * @dependencies
 * - @/components/ui/card: 카드 컴포넌트
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import {
  useRealtimeSubscription,
  subscribeToMessages,
  MessagePayload
} from "@/lib/realtime";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface Message {
  id: string;
  sender_id: string;
  sender_role: "PROVIDER" | "REQUESTER";
  body: string;
  created_at: string;
}

interface MessageListProps {
  initialMessages: Message[];
  currentProfileId: string;
  roomId: string; // inviteId used as roomId
}

export function MessageList({
  initialMessages,
  currentProfileId,
  roomId,
}: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 스크롤을 항상 아래로 유지
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 디버깅용: 내 아이디와 메시지 발신자 아이디 비교 로그
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      console.log(`🔍 [디버깅] 내 Profile ID: ${currentProfileId}`);
      console.log(`🔍 [디버깅] 마지막 메시지 Sender ID: ${lastMsg.sender_id}`);
      console.log(`🔍 [디버깅] 일치 여부(내가 보낸 것인가?): ${lastMsg.sender_id === currentProfileId}`);
    }
  }, [messages, currentProfileId]);

  const supabase = useClerkSupabaseClient();

  // Realtime 구독 (PRD Rule: 채팅 메시지 실시간 수신)
  useRealtimeSubscription<MessagePayload>(
    useCallback(
      (handler, client) => subscribeToMessages(roomId, handler, client),
      [roomId]
    ),
    {
      client: supabase,
      onInsert: (payload) => {
        const newMessage = payload.new as MessagePayload;
        const formattedMessage: Message = {
          id: newMessage.id,
          sender_id: newMessage.sender_id,
          sender_role: newMessage.sender_role as "PROVIDER" | "REQUESTER",
          body: newMessage.body,
          created_at: newMessage.created_at,
        };
        setMessages((prev) => [...prev, formattedMessage]);
      }
    }
  );

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>아직 메시지가 없습니다.</p>
        <p className="text-sm mt-2">첫 메시지를 남겨보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2" ref={scrollRef}>
      {messages.map((message) => {
        const isCurrentUser = message.sender_id === currentProfileId;

        // PROVIDER는 왼쪽, REQUESTER는 오른쪽 정렬
        // 또는 현재 사용자 메시지는 오른쪽, 상대방 메시지는 왼쪽
        const bgClass = isCurrentUser
          ? "bg-blue-500 text-white"
          : "bg-muted text-foreground";

        return (
          <div
            key={message.id}
            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 shadow-sm ${isCurrentUser
                ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none"
                : "bg-muted text-foreground rounded-2xl rounded-tl-none"
                }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.body}
              </p>
              <p
                className={`text-[10px] mt-1 text-right ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
              >
                {formatDateTime(message.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}


