/**
 * @file app/layout.tsx
 * @description 루트 레이아웃 컴포넌트
 *
 * 이 파일은 Next.js App Router의 루트 레이아웃으로, 모든 페이지에 공통으로 적용됩니다.
 *
 * 주요 기능:
 * 1. Clerk 인증 프로바이더 설정 (한국어 로컬라이제이션 포함)
 * 2. Supabase 사용자 동기화 프로바이더 설정
 * 3. 전역 스타일 및 폰트 설정
 *
 * @see {@link https://clerk.com/docs/guides/customizing-clerk/localization} - Clerk 로컬라이제이션 가이드
 */

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import { Geist, Geist_Mono } from "next/font/google";

import Navbar from "@/components/Navbar";
import { SyncUserProvider } from "@/components/providers/sync-user-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaaS 템플릿",
  description: "Next.js + Clerk + Supabase 보일러플레이트",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 한국어 로컬라이제이션 적용
  // koKR을 ClerkProvider에 전달하면 모든 Clerk 컴포넌트
  // (SignIn, SignUp, UserButton, UserProfile 등)의 텍스트가
  // 자동으로 한국어로 표시됩니다.
  //
  // 추가 커스터마이징이 필요한 경우:
  // const customKoKR = {
  //   ...koKR,
  //   unstable__errors: {
  //     ...koKR.unstable__errors,
  //     not_allowed_access: '커스텀 에러 메시지',
  //   },
  // };
  // 위와 같이 koKR을 확장하여 사용할 수 있습니다.

  return (
    <ClerkProvider localization={koKR}>
      <html lang="ko">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <SyncUserProvider>
            <Navbar />
            {children}
          </SyncUserProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
