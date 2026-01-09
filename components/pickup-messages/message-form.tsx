/**
 * @file components/pickup-messages/message-form.tsx
 * @description 메시지 작성 폼 컴포넌트
 *
 * 주요 기능:
 * 1. 메시지 본문 입력
 * 2. 메시지 전송
 * 3. 전송 후 입력창 비우기 및 페이지 새로고침
 *
 * @dependencies
 * - @/actions/pickup-messages: sendMessageToInvite Server Action
 * - @/components/ui/textarea: 텍스트 영역 컴포넌트
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useState } from "react";
import { sendMessageToInvite } from "@/actions/pickup-messages";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface MessageFormProps {
  inviteId: string;
  tripId: string;
}

export function MessageForm({ inviteId, tripId }: MessageFormProps) {
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!body.trim()) {
      setError("메시지를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await sendMessageToInvite({
        inviteId,
        body: body.trim(),
      });

      if (!result.success) {
        setError(result.error || "메시지 전송에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 성공 시 입력창 비우고 페이지 새로고침
      setBody("");
      router.refresh();
      // 로딩 상태 해제 (router.refresh()는 비동기이지만 완료를 기다릴 필요 없음)
      setIsLoading(false);
    } catch (err) {
      console.error("메시지 전송 에러:", err);
      setError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="메시지를 입력하세요..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[100px] resize-none"
          disabled={isLoading}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !body.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              전송 중...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              전송
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

