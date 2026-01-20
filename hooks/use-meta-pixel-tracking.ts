'use client';

/**
 * Meta Pixel 추적 훅
 * @description 메타 픽셀 이벤트 추적을 위한 React 훅
 * 
 * 사용 예시:
 * ```tsx
 * const { trackRegistration, trackLead } = useMetaPixelTracking();
 * 
 * // 회원가입 완료 시
 * await trackRegistration(email, phone);
 * 
 * // 사전 신청 완료 시 (전화번호 선택)
 * await trackLead(email, phone);
 * ```
 */

import { useCallback } from 'react';
import { trackCompleteRegistration, trackCustomEvent, trackLead as trackLeadEvent } from '@/lib/meta-pixel';

export function useMetaPixelTracking() {
    /**
     * 회원가입 완료 이벤트 추적
     * @param email - 사용자 이메일
     * @param phone - 사용자 전화번호 (선택)
     * @param additionalData - 추가 이벤트 데이터
     */
    const trackRegistration = useCallback(
        async (
            email: string,
            phone?: string,
            additionalData?: Record<string, any>
        ) => {
            try {
                await trackCompleteRegistration(email, phone, additionalData);
                console.log('CompleteRegistration 이벤트 전송 완료');
            } catch (error) {
                console.error('CompleteRegistration 이벤트 전송 실패:', error);
            }
        },
        []
    );

    /**
     * Lead 이벤트 추적 (사전 신청 완료)
     * @param email - 사용자 이메일 (필수)
     * @param phone - 사용자 전화번호 (선택)
     * @param additionalData - 추가 이벤트 데이터
     */
    const trackLead = useCallback(
        async (
            email: string,
            phone?: string,
            additionalData?: Record<string, any>
        ) => {
            try {
                await trackLeadEvent(email, phone, additionalData);
                console.log('Lead 이벤트 전송 완료');
            } catch (error) {
                console.error('Lead 이벤트 전송 실패:', error);
            }
        },
        []
    );

    /**
     * 커스텀 이벤트 추적
     * @param eventName - 이벤트 이름
     * @param eventData - 이벤트 데이터
     */
    const trackCustom = useCallback(
        (eventName: string, eventData?: Record<string, any>) => {
            try {
                trackCustomEvent(eventName, eventData);
                console.log(`커스텀 이벤트 전송 완료: ${eventName}`);
            } catch (error) {
                console.error(`커스텀 이벤트 전송 실패: ${eventName}`, error);
            }
        },
        []
    );

    return {
        trackRegistration,
        trackLead,
        trackCustom,
    };
}
