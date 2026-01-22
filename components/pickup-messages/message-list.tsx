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

import { formatDateTime } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  sender_role: "PROVIDER" | "REQUESTER";
  body: string;
  created_at: string;
}

interface MessageListProps {
  messages: Message[];
  currentProfileId: string;
  providerProfileId: string;
}

export function MessageList({
  messages,
  currentProfileId,
  providerProfileId,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>아직 메시지가 없습니다.</p>
        <p className="text-sm mt-2">첫 메시지를 남겨보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isCurrentUser = message.sender_id === currentProfileId;

        // PROVIDER는 왼쪽, REQUESTER는 오른쪽 정렬
        // 또는 현재 사용자 메시지는 오른쪽, 상대방 메시지는 왼쪽
        const alignClass = isCurrentUser ? "ml-auto" : "mr-auto";
        const bgClass = isCurrentUser
          ? "bg-blue-500 text-white"
          : "bg-muted text-foreground";

        return (
          <div
            key={message.id}
            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${bgClass}`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.body}
              </p>
              <p
                className={`text-xs mt-1 ${isCurrentUser ? "text-blue-100" : "text-muted-foreground"
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

