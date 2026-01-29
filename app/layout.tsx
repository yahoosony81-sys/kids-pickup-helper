import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import { Geist, Geist_Mono } from "next/font/google";

import Navbar from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { SyncUserProvider } from "@/components/providers/sync-user-provider";
import { MetaPixel } from "@/components/meta-pixel";
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
  title: "우리아이 픽업이모",
  description: "같은 학교 학부모끼리 연결되어 아이 이동을 안전하게 돕는 서비스",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={{
        ...koKR,
        socialButtonsBlockButton: "로그인",
        socialButtonsBlockButton__kakao: "카카오톡으로 로그인",
        socialButtonsBlockButton__github: "깃허브로 로그인",
        socialButtonsBlockButton__google: "구글로 로그인",
      } as any}
      appearance={{
        layout: {
          socialButtonsVariant: 'blockButton',
          socialButtonsPlacement: 'top',
        },
        elements: {
          socialButtonsBlockButton: "h-11 w-full flex justify-center items-center gap-2 mb-2",
          socialButtonsBlockButtonText: "font-medium",
          socialButtonsProviderIcon: "w-5 h-5",
          // Kakao button styling
          socialButtonsBlockButton__kakao: {
            backgroundColor: '#FEE500',
            color: '#000000',
            border: 'none',
            '&:hover': {
              backgroundColor: '#FDD835'
            }
          }
        }
      }}
    >
      <html lang="ko">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
        >
          <MetaPixel />
          <SyncUserProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 pt-14 pb-20">
                {children}
              </main>
              <BottomNav />
            </div>
          </SyncUserProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
