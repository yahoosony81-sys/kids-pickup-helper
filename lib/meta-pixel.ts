/**
 * Meta Pixel 유틸리티
 * @description 메타 픽셀 초기화 및 이벤트 추적을 위한 유틸리티 함수
 * 
 * 주요 기능:
 * - SHA-256 해싱을 통한 안전한 사용자 데이터 처리
 * - 수동 고급 매칭(Manual Advanced Matching) 지원
 * - 이벤트 추적 (CompleteRegistration, PageView 등)
 */

/**
 * SHA-256 해싱 함수
 * @param text - 해싱할 원본 텍스트
 * @returns 소문자 16진수 형식의 해시값
 */
async function sha256Hash(text: string): Promise<string> {
    // 빈 문자열이나 null 체크
    if (!text || text.trim() === '') {
        return '';
    }

    // 텍스트를 소문자로 변환하고 공백 제거 (메타 권장사항)
    const normalized = text.toLowerCase().trim();

    // TextEncoder를 사용하여 문자열을 Uint8Array로 변환
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);

    // SubtleCrypto API를 사용하여 SHA-256 해싱
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // ArrayBuffer를 16진수 문자열로 변환
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

/**
 * 이메일 해싱
 * @param email - 사용자 이메일
 * @returns SHA-256 해시값
 */
export async function hashEmail(email: string): Promise<string> {
    return sha256Hash(email);
}

/**
 * 전화번호 해싱
 * @param phone - 사용자 전화번호 (국가 코드 포함 권장, 예: +821012345678)
 * @returns SHA-256 해시값
 */
export async function hashPhone(phone: string): Promise<string> {
    // 전화번호에서 특수문자 제거 (하이픈, 공백 등)
    const cleanedPhone = phone.replace(/[^0-9+]/g, '');
    return sha256Hash(cleanedPhone);
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
 * 메타 픽셀 초기화 (고급 매칭 포함)
 * @param pixelId - 메타 픽셀 ID
 * @param email - 사용자 이메일 (선택)
 * @param phone - 사용자 전화번호 (선택)
 */
export async function initMetaPixel(
    pixelId: string,
    email?: string,
    phone?: string
): Promise<void> {
    if (typeof window === 'undefined') {
        return; // 서버 사이드에서는 실행하지 않음
    }

    // 고급 매칭 데이터 준비
    const advancedMatchingData: Record<string, string> = {};

    if (email) {
        advancedMatchingData.em = await hashEmail(email);
    }

    if (phone) {
        advancedMatchingData.ph = await hashPhone(phone);
    }

    // 메타 픽셀 초기화
    if (window.fbq) {
        window.fbq('init', pixelId, advancedMatchingData);
    }
}

/**
 * PageView 이벤트 추적
 */
export function trackPageView(): void {
    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'PageView', {});
    }
}

/**
 * CompleteRegistration 이벤트 추적
 * @param email - 사용자 이메일
 * @param phone - 사용자 전화번호 (선택)
 * @param additionalData - 추가 이벤트 데이터
 */
export async function trackCompleteRegistration(
    email: string,
    phone?: string,
    additionalData?: Record<string, any>
): Promise<void> {
    if (typeof window === 'undefined' || !window.fbq) {
        return;
    }

    // 해싱된 사용자 데이터
    const userData: Record<string, string> = {
        em: await hashEmail(email),
    };

    if (phone) {
        userData.ph = await hashPhone(phone);
    }

    // 이벤트 데이터 병합
    const eventData = {
        ...userData,
        ...additionalData,
    };

    window.fbq('track', 'CompleteRegistration', eventData);
}

/**
 * 커스텀 이벤트 추적
 * @param eventName - 커스텀 이벤트 이름
 * @param eventData - 이벤트 데이터
 */
export function trackCustomEvent(
    eventName: string,
    eventData?: Record<string, any>
): void {
    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('trackCustom', eventName, eventData || {});
    }
}

/**
 * Lead 이벤트 추적 (사전 신청 완료)
 * @param email - 사용자 이메일 (필수)
 * @param phone - 사용자 전화번호 (선택)
 * @param additionalData - 추가 이벤트 데이터
 * 
 * @example
 * // 이메일만 있는 경우
 * await trackLead('user@example.com');
 * 
 * // 이메일과 전화번호 모두 있는 경우
 * await trackLead('user@example.com', '010-1234-5678');
 * 
 * // 추가 데이터와 함께 전송
 * await trackLead('user@example.com', '010-1234-5678', { source: 'landing_page' });
 */
export async function trackLead(
    email: string,
    phone?: string,
    additionalData?: Record<string, any>
): Promise<void> {
    if (typeof window === 'undefined' || !window.fbq) {
        return;
    }

    try {
        // 이메일 검증 및 해싱 (필수)
        if (!email || email.trim() === '') {
            console.warn('Lead 이벤트: 이메일이 제공되지 않았습니다.');
            // 이메일 없이도 이벤트는 전송 (매칭 데이터 없이)
            window.fbq('track', 'Lead', additionalData || {});
            return;
        }

        // 해싱된 사용자 데이터 준비
        const userData: Record<string, string> = {
            em: await hashEmail(email),
        };

        // 전화번호가 제공된 경우에만 해싱 후 추가
        if (phone && phone.trim() !== '') {
            userData.ph = await hashPhone(phone);
        }

        // 이벤트 데이터 병합
        const eventData = {
            ...userData,
            ...additionalData,
        };

        // Lead 이벤트 전송
        window.fbq('track', 'Lead', eventData);

        // 로그 출력 (개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
            console.log('Lead 이벤트 전송 완료:', {
                hasEmail: !!userData.em,
                hasPhone: !!userData.ph,
                additionalData,
            });
        }
    } catch (error) {
        console.error('Lead 이벤트 전송 실패:', error);
        // 에러가 발생해도 기본 Lead 이벤트는 전송
        window.fbq('track', 'Lead', additionalData || {});
    }
}
