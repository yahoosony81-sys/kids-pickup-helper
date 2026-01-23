'use client';

/**
 * Meta Pixel 컴포넌트
 * @description 메타 픽셀 스크립트를 로드하고 초기화하는 클라이언트 컴포넌트
 * 
 * 사용법:
 * 1. .env.local에 NEXT_PUBLIC_META_PIXEL_ID 환경변수 설정
 * 2. app/layout.tsx에 이 컴포넌트 추가
 * 
 * 보안:
 * - 사용자 이메일과 전화번호는 SHA-256으로 해싱되어 전송
 * - 평문 데이터는 절대 메타로 전송되지 않음
 */

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { initMetaPixel, trackPageView } from '@/lib/meta-pixel';
import Script from 'next/script';

export function MetaPixel() {
    const { user, isLoaded } = useUser();
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

    useEffect(() => {
        if (!pixelId || !isLoaded) return;

        // 사용자 정보가 있으면 고급 매칭과 함께 초기화
        if (user) {
            const email = user.primaryEmailAddress?.emailAddress;
            const phone = user.primaryPhoneNumber?.phoneNumber;

            initMetaPixel(pixelId, email, phone).catch((error) => {
                console.error('Meta Pixel 초기화 실패:', error);
            });
        } else {
            // 사용자 정보가 없으면 기본 초기화
            initMetaPixel(pixelId).catch((error) => {
                console.error('Meta Pixel 초기화 실패:', error);
            });
        }

        // PageView 이벤트 추적
        trackPageView();
    }, [isLoaded, user, pixelId]);

    // 픽셀 ID가 없으면 렌더링하지 않음
    if (!pixelId) {
        return null;
    }

    return (
        <>
            {/* Meta Pixel 베이스 코드 */}
            <Script
                id="meta-pixel"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
          `,
                }}
            />

            {/* noscript 폴백 */}
            <noscript>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    height="1"
                    width="1"
                    style={{ display: 'none' }}
                    src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
                    alt=""
                />
            </noscript>
        </>
    );
}
