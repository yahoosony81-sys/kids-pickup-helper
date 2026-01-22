/**
 * Meta Pixel 유틸리티 (비활성화됨)
 * @description 메타 픽셀 기능이 비활성화되어 있습니다. 모든 함수는 빈 함수로 작동합니다.
 */

/**
 * 이메일 해싱 (비활성화)
 * @param email - 사용자 이메일
 * @returns 빈 문자열
 */
export async function hashEmail(email: string): Promise<string> {
    // 비활성화됨
    return '';
}

/**
 * 전화번호 해싱 (비활성화)
 * @param phone - 사용자 전화번호
 * @returns 빈 문자열
 */
export async function hashPhone(phone: string): Promise<string> {
    // 비활성화됨
    return '';
}

/**
 * 메타 픽셀 타입 정의
 */
declare global {
    interface Window {
        fbq: (
            action: 'init' | 'track' | 'trackCustom',
            pixelId: string,
            data?: Record<string, any>
        ) => void;
        _fbq: typeof window.fbq;
    }
}

/**
 * 메타 픽셀 초기화 (비활성화)
 * @param pixelId - 메타 픽셀 ID
 * @param email - 사용자 이메일 (선택)
 * @param phone - 사용자 전화번호 (선택)
 */
export async function initMetaPixel(
    pixelId: string,
    email?: string,
    phone?: string
): Promise<void> {
    // 비활성화됨
}

/**
 * PageView 이벤트 추적 (비활성화)
 */
export function trackPageView(): void {
    // 비활성화됨
}

/**
 * CompleteRegistration 이벤트 추적 (비활성화)
 * @param email - 사용자 이메일
 * @param phone - 사용자 전화번호 (선택)
 * @param additionalData - 추가 이벤트 데이터
 */
export async function trackCompleteRegistration(
    email: string,
    phone?: string,
    additionalData?: Record<string, any>
): Promise<void> {
    // 비활성화됨
}

/**
 * 커스텀 이벤트 추적 (비활성화)
 * @param eventName - 커스텀 이벤트 이름
 * @param eventData - 이벤트 데이터
 */
export function trackCustomEvent(
    eventName: string,
    eventData?: Record<string, any>
): void {
    // 비활성화됨
}

/**
 * Lead 이벤트 추적 (비활성화)
 * @param email - 사용자 이메일 (필수)
 * @param phone - 사용자 전화번호 (선택)
 * @param additionalData - 추가 이벤트 데이터
 */
export async function trackLead(
    email: string,
    phone?: string,
    additionalData?: Record<string, any>
): Promise<void> {
    // 비활성화됨
}
