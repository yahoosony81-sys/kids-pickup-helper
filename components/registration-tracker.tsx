'use client';

/**
 * 회원가입 완료 추적 컴포넌트
 * @description Clerk 회원가입 완료 시 메타 픽셀 CompleteRegistration 이벤트를 자동으로 전송
 * 
 * 사용법:
 * - SyncUserProvider 내부에서 자동으로 동작
 * - 신규 사용자가 처음 로그인할 때 이벤트 전송
 */

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMetaPixelTracking } from '@/hooks/use-meta-pixel-tracking';

export function RegistrationTracker() {
    const { user, isLoaded } = useUser();
    const { trackRegistration } = useMetaPixelTracking();
    const hasTracked = useRef(false);

    useEffect(() => {
        // 이미 추적했거나 로딩 중이면 스킵
        if (hasTracked.current || !isLoaded || !user) {
            return;
        }

        // 사용자가 방금 가입했는지 확인 (생성 시간이 5분 이내)
        const createdAt = new Date(user.createdAt);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

        // 5분 이내에 생성된 계정이면 신규 가입으로 간주
        if (diffMinutes <= 5) {
            const email = user.primaryEmailAddress?.emailAddress;
            const phone = user.primaryPhoneNumber?.phoneNumber;

            if (email) {
                trackRegistration(email, phone, {
                    content_name: 'User Registration',
                    status: 'completed',
                });
                hasTracked.current = true;
            }
        }
    }, [isLoaded, user, trackRegistration]);

    return null; // UI를 렌더링하지 않음
}
