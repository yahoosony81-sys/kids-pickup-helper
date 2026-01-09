/**
 * @file components/pickup-messages/mark-read-on-mount.tsx
 * @description 메시지 스레드 페이지 로드 시 읽음 처리하는 Client Component
 *
 * 주요 기능:
 * - 페이지 마운트 시 markThreadAsRead를 호출하여 읽음 처리
 * - Server Component 렌더링 중 revalidatePath 호출 문제를 방지하기 위해 Client Component로 분리
 *
 * @dependencies
 * - @/actions/pickup-messages: markThreadAsRead Server Action
 */

"use client";

import { useEffect } from "react";
import { markThreadAsRead } from "@/actions/pickup-messages";

interface MarkReadOnMountProps {
  inviteId: string;
}

export function MarkReadOnMount({ inviteId }: MarkReadOnMountProps) {
  useEffect(() => {
    markThreadAsRead(inviteId);
  }, [inviteId]);

  return null;
}


